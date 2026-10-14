-- Audit trail for activities. Run once in the Supabase SQL editor (safe to re-run).
-- Requires multi_tenant.sql and scale_and_privacy.sql to have been run first.
-- Every create / change / delete of an activity is logged by the database itself,
-- so it is captured however the change was made and cannot be edited from the app.

create table if not exists public.task_audit (
  id bigint generated always as identity primary key,
  org_id text not null,
  task_id bigint not null,
  task_title text,
  action text not null check (action in ('created', 'updated', 'deleted')),
  changes jsonb not null default '{}'::jsonb,
  changed_by_user uuid,
  changed_by_name text,
  changed_at timestamptz not null default now()
);

create index if not exists task_audit_task_idx on public.task_audit (org_id, task_id, changed_at desc);

alter table public.task_audit enable row level security;

drop policy if exists "task_audit_select" on public.task_audit;
create policy "task_audit_select" on public.task_audit
for select to authenticated using (
  public.is_org_member(org_id)
  and not public.is_operations_only(org_id)
);
-- No insert / update / delete policies: only the trigger below can write, so the log is tamper-proof.

create or replace function public.log_task_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text;
  diff jsonb := '{}'::jsonb;
  col text;
  old_val jsonb;
  new_val jsonb;
  tracked text[] := array['title', 'type', 'person', 'resource_id', 'start_at', 'end_at', 'status', 'note', 'issue_reason', 'issue_activity', 'delay_minutes'];
begin
  actor := coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''),
    nullif(auth.jwt() ->> 'email', ''),
    'System'
  );

  if TG_OP = 'INSERT' then
    insert into public.task_audit (org_id, task_id, task_title, action, changes, changed_by_user, changed_by_name)
    values (NEW.org_id::text, NEW.id, NEW.title, 'created',
      jsonb_build_object('person', NEW.person, 'start_at', NEW.start_at, 'end_at', NEW.end_at, 'resource_id', NEW.resource_id),
      auth.uid(), actor);
    return NEW;
  elsif TG_OP = 'DELETE' then
    insert into public.task_audit (org_id, task_id, task_title, action, changes, changed_by_user, changed_by_name)
    values (OLD.org_id::text, OLD.id, OLD.title, 'deleted',
      jsonb_build_object('person', OLD.person, 'start_at', OLD.start_at, 'end_at', OLD.end_at),
      auth.uid(), actor);
    return OLD;
  end if;

  foreach col in array tracked loop
    old_val := to_jsonb(OLD) -> col;
    new_val := to_jsonb(NEW) -> col;
    if old_val is distinct from new_val then
      diff := diff || jsonb_build_object(col, jsonb_build_object('from', old_val, 'to', new_val));
    end if;
  end loop;

  if diff <> '{}'::jsonb then
    insert into public.task_audit (org_id, task_id, task_title, action, changes, changed_by_user, changed_by_name)
    values (NEW.org_id::text, NEW.id, NEW.title, 'updated', diff, auth.uid(), actor);
  end if;
  return NEW;
end;
$$;

drop trigger if exists task_audit_trigger on public.standard_work_tasks;
create trigger task_audit_trigger
after insert or update or delete on public.standard_work_tasks
for each row execute function public.log_task_change();
