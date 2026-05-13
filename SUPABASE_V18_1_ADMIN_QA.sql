-- =========================================
-- ELOINVESTOR V18.1 ADMIN QA & CONTROL CENTER
-- Safe to run multiple times on Supabase/PostgreSQL
-- =========================================

create extension if not exists "pgcrypto";

-- Helper: make legacy tables compatible with the Admin Control Center
alter table if exists users add column if not exists role text default 'user';
alter table if exists users add column if not exists account_type text default 'investor';
alter table if exists users add column if not exists subscription_status text default 'free';
alter table if exists users add column if not exists plan text default 'free';
alter table if exists users add column if not exists package_type text default 'investor';
alter table if exists users add column if not exists is_blocked boolean default false;
alter table if exists users add column if not exists is_verified boolean default false;
alter table if exists users add column if not exists verification_status text default 'none';
alter table if exists users add column if not exists budget_min numeric default 0;
alter table if exists users add column if not exists budget_max numeric default 0;
alter table if exists users add column if not exists preferred_location text;
alter table if exists users add column if not exists preferred_categories text[] default '{}';

alter table if exists projects add column if not exists status text default 'pending';
alter table if exists projects add column if not exists is_verified boolean default false;
alter table if exists projects add column if not exists verification_status text default 'none';
alter table if exists projects add column if not exists is_featured boolean default false;
alter table if exists projects add column if not exists featured_until timestamptz;
alter table if exists projects add column if not exists admin_note text;
alter table if exists projects add column if not exists views_count integer default 0;
alter table if exists projects add column if not exists contacts_count integer default 0;
alter table if exists projects add column if not exists saves_count integer default 0;

