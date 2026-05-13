-- =========================================================
-- EloInvestor V24 REAL Platform Consistency + Monetization
-- Safe for old databases. No demo ads are inserted.
-- =========================================================
create extension if not exists "pgcrypto";

-- -------------------------
-- Admin helper: avoid recursive users policies
-- -------------------------
create or replace function public.is_current_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.auth_id = auth.uid()
      and coalesce(u.admin_status, 'active') not in ('suspended','revoked','inactive')
      and (coalesce(u.is_admin,false) = true or lower(coalesce(u.role,'')) in ('admin','super_admin') or lower(coalesce(u.admin_role,'')) in ('admin','super_admin','content_admin','finance_admin','verification_admin','support_admin'))
  );
$$;

grant execute on function public.is_current_admin() to authenticated, anon;

-- -------------------------
-- Remove experimental/test ads from the public DB
-- -------------------------
create table if not exists public.platform_ads (
  id uuid primary key default gen_random_uuid(),
  title text default '',
  placement text default 'home_top',
  image_url text,
  link_url text,
  country_code text default 'om',
  is_active boolean default true,
  sort_order int default 100,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.platform_ads add column if not exists title text default '';
alter table public.platform_ads add column if not exists placement text default 'home_top';
alter table public.platform_ads add column if not exists image_url text;
alter table public.platform_ads add column if not exists link_url text;
alter table public.platform_ads add column if not exists country_code text default 'om';
alter table public.platform_ads add column if not exists is_active boolean default true;
alter table public.platform_ads add column if not exists sort_order int default 100;
alter table public.platform_ads add column if not exists updated_at timestamptz default now();

delete from public.platform_ads
where lower(coalesce(title,'') || ' ' || coalesce(link_url,'') || ' ' || coalesce(image_url,'')) ~ '(test|sample|demo|placeholder|تجريبي|اختبار)';

-- -------------------------
-- Manual sectors controlled from Admin
-- -------------------------
create table if not exists public.platform_sectors (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  slug text,
  name_ar text not null,
  name_en text,
  icon text default '◆',
  image_url text,
  country_code text default 'om',
  is_active boolean default true,
  sort_order int default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(key, country_code)
);

alter table public.platform_sectors add column if not exists key text;
alter table public.platform_sectors add column if not exists slug text;
alter table public.platform_sectors add column if not exists name_ar text;
alter table public.platform_sectors add column if not exists name_en text;
alter table public.platform_sectors add column if not exists icon text default '◆';
alter table public.platform_sectors add column if not exists image_url text;
alter table public.platform_sectors add column if not exists country_code text default 'om';
alter table public.platform_sectors add column if not exists is_active boolean default true;
alter table public.platform_sectors add column if not exists sort_order int default 100;
alter table public.platform_sectors add column if not exists updated_at timestamptz default now();

create index if not exists platform_sectors_active_idx on public.platform_sectors(country_code, is_active, sort_order);

alter table public.platform_sectors enable row level security;
drop policy if exists "sectors_public_select" on public.platform_sectors;
create policy "sectors_public_select" on public.platform_sectors for select to anon, authenticated using (is_active = true or public.is_current_admin());
drop policy if exists "sectors_admin_all" on public.platform_sectors;
create policy "sectors_admin_all" on public.platform_sectors for all to authenticated using (public.is_current_admin()) with check (public.is_current_admin());

-- -------------------------
-- Project monetization / sponsored projects
-- -------------------------
alter table public.projects add column if not exists is_sponsored boolean default false;
alter table public.projects add column if not exists sponsored boolean default false;
alter table public.projects add column if not exists sponsor_weight int default 0;
alter table public.projects add column if not exists sponsored_until timestamptz;
alter table public.projects add column if not exists views_count int default 0;
alter table public.projects add column if not exists contacts_count int default 0;
alter table public.projects add column if not exists saves_count int default 0;
alter table public.projects add column if not exists country_code text default 'om';
alter table public.projects add column if not exists status text default 'pending';
alter table public.projects add column if not exists category text default 'services';
alter table public.projects add column if not exists city text;
alter table public.projects add column if not exists roi numeric default 0;
alter table public.projects add column if not exists price numeric default 0;

create index if not exists idx_projects_public_visibility on public.projects(country_code, status, category, city);
create index if not exists idx_projects_sponsored_v24 on public.projects(is_sponsored, sponsor_weight desc, sponsored_until);

create table if not exists public.promotion_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  owner_auth_id uuid,
  package_code text,
  amount numeric default 0,
  currency text default 'OMR',
  status text default 'pending',
  placement text default 'home_sponsored',
  sponsor_weight int default 50,
  starts_at timestamptz default now(),
  ends_at timestamptz,
  admin_note text,
  created_at timestamptz default now()
);

