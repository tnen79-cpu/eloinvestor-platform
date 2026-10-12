-- v11 Investor Matching foundation for إلو مستثمر
-- شغل هذا الملف في Supabase SQL Editor إذا كانت الأعمدة/الجداول غير موجودة.

alter table public.users
  add column if not exists investor_preferences jsonb default '{}'::jsonb,
  add column if not exists preferred_categories text[] default '{}',
  add column if not exists preferred_location text,
  add column if not exists budget_min numeric default 0,
  add column if not exists budget_max numeric default 0,
  add column if not exists subscription_status text default 'free';

create table if not exists public.investor_saved_projects (
  id uuid primary key default gen_random_uuid(),
  investor_auth_id uuid not null,
  project_id uuid not null,
  project_snapshot jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique (investor_auth_id, project_id)
);

create table if not exists public.investor_contacted_projects (
  id uuid primary key default gen_random_uuid(),
  investor_auth_id uuid not null,
  project_id uuid not null,
  project_snapshot jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique (investor_auth_id, project_id)
);

alter table public.investor_saved_projects enable row level security;
alter table public.investor_contacted_projects enable row level security;

create policy if not exists "investors can read saved projects"
  on public.investor_saved_projects for select
  using (auth.uid() = investor_auth_id);

create policy if not exists "investors can save projects"
  on public.investor_saved_projects for insert
  with check (auth.uid() = investor_auth_id);

create policy if not exists "investors can update saved projects"
  on public.investor_saved_projects for update
  using (auth.uid() = investor_auth_id)
  with check (auth.uid() = investor_auth_id);

create policy if not exists "investors can read contacted projects"
  on public.investor_contacted_projects for select
  using (auth.uid() = investor_auth_id);

create policy if not exists "investors can register contacted projects"
  on public.investor_contacted_projects for insert
  with check (auth.uid() = investor_auth_id);

create policy if not exists "investors can update contacted projects"
  on public.investor_contacted_projects for update
  using (auth.uid() = investor_auth_id)
  with check (auth.uid() = investor_auth_id);