-- Subscription packages controlled by admin
create table if not exists subscription_packages (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  name_en text,
  package_type text default 'investor',
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

-- Upgrade requests reviewed by admin
create table if not exists subscription_requests (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  package_code text,
  package_type text default 'investor',
  status text default 'pending',
  payment_reference text,
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
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

-- Admin action logs for audit trail
create table if not exists admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  admin_auth_id uuid,
  action text not null,
  target_type text,
  target_id text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_admin_action_logs_created on admin_action_logs(created_at desc);
create index if not exists idx_admin_action_logs_admin on admin_action_logs(admin_auth_id);

-- Countries and homepage slider
create table if not exists platform_countries (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  name_en text,
  flag text,
  currency_code text default 'OMR',
  currency_symbol_ar text default 'ر.ع',
  currency_symbol_en text default 'OMR',
  is_default boolean default false,
  is_active boolean default true,
  sort_order integer default 100,
  created_at timestamptz default now()
);

create table if not exists homepage_slides (
  id uuid primary key default gen_random_uuid(),
  title_ar text,
  title_en text,
  subtitle_ar text,
  subtitle_en text,
  button_text_ar text,
  button_text_en text,
  button_url text,
  image_url text,
  country_code text default 'om',
  is_active boolean default true,
  slide_order integer default 100,
  created_at timestamptz default now()
);

-- Saved/contacted/views analytics
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

-- Verification compatibility
create table if not exists verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid not null,
  project_id uuid,
  request_type text default 'project',
  type text,
  project_title text,
  status text default 'pending',
  document_url text,
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);
alter table if exists verification_requests add column if not exists admin_note text;
alter table if exists verification_requests add column if not exists reviewed_at timestamptz;
alter table if exists verification_requests add column if not exists project_title text;
alter table if exists verification_requests add column if not exists status text default 'pending';
alter table if exists verification_requests add column if not exists type text;

-- Enable RLS
alter table if exists users enable row level security;
alter table if exists projects enable row level security;
alter table subscription_packages enable row level security;
alter table subscription_requests enable row level security;
alter table notifications enable row level security;
alter table admin_action_logs enable row level security;
alter table platform_countries enable row level security;
alter table homepage_slides enable row level security;
alter table verification_requests enable row level security;
alter table investor_saved_projects enable row level security;
alter table investor_contacted_projects enable row level security;
alter table project_views_log enable row level security;

-- Admin predicate is repeated intentionally for Supabase policy compatibility.
-- Users admin full access
DROP POLICY IF EXISTS "users_admin_all" ON users;
CREATE POLICY "users_admin_all" ON users FOR ALL TO authenticated
USING (exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin')))
WITH CHECK (exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin')));

DROP POLICY IF EXISTS "projects_admin_all" ON projects;
CREATE POLICY "projects_admin_all" ON projects FOR ALL TO authenticated
USING (exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin')))
WITH CHECK (exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin')));

-- Admin-managed tables
DROP POLICY IF EXISTS "subscription_packages_admin_all" ON subscription_packages;
CREATE POLICY "subscription_packages_admin_all" ON subscription_packages FOR ALL TO authenticated
USING (exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin')))
WITH CHECK (exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin')));

DROP POLICY IF EXISTS "subscription_packages_public_read" ON subscription_packages;
CREATE POLICY "subscription_packages_public_read" ON subscription_packages FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "subscription_requests_admin_all" ON subscription_requests;
CREATE POLICY "subscription_requests_admin_all" ON subscription_requests FOR ALL TO authenticated
USING (exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin')) or auth.uid() = user_auth_id)
WITH CHECK (exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin')) or auth.uid() = user_auth_id);

DROP POLICY IF EXISTS "notifications_admin_insert" ON notifications;
CREATE POLICY "notifications_admin_insert" ON notifications FOR INSERT TO authenticated
WITH CHECK (exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin')));
DROP POLICY IF EXISTS "notifications_own_select" ON notifications;
CREATE POLICY "notifications_own_select" ON notifications FOR SELECT TO authenticated
USING (user_auth_id is null or auth.uid() = user_auth_id or exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin')));
DROP POLICY IF EXISTS "notifications_own_update" ON notifications;
CREATE POLICY "notifications_own_update" ON notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_auth_id) WITH CHECK (auth.uid() = user_auth_id);

DROP POLICY IF EXISTS "admin_action_logs_admin_all" ON admin_action_logs;
CREATE POLICY "admin_action_logs_admin_all" ON admin_action_logs FOR ALL TO authenticated
USING (exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin')))
WITH CHECK (exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin')));

DROP POLICY IF EXISTS "platform_countries_public_read" ON platform_countries;
CREATE POLICY "platform_countries_public_read" ON platform_countries FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "platform_countries_admin_all" ON platform_countries;
CREATE POLICY "platform_countries_admin_all" ON platform_countries FOR ALL TO authenticated
USING (exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin')))
WITH CHECK (exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin')));

DROP POLICY IF EXISTS "homepage_slides_public_read" ON homepage_slides;
CREATE POLICY "homepage_slides_public_read" ON homepage_slides FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "homepage_slides_admin_all" ON homepage_slides;
CREATE POLICY "homepage_slides_admin_all" ON homepage_slides FOR ALL TO authenticated
USING (exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin')))
WITH CHECK (exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin')));

DROP POLICY IF EXISTS "verification_admin_all" ON verification_requests;
CREATE POLICY "verification_admin_all" ON verification_requests FOR ALL TO authenticated
USING (auth.uid() = user_auth_id or exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin')))
WITH CHECK (auth.uid() = user_auth_id or exists (select 1 from users u where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text) and lower(coalesce(u.role,'')) in ('admin','super_admin')));

-- Seed default packages
insert into subscription_packages (code, name_ar, name_en, package_type, price, currency, recommendation_limit, project_limit, verification_included, featured_included, is_active, sort_order)
values
('free', 'مجاني', 'Free', 'both', 0, 'OMR', 3, 1, false, false, true, 1),
('investor_pro', 'مستثمر برو', 'Investor Pro', 'investor', 9, 'OMR', 25, 0, false, false, true, 10),
('investor_elite', 'مستثمر إيليت', 'Investor Elite', 'investor', 19, 'OMR', 999, 0, false, false, true, 20),
('owner_pro', 'صاحب مشروع برو', 'Owner Pro', 'owner', 12, 'OMR', 0, 5, true, true, true, 30),
('business', 'أعمال', 'Business', 'both', 29, 'OMR', 999, 15, true, true, true, 40)
on conflict (code) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  package_type = excluded.package_type,
  price = excluded.price,
  currency = excluded.currency,
  recommendation_limit = excluded.recommendation_limit,
  project_limit = excluded.project_limit,
  verification_included = excluded.verification_included,
  featured_included = excluded.featured_included,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into platform_countries (code, name_ar, name_en, flag, currency_code, currency_symbol_ar, currency_symbol_en, is_default, is_active, sort_order)
values ('om', 'عُمان', 'Oman', '🇴🇲', 'OMR', 'ر.ع', 'OMR', true, true, 1)
on conflict (code) do update set is_default = true, is_active = true;
