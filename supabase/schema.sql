create table if not exists public.standard_work_resources (
  id text primary key,
  name text not null,
  zone text,
  role text,
  status text default 'Ready'
);

create table if not exists public.standard_work_tasks (
  id bigint primary key,
  resource_id text,
  title text not null,
  type text not null,
  person text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text default 'scheduled',
  note text,
  issue_reason text,
  issue_activity text,
  delay_minutes integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.business_resources (
  id text primary key,
  org_id text not null default 'default',
  name text not null,
  zone text,
  type text,
  status text default 'Available',
  created_at timestamptz default now()
);

alter table public.standard_work_resources enable row level security;
alter table public.standard_work_tasks enable row level security;
alter table public.business_resources enable row level security;

create policy "standard_work_resources_read" on public.standard_work_resources
for select using (true);

create policy "standard_work_resources_write" on public.standard_work_resources
for all using (true) with check (true);

create policy "standard_work_tasks_read" on public.standard_work_tasks
for select using (true);

create policy "standard_work_tasks_write" on public.standard_work_tasks
for all using (true) with check (true);

create policy "business_resources_read" on public.business_resources
for select using (true);

create policy "business_resources_write" on public.business_resources
for all using (true) with check (true);

insert into public.standard_work_resources (id, name, zone, role, status)
values
  ('101', 'Room 101', 'First floor', '', 'Ready'),
  ('102', 'Room 102', 'First floor', '', 'Attention'),
  ('103', 'Room 103', 'First floor', '', 'Ready'),
  ('201', 'Room 201', 'Second floor', '', 'Ready'),
  ('202', 'Room 202', 'Second floor', '', 'Attention'),
  ('203', 'Room 203', 'Second floor', '', 'Ready')
on conflict (id) do nothing;

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text default 'UTC',
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.organisation_memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'viewer',
  status text not null default 'active',
  created_at timestamptz default now(),
  unique (org_id, user_id)
);

create table if not exists public.organisation_settings (
  id text primary key default 'default',
  org_id text not null default 'default',
  resource_config jsonb not null default '[]'::jsonb,
  role_cards jsonb not null default '[]'::jsonb,
  standard_timings jsonb not null default '{"booking": 90, "cleaning": 120, "inspection": 45, "issue": 60, "service": 30}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.role_cards (
  id text primary key,
  org_id uuid not null references public.organisations (id) on delete cascade,
  name text not null,
  description text,
  standard_minutes integer not null default 30,
  color text not null default 'bg-slate-100 text-slate-700',
  created_at timestamptz default now()
);

create table if not exists public.standard_task_timings (
  id text primary key,
  org_id uuid not null references public.organisations (id) on delete cascade,
  work_type text not null,
  standard_minutes integer not null default 30,
  created_at timestamptz default now()
);

alter table public.organisations enable row level security;
alter table public.profiles enable row level security;
alter table public.organisation_memberships enable row level security;
alter table public.organisation_settings enable row level security;
alter table public.role_cards enable row level security;
alter table public.standard_task_timings enable row level security;

create policy "organisations_read" on public.organisations
for select using (true);

create policy "organisations_write" on public.organisations
for all using (true) with check (true);

create policy "profiles_read" on public.profiles
for select using (true);

create policy "profiles_write" on public.profiles
for all using (true) with check (true);

create policy "organisation_memberships_read" on public.organisation_memberships
for select using (true);

create policy "organisation_memberships_write" on public.organisation_memberships
for all using (true) with check (true);

create policy "organisation_settings_read" on public.organisation_settings
for select using (true);

create policy "organisation_settings_write" on public.organisation_settings
for all using (true) with check (true);

create policy "role_cards_read" on public.role_cards
for select using (true);

create policy "role_cards_write" on public.role_cards
for all using (true) with check (true);

create policy "standard_task_timings_read" on public.standard_task_timings
for select using (true);

create policy "standard_task_timings_write" on public.standard_task_timings
for all using (true) with check (true);

alter table public.standard_work_tasks add column if not exists start_at timestamptz;
alter table public.standard_work_tasks add column if not exists end_at timestamptz;
alter table public.standard_work_tasks add column if not exists delay_minutes integer not null default 0;
alter table public.standard_work_tasks add column if not exists completed_at timestamptz;
alter table public.standard_work_tasks add column if not exists completed_by text;
alter table public.standard_work_tasks add column if not exists updated_at timestamptz default now();

alter table public.organisation_settings add column if not exists resource_config jsonb not null default '[]'::jsonb;
alter table public.organisation_settings add column if not exists standard_timings jsonb not null default '{"booking": 90, "cleaning": 120, "inspection": 45, "issue": 60, "service": 30}'::jsonb;

create table if not exists public.business_resources (
  id text primary key,
  org_id text not null default 'default',
  name text not null,
  zone text,
  type text,
  status text default 'Available',
  created_at timestamptz default now()
);
