-- Creates five DEMO organisations with sample lanes, team and activities.
-- Run once in the Supabase SQL editor (safe to re-run: nothing is duplicated).
-- Colin and Ronan get admin access to the DEMO organisations only. Kare is untouched, and
-- they are not members of it, so they cannot see it. You (platform admin) see everything.

-- 1. Organisations
insert into public.organisations (name, slug)
select v.name, v.slug
from (values
  ('DEMO - Manufacturing', 'demo-manufacturing'),
  ('DEMO - Hospitality', 'demo-hospitality'),
  ('DEMO - Retail', 'demo-retail'),
  ('DEMO - Local Services', 'demo-local-services'),
  ('DEMO - Contractor', 'demo-contractor')
) as v(name, slug)
where not exists (select 1 from public.organisations o where o.slug = v.slug);

-- 2. Colin and Ronan become admins of the DEMO organisations only
insert into public.organisation_memberships (org_id, user_id, role, status)
select o.id, u.id, 'admin', 'active'
from public.organisations o
join auth.users u on lower(u.email) in ('mulhallcolin@gmail.com', 'ronan.maherr@outlook.com')
where o.slug like 'demo-%'
on conflict (org_id, user_id) do update set role = 'admin', status = 'active';

-- 3. Sample lanes (resources)
insert into public.standard_work_resources (org_id, id, name, zone, role, status)
select o.id, r.id, r.name, r.zone, r.role, 'Available'
from public.organisations o
join (values
  ('demo-manufacturing', 'L1', 'Line 1', 'Assembly hall', 'Production line'),
  ('demo-manufacturing', 'L2', 'Line 2', 'Assembly hall', 'Production line'),
  ('demo-manufacturing', 'PK', 'Packing bay', 'Dispatch', 'Packing'),
  ('demo-hospitality', '101', 'Room 101', 'First floor', 'Guest room'),
  ('demo-hospitality', '102', 'Room 102', 'First floor', 'Guest room'),
  ('demo-hospitality', 'KT', 'Kitchen', 'Back of house', 'Kitchen'),
  ('demo-retail', 'FL', 'Shop floor', 'Front of store', 'Sales floor'),
  ('demo-retail', 'ST', 'Stockroom', 'Back of store', 'Stock'),
  ('demo-retail', 'TL', 'Tills', 'Front of store', 'Checkout'),
  ('demo-local-services', 'V1', 'Van 1', 'Fleet', 'Vehicle'),
  ('demo-local-services', 'V2', 'Van 2', 'Fleet', 'Vehicle'),
  ('demo-local-services', 'OF', 'Office', 'Base', 'Admin'),
  ('demo-contractor', 'S1', 'Site A', 'North', 'Job site'),
  ('demo-contractor', 'S2', 'Site B', 'South', 'Job site'),
  ('demo-contractor', 'WS', 'Workshop', 'Yard', 'Workshop')
) as r(slug, id, name, zone, role) on r.slug = o.slug
where not exists (
  select 1 from public.standard_work_resources x where x.org_id = o.id and x.id = r.id
);

-- 4. Sample team members
insert into public.team_members (org_id, name, role, start_date, holiday_allowance)
select o.id, t.name, t.role, t.start_date::date, 25
from public.organisations o
join (values
  ('demo-manufacturing', 'Alex Byrne', 'Line lead', '2022-03-01'),
  ('demo-manufacturing', 'Sinead Walsh', 'Operator', '2023-06-12'),
  ('demo-manufacturing', 'Tom Doyle', 'Packer', '2024-01-08'),
  ('demo-hospitality', 'Maria Costa', 'Housekeeper', '2021-05-17'),
  ('demo-hospitality', 'Liam Kerr', 'Housekeeper', '2023-02-20'),
  ('demo-hospitality', 'Priya Nair', 'Chef', '2022-09-05'),
  ('demo-retail', 'Aoife Quinn', 'Sales assistant', '2022-11-14'),
  ('demo-retail', 'Dan Moore', 'Stock handler', '2023-08-01'),
  ('demo-retail', 'Eva Lopez', 'Cashier', '2024-03-18'),
  ('demo-local-services', 'Gary Flynn', 'Technician', '2020-04-06'),
  ('demo-local-services', 'Niamh Ryan', 'Technician', '2023-10-02'),
  ('demo-local-services', 'Helen Shaw', 'Office admin', '2021-07-19'),
  ('demo-contractor', 'Pat Murphy', 'Site foreman', '2019-02-11'),
  ('demo-contractor', 'Cian Healy', 'Electrician', '2022-05-30'),
  ('demo-contractor', 'Una Brady', 'Joiner', '2024-04-22')
) as t(slug, name, role, start_date) on t.slug = o.slug
where not exists (
  select 1 from public.team_members m where m.org_id = o.id and m.name = t.name
);

