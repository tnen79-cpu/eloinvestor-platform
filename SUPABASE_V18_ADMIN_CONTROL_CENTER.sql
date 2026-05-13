-- =========================================
-- EloInvestor V18 Admin Control Center SQL
-- Safe for old databases / Supabase Postgres
-- =========================================

create extension if not exists "pgcrypto";

-- Users compatibility
alter table if exists users add column if not exists role text default 'user';
alter table if exists users add column if not exists account_type text default 'investor';
alter table if exists users add column if not exists subscription_status text default 'free';
alter table if exists users add column if not exists plan text default 'free';
alter table if exists users add column if not exists package_type text default 'investor';
alter table if exists users add column if not exists is_verified boolean default false;
alter table if exists users add column if not exists verification_status text default 'none';
alter table if exists users add column if not exists is_blocked boolean default false;
alter table if exists users add column if not exists preferred_categories text[] default '{}';
alter table if exists users add column if not exists preferred_location text;
alter table if exists users add column if not exists budget_min numeric default 0;
alter table if exists users add column if not exists budget_max numeric default 0;

-- Projects compatibility
alter table if exists projects add column if not exists status text default 'pending';
alter table if exists projects add column if not exists is_verified boolean default false;
alter table if exists projects add column if not exists verification_status text default 'none';
alter table if exists projects add column if not exists is_featured boolean default false;
alter table if exists projects add column if not exists featured_until timestamptz;
alter table if exists projects add column if not exists views_count integer default 0;
alter table if exists projects add column if not exists contacts_count integer default 0;
alter table if exists projects add column if not exists saves_count integer default 0;
alter table if exists projects add column if not exists owner_auth_id uuid;
alter table if exists projects add column if not exists country_code text default 'om';

-- Packages controlled by admin
create table if not exists subscription_packages (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  name_en text,
  package_type text default 'investor', -- investor / owner / both
  price numeric default 0,
  currency text default 'OMR',
  recommendation_limit integer default 3,
  project_limit integer default 1,
  verification_included boolean default false,
  featured_included boolean default false,
  is_active boolean default true,
  sort_order integer default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into subscription_packages (code, name_ar, name_en, package_type, price, recommendation_limit, project_limit, verification_included, featured_included, sort_order)
values
('free', 'مجاني', 'Free', 'both', 0, 3, 1, false, false, 1),
('investor_pro', 'مستثمر Pro', 'Investor Pro', 'investor', 9, 25, 0, false, false, 10),
('investor_elite', 'مستثمر Elite', 'Investor Elite', 'investor', 19, 999, 0, false, false, 20),
('owner_pro', 'صاحب مشروع Pro', 'Owner Pro', 'owner', 12, 0, 5, true, true, 30),
('owner_business', 'صاحب مشروع Business', 'Owner Business', 'owner', 29, 0, 25, true, true, 40)
on conflict (code) do nothing;

alter table subscription_packages enable row level security;
drop policy if exists "packages_public_read" on subscription_packages;
create policy "packages_public_read" on subscription_packages for select to public using (is_active = true);
drop policy if exists "packages_admin_all" on subscription_packages;
create policy "packages_admin_all" on subscription_packages for all to authenticated using (
  exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin'))
) with check (
  exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin'))
);

-- Upgrade requests controlled by admin
create table if not exists subscription_requests (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid not null,
  package_code text,
  package_type text default 'investor',
  status text default 'pending',
  payment_reference text,
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

alter table subscription_requests enable row level security;
drop policy if exists "subscription_requests_own_select" on subscription_requests;
create policy "subscription_requests_own_select" on subscription_requests for select to authenticated using (
  auth.uid() = user_auth_id or exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin'))
);
drop policy if exists "subscription_requests_own_insert" on subscription_requests;
create policy "subscription_requests_own_insert" on subscription_requests for insert to authenticated with check (auth.uid() = user_auth_id);
drop policy if exists "subscription_requests_admin_update" on subscription_requests;
create policy "subscription_requests_admin_update" on subscription_requests for update to authenticated using (
  exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin'))
) with check (
  exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin'))
);

-- Notifications controlled by admin
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  title text not null,
  body text,
  type text default 'system',
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table notifications enable row level security;
drop policy if exists "notifications_own_select" on notifications;
create policy "notifications_own_select" on notifications for select to authenticated using (
  user_auth_id is null or auth.uid() = user_auth_id or exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin'))
);
drop policy if exists "notifications_own_update" on notifications;
create policy "notifications_own_update" on notifications for update to authenticated using (auth.uid() = user_auth_id) with check (auth.uid() = user_auth_id);
drop policy if exists "notifications_admin_insert" on notifications;
create policy "notifications_admin_insert" on notifications for insert to authenticated with check (
  exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin'))
);

-- Verification admin compatibility
alter table if exists verification_requests add column if not exists admin_note text;
alter table if exists verification_requests add column if not exists reviewed_at timestamptz;
alter table if exists verification_requests add column if not exists project_title text;
alter table if exists verification_requests add column if not exists status text default 'pending';

drop policy if exists "verification_admin_all" on verification_requests;
create policy "verification_admin_all" on verification_requests for all to authenticated using (
  exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin'))
) with check (
  exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin'))
);

-- Saved/contacted/views compatibility for analytics
create table if not exists investor_saved_projects (
  id uuid primary key default gen_random_uuid(),
  investor_auth_id uuid not null,
  project_id uuid not null,
  created_at timestamptz default now(),
  unique (investor_auth_id, project_id)
);

create table if not exists investor_contacted_projects (
  id uuid primary key default gen_random_uuid(),
  investor_auth_id uuid not null,
  project_id uuid not null,
  created_at timestamptz default now(),
  unique (investor_auth_id, project_id)
);

create table if not exists project_views_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  viewer_id uuid,
  created_at timestamptz default now()
);
create index if not exists idx_project_views_log_project on project_views_log(project_id);
create index if not exists idx_project_views_log_created on project_views_log(created_at);

-- Admin can manage users/projects for panel
alter table if exists users enable row level security;
drop policy if exists "users_admin_all" on users;
create policy "users_admin_all" on users for all to authenticated using (
  exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin'))
) with check (
  exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin'))
);

alter table if exists projects enable row level security;
drop policy if exists "projects_admin_all" on projects;
create policy "projects_admin_all" on projects for all to authenticated using (
  exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin'))
) with check (
  exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin'))
);
