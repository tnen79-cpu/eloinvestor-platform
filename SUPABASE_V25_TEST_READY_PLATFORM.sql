-- =========================================
-- EloInvestor V25 Test Ready Platform
-- Legacy-safe SQL for sectors, packages, promotions, views, ads
-- =========================================

create extension if not exists "pgcrypto";

-- 1) Dynamic sectors managed from admin
create table if not exists public.platform_sectors (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  slug text,
  code text,
  name_ar text not null,
  name_en text,
  icon text default '◇',
  emoji text default '◇',
  image_url text,
  country_code text default 'om',
  is_active boolean default true,
  sort_order int default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(key, country_code)
);

alter table public.platform_sectors add column if not exists slug text;
alter table public.platform_sectors add column if not exists code text;
alter table public.platform_sectors add column if not exists name_ar text;
alter table public.platform_sectors add column if not exists name_en text;
alter table public.platform_sectors add column if not exists icon text default '◇';
alter table public.platform_sectors add column if not exists emoji text default '◇';
alter table public.platform_sectors add column if not exists image_url text;
alter table public.platform_sectors add column if not exists country_code text default 'om';
alter table public.platform_sectors add column if not exists is_active boolean default true;
alter table public.platform_sectors add column if not exists sort_order int default 100;
alter table public.platform_sectors add column if not exists updated_at timestamptz default now();

create index if not exists idx_platform_sectors_active on public.platform_sectors(country_code, is_active, sort_order);

alter table public.platform_sectors enable row level security;
drop policy if exists "platform_sectors_public_read" on public.platform_sectors;
create policy "platform_sectors_public_read" on public.platform_sectors for select to anon, authenticated using (is_active = true);
drop policy if exists "platform_sectors_admin_all" on public.platform_sectors;
create policy "platform_sectors_admin_all" on public.platform_sectors for all to authenticated using (true) with check (true);

-- Optional seed only if empty
insert into public.platform_sectors(key, slug, code, name_ar, name_en, icon, emoji, country_code, sort_order)
select * from (values
  ('restaurants','restaurants','restaurants','مطاعم وكافيهات','Restaurants & Cafes','🍽️','🍽️','om',10),
  ('technology','technology','technology','تقنية وتطبيقات','Technology & Apps','💻','💻','om',20),
  ('retail','retail','retail','تجارة وتجزئة','Retail & Trading','🏪','🏪','om',30),
  ('real_estate','real_estate','real_estate','عقارات وضيافة','Real Estate & Hospitality','🏗️','🏗️','om',40),
  ('beauty','beauty','beauty','تجميل وعناية','Beauty & Care','💆','💆','om',50),
  ('services','services','services','خدمات متنوعة','Services','🔧','🔧','om',60)
) as seed(key, slug, code, name_ar, name_en, icon, emoji, country_code, sort_order)
where not exists (select 1 from public.platform_sectors limit 1)
on conflict (key, country_code) do nothing;

-- 2) Projects monetization and view counters
alter table public.projects add column if not exists views_count int default 0;
alter table public.projects add column if not exists views int default 0;
alter table public.projects add column if not exists is_sponsored boolean default false;
alter table public.projects add column if not exists sponsored boolean default false;
alter table public.projects add column if not exists sponsor_weight int default 0;
alter table public.projects add column if not exists sponsored_until timestamptz;
alter table public.projects add column if not exists promotion_status text default 'none';
alter table public.projects add column if not exists country_code text default 'om';
alter table public.projects add column if not exists category text;
alter table public.projects add column if not exists status text default 'pending';

create table if not exists public.project_views_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  viewer_id uuid,
  ip_hash text,
  created_at timestamptz default now()
);
create index if not exists idx_project_views_log_project_date on public.project_views_log(project_id, created_at desc);

-- 3) Promotion requests for project owners
create table if not exists public.promotion_requests (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  project_id uuid,
  package_code text,
  placement text default 'home_sponsored',
  days int default 7,
  budget numeric default 0,
  status text default 'pending',
  payment_reference text,
  admin_note text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now(),
  reviewed_at timestamptz
);

alter table public.promotion_requests add column if not exists user_auth_id uuid;
alter table public.promotion_requests add column if not exists project_id uuid;
alter table public.promotion_requests add column if not exists package_code text;
alter table public.promotion_requests add column if not exists placement text default 'home_sponsored';
alter table public.promotion_requests add column if not exists days int default 7;
alter table public.promotion_requests add column if not exists budget numeric default 0;
alter table public.promotion_requests add column if not exists status text default 'pending';
alter table public.promotion_requests add column if not exists payment_reference text;
alter table public.promotion_requests add column if not exists admin_note text;
alter table public.promotion_requests add column if not exists starts_at timestamptz;
alter table public.promotion_requests add column if not exists ends_at timestamptz;
alter table public.promotion_requests add column if not exists reviewed_at timestamptz;
create index if not exists idx_promotion_requests_status on public.promotion_requests(status, created_at desc);

-- 4) Admin packages used by public packages page
create table if not exists public.subscription_packages (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  name_en text,
  description_ar text,
  description_en text,
  package_type text default 'owner',
  target_account_type text default 'owner',
  price numeric default 0,
  currency text default 'OMR',
  currency_code text default 'OMR',
  project_limit int default 1,
  projects_limit int default 1,
  recommendation_limit int default 3,
  duration_days int default 30,
  verification_included boolean default false,
  featured_included boolean default false,
  is_active boolean default true,
  sort_order int default 100,
  features jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table public.subscription_packages add column if not exists target_account_type text default 'owner';
alter table public.subscription_packages add column if not exists currency_code text default 'OMR';
alter table public.subscription_packages add column if not exists projects_limit int default 1;
alter table public.subscription_packages add column if not exists duration_days int default 30;
alter table public.subscription_packages add column if not exists features jsonb default '[]'::jsonb;
create index if not exists idx_subscription_packages_active on public.subscription_packages(is_active, sort_order);

-- 5) Ads/campaign foundations without demo data
create table if not exists public.platform_ads (
  id uuid primary key default gen_random_uuid(),
  title text,
  placement text default 'home_top',
  image_url text,
  link_url text,
  country_code text default 'om',
  is_active boolean default true,
  sort_order int default 100,
  created_at timestamptz default now()
);

create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  advertiser_user_id uuid,
  entity_type text default 'project',
  entity_id uuid,
  placement text default 'home_sponsored',
  country_code text default 'om',
  impressions int default 0,
  clicks int default 0,
  budget numeric default 0,
  spent numeric default 0,
  starts_at timestamptz default now(),
  ends_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);
create index if not exists idx_ad_campaigns_active on public.ad_campaigns(is_active, country_code, placement);

-- 6) Admin helper views/RPC
create or replace function public.admin_get_promotions()
returns setof public.promotion_requests
language sql security definer
as $$ select * from public.promotion_requests order by created_at desc $$;
grant execute on function public.admin_get_promotions() to authenticated;

-- Done