alter table public.promotion_requests add column if not exists project_id uuid;
alter table public.promotion_requests add column if not exists owner_auth_id uuid;
alter table public.promotion_requests add column if not exists package_code text;
alter table public.promotion_requests add column if not exists amount numeric default 0;
alter table public.promotion_requests add column if not exists currency text default 'OMR';
alter table public.promotion_requests add column if not exists status text default 'pending';
alter table public.promotion_requests add column if not exists placement text default 'home_sponsored';
alter table public.promotion_requests add column if not exists sponsor_weight int default 50;
alter table public.promotion_requests add column if not exists starts_at timestamptz default now();
alter table public.promotion_requests add column if not exists ends_at timestamptz;
alter table public.promotion_requests add column if not exists admin_note text;

alter table public.promotion_requests enable row level security;
drop policy if exists "promotion_owner_select" on public.promotion_requests;
create policy "promotion_owner_select" on public.promotion_requests for select to authenticated using (auth.uid() = owner_auth_id or public.is_current_admin());
drop policy if exists "promotion_owner_insert" on public.promotion_requests;
create policy "promotion_owner_insert" on public.promotion_requests for insert to authenticated with check (auth.uid() = owner_auth_id or public.is_current_admin());
drop policy if exists "promotion_admin_update" on public.promotion_requests;
create policy "promotion_admin_update" on public.promotion_requests for update to authenticated using (public.is_current_admin()) with check (public.is_current_admin());

create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text default '',
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

alter table public.ad_campaigns add column if not exists title text default '';
alter table public.ad_campaigns add column if not exists advertiser_user_id uuid;
alter table public.ad_campaigns add column if not exists entity_type text default 'project';
alter table public.ad_campaigns add column if not exists entity_id uuid;
alter table public.ad_campaigns add column if not exists placement text default 'home_sponsored';
alter table public.ad_campaigns add column if not exists country_code text default 'om';
alter table public.ad_campaigns add column if not exists impressions int default 0;
alter table public.ad_campaigns add column if not exists clicks int default 0;
alter table public.ad_campaigns add column if not exists budget numeric default 0;
alter table public.ad_campaigns add column if not exists spent numeric default 0;
alter table public.ad_campaigns add column if not exists starts_at timestamptz default now();
alter table public.ad_campaigns add column if not exists ends_at timestamptz;
alter table public.ad_campaigns add column if not exists is_active boolean default true;

create index if not exists idx_ad_campaigns_active_v24 on public.ad_campaigns(is_active, country_code, placement);

-- -------------------------
-- View counter and analytics
-- -------------------------
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  session_id text,
  event_type text not null default 'event',
  entity_type text,
  entity_id uuid,
  country_code text default 'om',
  placement text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.analytics_events add column if not exists user_auth_id uuid;
alter table public.analytics_events add column if not exists session_id text;
alter table public.analytics_events add column if not exists event_type text default 'event';
alter table public.analytics_events add column if not exists entity_type text;
alter table public.analytics_events add column if not exists entity_id uuid;
alter table public.analytics_events add column if not exists country_code text default 'om';
alter table public.analytics_events add column if not exists placement text;
alter table public.analytics_events add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.analytics_events add column if not exists created_at timestamptz default now();

