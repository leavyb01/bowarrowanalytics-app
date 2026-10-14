-- Team page upgrade: start dates, holiday allowance, half days, tighter permissions.
-- Safe to run more than once. Run after team.sql.

alter table public.team_members add column if not exists start_date date;
alter table public.team_members add column if not exists holiday_allowance numeric;

alter table public.team_absences add column if not exists day_part text not null default 'full';
alter table public.team_absences drop constraint if exists team_absences_day_part_check;
alter table public.team_absences add constraint team_absences_day_part_check check (day_part in ('full', 'am', 'pm'));

-- Daily Operations no longer manage the team; admins and managers do.
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
      and m.role in ('admin', 'org_admin', 'super_admin', 'manager')
  );
$$;
