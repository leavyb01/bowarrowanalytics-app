-- Multi-tenant isolation migration.
-- Run once in the Supabase SQL editor (safe to re-run).
-- Existing board data is assigned to the organisation whose name or slug contains "kare".

-- 1. Organisation column on board data
alter table public.standard_work_tasks
  add column if not exists org_id uuid references public.organisations (id) on delete cascade;
alter table public.standard_work_resources
  add column if not exists org_id uuid references public.organisations (id) on delete cascade;
alter table public.organisation_settings
  add column if not exists work_types jsonb not null default '[]'::jsonb;

-- 2. Backfill existing rows to Kare and make settings/timing ids per-organisation
do $$
declare
  kare uuid;
begin
  select id into kare
  from public.organisations
  where name ilike '%kare%' or slug ilike '%kare%'
  order by created_at
  limit 1;

  if kare is null then
    raise exception 'No organisation matching "kare" found. Create it first or edit this script.';
  end if;

  update public.standard_work_tasks set org_id = kare where org_id is null;
  update public.standard_work_resources set org_id = kare where org_id is null;

  update public.organisation_settings
  set id = kare::text, org_id = kare::text
  where id = 'default'
    and not exists (select 1 from public.organisation_settings s where s.id = kare::text);

  update public.standard_task_timings
  set id = org_id::text || ':' || id
  where id not like '%:%';
end $$;

alter table public.standard_work_tasks alter column org_id set not null;
alter table public.standard_work_resources alter column org_id set not null;

-- Resource ids such as '101' repeat across organisations, so the key includes org_id
alter table public.standard_work_resources drop constraint if exists standard_work_resources_pkey;
alter table public.standard_work_resources add primary key (org_id, id);

create index if not exists standard_work_tasks_org_idx on public.standard_work_tasks (org_id, start_at);

-- 3. Make sure existing profile -> organisation links exist as memberships
with candidates as (
  select
    p.id as user_id,
    coalesce(p.role, 'viewer') as role,
    case
      when p.org_id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        then p.org_id::text::uuid
    end as org_id
  from public.profiles p
)
insert into public.organisation_memberships (org_id, user_id, role, status)
select c.org_id, c.user_id, c.role, 'active'
from candidates c
join public.organisations o on o.id = c.org_id
on conflict (org_id, user_id) do nothing;

-- 4. Global (platform) admins can open and administer every organisation
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
drop policy if exists "platform_admins_select_own" on public.platform_admins;
create policy "platform_admins_select_own" on public.platform_admins
for select to authenticated using (user_id = auth.uid());

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

-- Helper functions used by the policies
create or replace function public.is_org_member(target text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin() or exists (
    select 1 from public.organisation_memberships m
    where m.org_id::text = target and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

create or replace function public.can_write_org(target text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin() or exists (
    select 1 from public.organisation_memberships m
    where m.org_id::text = target and m.user_id = auth.uid() and m.status = 'active'
      and m.role in ('admin', 'org_admin', 'super_admin', 'manager', 'operations', 'cleaner')
  );
$$;

create or replace function public.is_org_admin(target text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin() or exists (
    select 1 from public.organisation_memberships m
    where m.org_id::text = target and m.user_id = auth.uid() and m.status = 'active'
      and m.role in ('admin', 'org_admin', 'super_admin')
  );
$$;

-- 5. Replace the open "using (true)" policies
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'standard_work_tasks', 'standard_work_resources', 'organisations', 'profiles',
        'organisation_memberships', 'organisation_settings', 'role_cards',
        'standard_task_timings', 'business_resources'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

alter table public.standard_work_tasks enable row level security;
alter table public.standard_work_resources enable row level security;
alter table public.organisations enable row level security;
alter table public.profiles enable row level security;
alter table public.organisation_memberships enable row level security;
alter table public.organisation_settings enable row level security;
alter table public.role_cards enable row level security;
alter table public.standard_task_timings enable row level security;
alter table public.business_resources enable row level security;

-- Board data: members read, editing roles write
create policy "tasks_select" on public.standard_work_tasks
for select to authenticated using (public.is_org_member(org_id::text));
create policy "tasks_insert" on public.standard_work_tasks
for insert to authenticated with check (public.can_write_org(org_id::text));
create policy "tasks_update" on public.standard_work_tasks
for update to authenticated using (public.can_write_org(org_id::text)) with check (public.can_write_org(org_id::text));
create policy "tasks_delete" on public.standard_work_tasks
for delete to authenticated using (public.can_write_org(org_id::text));

create policy "resources_select" on public.standard_work_resources
for select to authenticated using (public.is_org_member(org_id::text));
create policy "resources_write" on public.standard_work_resources
for all to authenticated using (public.is_org_admin(org_id::text)) with check (public.is_org_admin(org_id::text));

-- Organisation directory and access
create policy "organisations_select" on public.organisations
for select to authenticated using (public.is_org_member(id::text));

create policy "profiles_select_own" on public.profiles
for select to authenticated using (id = auth.uid());

create policy "memberships_select" on public.organisation_memberships
for select to authenticated using (user_id = auth.uid() or public.is_org_admin(org_id::text));
create policy "memberships_admin_write" on public.organisation_memberships
for all to authenticated using (public.is_org_admin(org_id::text)) with check (public.is_org_admin(org_id::text));

-- Per-organisation configuration
create policy "settings_select" on public.organisation_settings
for select to authenticated using (public.is_org_member(org_id));
create policy "settings_write" on public.organisation_settings
for all to authenticated using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

create policy "role_cards_select" on public.role_cards
for select to authenticated using (public.is_org_member(org_id::text));
create policy "role_cards_write" on public.role_cards
for all to authenticated using (public.is_org_admin(org_id::text)) with check (public.is_org_admin(org_id::text));

create policy "timings_select" on public.standard_task_timings
for select to authenticated using (public.is_org_member(org_id::text));
create policy "timings_write" on public.standard_task_timings
for all to authenticated using (public.is_org_admin(org_id::text)) with check (public.is_org_admin(org_id::text));

create policy "business_resources_select" on public.business_resources
for select to authenticated using (public.is_org_member(org_id));
create policy "business_resources_write" on public.business_resources
for all to authenticated using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

-- 6. Realtime
do $$
begin
  alter publication supabase_realtime add table public.standard_work_tasks;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.standard_work_resources;
exception when duplicate_object then null;
end $$;

-- 7a. Make yourself a global admin (replace the email), then you can pick any organisation
--
-- insert into public.platform_admins (user_id)
-- select id from public.profiles where email = 'bryan@bowarrowanalytics.ie'
-- on conflict do nothing;

-- 7. Giving people access (run per person; replace the email and organisation slug)
-- Roles: admin, manager, operations, cleaner, viewer
--
-- insert into public.organisation_memberships (org_id, user_id, role, status)
-- select o.id, p.id, 'admin', 'active'
-- from public.organisations o, public.profiles p
-- where o.slug = 'kare' and p.email = 'bryan@bowarrowanalytics.ie'
-- on conflict (org_id, user_id) do update set role = excluded.role, status = 'active';