create index if not exists idx_analytics_events_entity_v24 on public.analytics_events(entity_type, entity_id, created_at desc);
create index if not exists idx_analytics_events_type_v24 on public.analytics_events(event_type, created_at desc);

create or replace function public.increment_project_view(pid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.projects
  set views_count = coalesce(views_count, 0) + 1
  where id = pid;
end;
$$;

grant execute on function public.increment_project_view(uuid) to anon, authenticated;

-- -------------------------
-- Packages used by public packages page and admin
-- -------------------------
create table if not exists public.subscription_packages (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  name_en text,
  description_ar text,
  description_en text,
  package_type text default 'owner',
  price numeric default 0,
  currency text default 'OMR',
  project_limit int default 1,
  recommendation_limit int default 3,
  duration_days int default 30,
  verification_included boolean default false,
  featured_included boolean default false,
  is_active boolean default true,
  sort_order int default 100,
  created_at timestamptz default now()
);

alter table public.subscription_packages add column if not exists code text;
alter table public.subscription_packages add column if not exists name_ar text;
alter table public.subscription_packages add column if not exists name_en text;
alter table public.subscription_packages add column if not exists description_ar text;
alter table public.subscription_packages add column if not exists description_en text;
alter table public.subscription_packages add column if not exists package_type text default 'owner';
alter table public.subscription_packages add column if not exists price numeric default 0;
alter table public.subscription_packages add column if not exists currency text default 'OMR';
alter table public.subscription_packages add column if not exists project_limit int default 1;
alter table public.subscription_packages add column if not exists recommendation_limit int default 3;
alter table public.subscription_packages add column if not exists duration_days int default 30;
alter table public.subscription_packages add column if not exists verification_included boolean default false;
alter table public.subscription_packages add column if not exists featured_included boolean default false;
alter table public.subscription_packages add column if not exists is_active boolean default true;
alter table public.subscription_packages add column if not exists sort_order int default 100;

alter table public.subscription_packages enable row level security;
drop policy if exists "packages_public_select" on public.subscription_packages;
create policy "packages_public_select" on public.subscription_packages for select to anon, authenticated using (is_active = true or public.is_current_admin());
drop policy if exists "packages_admin_all" on public.subscription_packages;
create policy "packages_admin_all" on public.subscription_packages for all to authenticated using (public.is_current_admin()) with check (public.is_current_admin());

-- -------------------------
-- Notifications compatibility
-- -------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  user_id uuid,
  target_user_id uuid,
  title text,
  body text,
  content text,
  type text default 'system',
  entity_type text,
  entity_id uuid,
  action_url text,
  link_url text,
  is_read boolean default false,
  read_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.notifications add column if not exists user_auth_id uuid;
alter table public.notifications add column if not exists user_id uuid;
alter table public.notifications add column if not exists target_user_id uuid;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists body text;
alter table public.notifications add column if not exists content text;
alter table public.notifications add column if not exists type text default 'system';
alter table public.notifications add column if not exists entity_type text;
alter table public.notifications add column if not exists entity_id uuid;
alter table public.notifications add column if not exists action_url text;
alter table public.notifications add column if not exists link_url text;
alter table public.notifications add column if not exists is_read boolean default false;
alter table public.notifications add column if not exists read_at timestamptz;
alter table public.notifications add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.notifications add column if not exists created_at timestamptz default now();

update public.notifications set title = coalesce(title, 'إشعار'), body = coalesce(body, content) where title is null or body is null;

-- -------------------------
-- Storage buckets
-- -------------------------
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('project-images','project-images',true,5242880,array['image/jpeg','image/png','image/webp']::text[]),
('verification-docs','verification-docs',true,10485760,array['application/pdf','image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update set public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

-- Done
