-- Team members and absences (run once in the Supabase SQL editor, safe to re-run).
-- Requires multi_tenant.sql to have been run first.

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  name text not null,
  role text,
  created_at timestamptz not null default now()
);

create table if not exists public.team_absences (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  member_id uuid not null references public.team_members (id) on delete cascade,
  type text not null default 'holiday',
  start_date date not null,
  end_date date not null,
  note text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists team_members_org_idx on public.team_members (org_id);
create index if not exists team_absences_org_idx on public.team_absences (org_id, start_date);

create or replace function public.can_manage_team(target text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin() or exists (
    select 1 from public.organisation_memberships m
    where m.org_id::text = target and m.user_id = auth.uid() and m.status = 'active'
      and m.role in ('admin', 'org_admin', 'super_admin', 'manager', 'operations')
  );
$$;

alter table public.team_members enable row level security;
alter table public.team_absences enable row level security;

drop policy if exists "team_members_select" on public.team_members;
drop policy if exists "team_members_write" on public.team_members;
drop policy if exists "team_absences_select" on public.team_absences;
drop policy if exists "team_absences_write" on public.team_absences;

create policy "team_members_select" on public.team_members
for select to authenticated using (public.is_org_member(org_id::text));
create policy "team_members_write" on public.team_members
for all to authenticated using (public.can_manage_team(org_id::text)) with check (public.can_manage_team(org_id::text));

create policy "team_absences_select" on public.team_absences
for select to authenticated using (public.is_org_member(org_id::text));
create policy "team_absences_write" on public.team_absences
for all to authenticated using (public.can_manage_team(org_id::text)) with check (public.can_manage_team(org_id::text));
