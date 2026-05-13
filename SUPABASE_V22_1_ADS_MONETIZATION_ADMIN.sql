-- =========================================
-- EloInvestor v22.1 Ads & Monetization Admin
-- Adds admin-controlled campaigns, sponsored projects, and safe legacy patches
-- =========================================

create extension if not exists "pgcrypto";

-- Project sponsorship columns
alter table public.projects add column if not exists is_sponsored boolean default false;
alter table public.projects add column if not exists sponsored boolean default false;
alter table public.projects add column if not exists sponsor_weight int default 0;
alter table public.projects add column if not exists sponsored_until timestamptz;
alter table public.projects add column if not exists is_featured boolean default false;
alter table public.projects add column if not exists featured_until timestamptz;

-- Public ads / banners
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

alter table public.platform_ads add column if not exists title text;
alter table public.platform_ads add column if not exists placement text default 'home_top';
alter table public.platform_ads add column if not exists image_url text;
alter table public.platform_ads add column if not exists link_url text;
alter table public.platform_ads add column if not exists country_code text default 'om';
alter table public.platform_ads add column if not exists is_active boolean default true;
alter table public.platform_ads add column if not exists sort_order int default 100;
alter table public.platform_ads add column if not exists created_at timestamptz default now();

-- Campaign tracking / sponsored project campaigns
create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Campaign',
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

alter table public.ad_campaigns add column if not exists title text default 'Campaign';
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
alter table public.ad_campaigns add column if not exists created_at timestamptz default now();

-- Helpful indexes
create index if not exists idx_platform_ads_active_place on public.platform_ads(is_active, country_code, placement, sort_order);
create index if not exists idx_ad_campaigns_active_place on public.ad_campaigns(is_active, country_code, placement);
create index if not exists idx_ad_campaigns_entity on public.ad_campaigns(entity_type, entity_id);
create index if not exists idx_projects_sponsored_active on public.projects(is_sponsored, sponsor_weight desc, sponsored_until);

-- RLS policies: read public, writes require authenticated; app/admin guard still checks admin role.
alter table public.platform_ads enable row level security;
drop policy if exists "platform_ads_public_read" on public.platform_ads;
create policy "platform_ads_public_read" on public.platform_ads for select to anon, authenticated using (true);
drop policy if exists "platform_ads_auth_write" on public.platform_ads;
create policy "platform_ads_auth_write" on public.platform_ads for all to authenticated using (true) with check (true);

alter table public.ad_campaigns enable row level security;
drop policy if exists "ad_campaigns_auth_read" on public.ad_campaigns;
create policy "ad_campaigns_auth_read" on public.ad_campaigns for select to authenticated using (true);
drop policy if exists "ad_campaigns_auth_write" on public.ad_campaigns;
create policy "ad_campaigns_auth_write" on public.ad_campaigns for all to authenticated using (true) with check (true);

-- Optional admin analytics for campaigns
create or replace function public.admin_get_ads_summary()
returns table(metric text, value bigint)
language sql security definer
as $$
  select 'active_banners', count(*)::bigint from public.platform_ads where coalesce(is_active,true)=true
  union all select 'active_campaigns', count(*)::bigint from public.ad_campaigns where coalesce(is_active,true)=true
  union all select 'sponsored_projects', count(*)::bigint from public.projects where coalesce(is_sponsored,false)=true or coalesce(sponsored,false)=true;
$$;
grant execute on function public.admin_get_ads_summary() to authenticated;
