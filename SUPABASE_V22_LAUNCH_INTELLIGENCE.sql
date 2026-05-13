-- =========================================
-- EloInvestor v22 Launch Intelligence
-- Safe migration: notifications, AI scoring, search, ads, countries, analytics, uploads
-- =========================================
create extension if not exists "pgcrypto";

-- Countries / currencies
create table if not exists platform_countries (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text,
  name_en text,
  flag text,
  currency_code text default 'OMR',
  currency_symbol_ar text,
  currency_symbol_en text,
  is_default boolean default false,
  is_active boolean default true,
  sort_order int default 100,
  created_at timestamptz default now()
);
insert into platform_countries(code,name_ar,name_en,flag,currency_code,currency_symbol_ar,currency_symbol_en,is_default,is_active,sort_order) values
('om','عُمان','Oman','🇴🇲','OMR','ر.ع','OMR',true,true,1),
('ae','الإمارات','United Arab Emirates','🇦🇪','AED','د.إ','AED',false,true,2),
('sa','السعودية','Saudi Arabia','🇸🇦','SAR','ر.س','SAR',false,true,3)
on conflict (code) do update set
  name_ar=excluded.name_ar,name_en=excluded.name_en,flag=excluded.flag,currency_code=excluded.currency_code,
  currency_symbol_ar=excluded.currency_symbol_ar,currency_symbol_en=excluded.currency_symbol_en,is_active=true;

-- Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  user_id uuid,
  target_user_id uuid,
  title text not null default 'تنبيه جديد',
  body text,
  type text default 'system',
  link_url text,
  is_read boolean default false,
  read_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_notifications_user_auth on notifications(user_auth_id, created_at desc);
create index if not exists idx_notifications_user_id on notifications(user_id, created_at desc);
create index if not exists idx_notifications_target_user on notifications(target_user_id, created_at desc);
alter table notifications enable row level security;
drop policy if exists "notifications_select_own" on notifications;
create policy "notifications_select_own" on notifications for select to authenticated using (
  auth.uid() = user_auth_id or auth.uid() = user_id or auth.uid() = target_user_id
);
drop policy if exists "notifications_update_own" on notifications;
create policy "notifications_update_own" on notifications for update to authenticated using (
  auth.uid() = user_auth_id or auth.uid() = user_id or auth.uid() = target_user_id
) with check (
  auth.uid() = user_auth_id or auth.uid() = user_id or auth.uid() = target_user_id
);

-- Analytics events foundation
create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  session_id text,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  country_code text default 'om',
  placement text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_analytics_events_type_date on analytics_events(event_type, created_at desc);
create index if not exists idx_analytics_events_entity on analytics_events(entity_type, entity_id, created_at desc);

-- Project monetization/search columns
alter table projects add column if not exists is_sponsored boolean default false;
alter table projects add column if not exists sponsored boolean default false;
alter table projects add column if not exists sponsor_weight int default 0;
alter table projects add column if not exists sponsored_until timestamptz;
alter table projects add column if not exists saves_count int default 0;
alter table projects add column if not exists ctr numeric default 0;
alter table projects add column if not exists search_vector tsvector;
create index if not exists idx_projects_launch_search on projects(country_code, status, category, city, price, roi);
create index if not exists idx_projects_sponsored on projects(is_sponsored, sponsor_weight desc, sponsored_until);

-- Campaign tracking
create table if not exists ad_campaigns (
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
create index if not exists idx_ad_campaigns_active on ad_campaigns(is_active, country_code, placement);

-- Recommendation materialized cache/facts
create table if not exists recommendation_events (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid not null,
  project_id uuid not null,
  event_type text not null,
  weight numeric default 1,
  created_at timestamptz default now()
);
create index if not exists idx_recommendation_events_user_project on recommendation_events(user_auth_id, project_id, created_at desc);

create table if not exists user_recommendation_cache (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid not null,
  project_id uuid not null,
  score numeric default 0,
  reasons jsonb default '[]'::jsonb,
  expires_at timestamptz default now() + interval '12 hours',
  created_at timestamptz default now(),
  unique(user_auth_id, project_id)
);

-- Upload audit/limits
create table if not exists upload_assets (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  project_id uuid,
  bucket text,
  path text,
  public_url text,
  mime_type text,
  size_bytes bigint,
  width int,
  height int,
  sort_order int default 100,
  is_cover boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_upload_assets_project on upload_assets(project_id, sort_order);

-- Public admin-safe analytics RPC
create or replace function public.admin_get_launch_analytics()
returns table(metric text, value bigint)
language sql security definer
as $$
  select 'views', count(*)::bigint from analytics_events where event_type='project_view'
  union all select 'saves', count(*)::bigint from investor_saved_projects
  union all select 'contacts', count(*)::bigint from investor_contacted_projects
  union all select 'notifications_unread', count(*)::bigint from notifications where coalesce(is_read,false)=false and read_at is null
  union all select 'sponsored_campaigns', count(*)::bigint from ad_campaigns where is_active=true;
$$;
grant execute on function public.admin_get_launch_analytics() to authenticated;

-- Helper RPC for user notifications badge
create or replace function public.get_unread_notifications_count(uid uuid)
returns bigint
language sql security definer
as $$
  select count(*)::bigint from notifications
  where (user_auth_id=uid or user_id=uid or target_user_id=uid)
    and coalesce(is_read,false)=false and read_at is null;
$$;
grant execute on function public.get_unread_notifications_count(uuid) to authenticated;

-- Storage buckets
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('project-images','project-images',true,5242880,array['image/jpeg','image/png','image/webp']::text[]),
('verification-docs','verification-docs',true,10485760,array['application/pdf','image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update set public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

-- Optional sample notifications for your super admin account
insert into notifications(user_auth_id,title,body,type,link_url)
select auth_id,'v22 جاهزة','تم تفعيل نظام الإشعارات والتوصيات والبحث المتقدم.','system','/om/ar/dashboard'
from users where lower(email)=lower('na8061104@gmail.com') and auth_id is not null
on conflict do nothing;
