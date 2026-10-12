-- إلو مستثمر v17 - Admin polish: plans, user controls, stats columns
-- شغّل هذا بعد v16.

alter table public.users
  add column if not exists account_status text default 'active',
  add column if not exists block_reason text,
  add column if not exists suspended_until timestamptz,
  add column if not exists remaining_projects integer default 0,
  add column if not exists plan text default 'free',
  add column if not exists subscription_status text default 'free';

alter table public.projects
  add column if not exists views_count integer default 0,
  add column if not exists contacts_count integer default 0,
  add column if not exists saves_count integer default 0,
  add column if not exists is_featured boolean default false;

create table if not exists public.admin_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price numeric default 0,
  duration_days integer default 30,
  project_limit integer default 0,
  features jsonb default '[]'::jsonb,
  is_active boolean default true,
  sort_order integer default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.admin_plans enable row level security;

drop policy if exists "admins can read plans" on public.admin_plans;
create policy "admins can read plans"
on public.admin_plans
for select
using (public.is_admin_staff('plans') or public.is_admin_staff('overview'));

drop policy if exists "admins can manage plans" on public.admin_plans;
create policy "admins can manage plans"
on public.admin_plans
for all
using (public.is_admin_staff('plans'))
with check (public.is_admin_staff('plans'));

insert into public.admin_plans (code, name, price, duration_days, project_limit, features, is_active, sort_order)
values
  ('free', 'مجانية', 0, 30, 1, '["مشروع واحد", "ظهور عادي", "بدون طلبات مستثمرين"]'::jsonb, true, 10),
  ('premium', 'مميزة', 9, 30, 5, '["5 مشاريع", "طلبات المستثمرين", "أولوية ظهور", "إحصائيات أساسية"]'::jsonb, true, 20),
  ('business', 'أعمال', 25, 30, 20, '["20 مشروع", "طلبات المستثمرين", "إحصائيات متقدمة", "دعم أولوية"]'::jsonb, true, 30)
on conflict (code) do nothing;