-- 5. Sample activities for today and tomorrow (ids are generated; assignees match the team above)
with seed(slug, resource_id, title, type, person, day_offset, start_h, end_h, note) as (values
  ('demo-manufacturing', 'L1', 'Batch 42 run', 'service', 'Alex Byrne', 0, 7, 11, 'First production run'),
  ('demo-manufacturing', 'L2', 'Line changeover', 'cleaning', 'Sinead Walsh', 0, 9, 11, 'Changeover to product B'),
  ('demo-manufacturing', 'PK', 'Pack and label', 'service', 'Tom Doyle', 0, 12, 15, 'Order 1187'),
  ('demo-manufacturing', 'L1', 'Quality check', 'inspection', 'Alex Byrne', 1, 8, 9, 'Sample inspection'),
  ('demo-hospitality', '101', 'Guest stay', 'booking', 'Maria Costa', 0, 0, 11, 'Checks out at 11:00'),
  ('demo-hospitality', '101', 'Room turnover', 'cleaning', 'Maria Costa', 0, 11, 13, 'Full clean'),
  ('demo-hospitality', '102', 'Deep clean', 'cleaning', 'Liam Kerr', 0, 9, 12, 'Monthly deep clean'),
  ('demo-hospitality', 'KT', 'Prep service', 'service', 'Priya Nair', 0, 14, 17, 'Dinner prep'),
  ('demo-retail', 'FL', 'Restock aisle 3', 'service', 'Dan Moore', 0, 8, 10, 'Delivery restock'),
  ('demo-retail', 'TL', 'Till cover', 'service', 'Eva Lopez', 0, 10, 16, 'Peak cover'),
  ('demo-retail', 'ST', 'Stock take', 'inspection', 'Aoife Quinn', 1, 9, 12, 'Monthly count'),
  ('demo-local-services', 'V1', 'Boiler service - Murphy', 'service', 'Gary Flynn', 0, 9, 11, 'Annual service'),
  ('demo-local-services', 'V2', 'Leak repair - Kelly', 'service', 'Niamh Ryan', 0, 10, 13, 'Urgent call-out'),
  ('demo-local-services', 'OF', 'Quotes and invoicing', 'service', 'Helen Shaw', 0, 14, 17, 'Weekly admin'),
  ('demo-contractor', 'S1', 'First fix electrics', 'service', 'Cian Healy', 0, 8, 16, 'Plot 4'),
  ('demo-contractor', 'S2', 'Fit kitchen units', 'service', 'Una Brady', 0, 8, 15, 'Unit 7'),
  ('demo-contractor', 'WS', 'Site safety inspection', 'inspection', 'Pat Murphy', 1, 8, 10, 'Weekly inspection')
),
numbered as (
  select s.*, o.id as org_id,
         (extract(epoch from clock_timestamp()) * 1000)::bigint + row_number() over () as new_id
  from seed s
  join public.organisations o on o.slug = s.slug
)
insert into public.standard_work_tasks
  (id, org_id, resource_id, title, type, person, start_at, end_at, status, note)
select n.new_id, n.org_id, n.resource_id, n.title, n.type, n.person,
       (current_date + n.day_offset) + make_interval(hours => n.start_h),
       (current_date + n.day_offset) + make_interval(hours => n.end_h),
       'scheduled', n.note
from numbered n
where not exists (
  select 1 from public.standard_work_tasks t
  where t.org_id = n.org_id and t.title = n.title and t.person = n.person
);

-- 6. Check: who can see what (Kare must NOT appear for Colin or Ronan)
select u.email, o.name as organisation, m.role
from public.organisation_memberships m
join auth.users u on u.id = m.user_id
join public.organisations o on o.id = m.org_id
where lower(u.email) in ('mulhallcolin@gmail.com', 'ronan.maherr@outlook.com')
order by u.email, o.name;
