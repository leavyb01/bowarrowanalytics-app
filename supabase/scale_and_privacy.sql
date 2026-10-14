-- Scale + privacy hardening. Run once in the Supabase SQL editor (safe to re-run).
-- Requires multi_tenant.sql and team.sql to have been run first.

-- 1. Faster "last 3 months" board loading
create index if not exists standard_work_tasks_org_end_idx
  on public.standard_work_tasks (org_id, end_at);

-- 2. Optional link between a sign-in account and a team member.
--    Daily Operations users are matched to their own work by this link, or by
--    their sign-in name / email prefix matching the task's assigned person.
alter table public.team_members
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- 3. Daily Operations only ever sees and edits their own standard work
create or replace function public.is_operations_only(target text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not public.is_platform_admin() and exists (
    select 1 from public.organisation_memberships m
    where m.org_id::text = target and m.user_id = auth.uid() and m.status = 'active'
      and m.role in ('operations', 'cleaner')
  );
$$;

create or replace function public.is_own_task_person(person_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select person_name is not null and lower(trim(person_name)) in (
    select lower(trim(n)) from unnest(array[
      auth.jwt() -> 'user_metadata' ->> 'full_name',
      auth.jwt() -> 'user_metadata' ->> 'name',
      split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1)
    ]) as n
    where n is not null and trim(n) <> ''
    union
    select lower(trim(tm.name)) from public.team_members tm where tm.user_id = auth.uid()
  );
$$;

drop policy if exists "tasks_select" on public.standard_work_tasks;
drop policy if exists "tasks_insert" on public.standard_work_tasks;
drop policy if exists "tasks_update" on public.standard_work_tasks;
drop policy if exists "tasks_delete" on public.standard_work_tasks;

create policy "tasks_select" on public.standard_work_tasks
for select to authenticated using (
  public.is_org_member(org_id::text)
  and (not public.is_operations_only(org_id::text) or public.is_own_task_person(person))
);
create policy "tasks_insert" on public.standard_work_tasks
for insert to authenticated with check (
  public.can_write_org(org_id::text)
  and (not public.is_operations_only(org_id::text) or public.is_own_task_person(person))
);
create policy "tasks_update" on public.standard_work_tasks
for update to authenticated
using (
  public.can_write_org(org_id::text)
  and (not public.is_operations_only(org_id::text) or public.is_own_task_person(person))
)
with check (
  public.can_write_org(org_id::text)
  and (not public.is_operations_only(org_id::text) or public.is_own_task_person(person))
);
create policy "tasks_delete" on public.standard_work_tasks
for delete to authenticated using (
  public.can_write_org(org_id::text)
  and (not public.is_operations_only(org_id::text) or public.is_own_task_person(person))
);

-- 4. Realtime deletes: postgres_changes cannot filter DELETE events, so every
--    client would receive every organisation's deleted ids. Instead, broadcast
--    deletes on a private per-organisation channel that only members may join.
create or replace function public.broadcast_org_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform realtime.send(
    jsonb_build_object('table', TG_TABLE_NAME, 'id', OLD.id),
    'delete',
    'org-deletes:' || OLD.org_id::text,
    true
  );
  return OLD;
end;
$$;

drop trigger if exists broadcast_delete on public.standard_work_tasks;
create trigger broadcast_delete after delete on public.standard_work_tasks
  for each row execute function public.broadcast_org_delete();
drop trigger if exists broadcast_delete on public.standard_work_resources;
create trigger broadcast_delete after delete on public.standard_work_resources
  for each row execute function public.broadcast_org_delete();
drop trigger if exists broadcast_delete on public.team_members;
create trigger broadcast_delete after delete on public.team_members
  for each row execute function public.broadcast_org_delete();
drop trigger if exists broadcast_delete on public.team_absences;
create trigger broadcast_delete after delete on public.team_absences
  for each row execute function public.broadcast_org_delete();

drop policy if exists "org_delete_broadcast_read" on realtime.messages;
create policy "org_delete_broadcast_read" on realtime.messages
for select to authenticated using (
  realtime.messages.extension = 'broadcast'
  and realtime.topic() like 'org-deletes:%'
  and public.is_org_member(substring(realtime.topic() from 13))
);
