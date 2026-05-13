-- =========================================
-- ELOINVESTOR V23 CLEAN REBUILD LEGACY-SAFE PATCH
-- Run this before using the latest clean build.
-- It upgrades old tables without dropping user data.
-- =========================================

create extension if not exists "pgcrypto";

-- Notifications legacy-safe schema
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
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
alter table public.notifications add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.notifications add column if not exists is_read boolean default false;
alter table public.notifications add column if not exists read_at timestamptz;
alter table public.notifications add column if not exists created_at timestamptz default now();

update public.notifications
set body = coalesce(body, content), title = coalesce(title, 'إشعار')
where body is null or title is null;

-- Admin/role columns
alter table public.users add column if not exists auth_id uuid;
alter table public.users add column if not exists role text default 'user';
alter table public.users add column if not exists account_type text default 'investor';
alter table public.users add column if not exists is_admin boolean default false;
alter table public.users add column if not exists admin_role text;
alter table public.users add column if not exists admin_status text default 'inactive';
alter table public.users add column if not exists admin_permissions jsonb default '[]'::jsonb;
alter table public.users add column if not exists subscription_status text default 'free';
alter table public.users add column if not exists preferred_categories text[] default '{}';
alter table public.users add column if not exists preferred_location text;
alter table public.users add column if not exists budget_min numeric default 0;
alter table public.users add column if not exists budget_max numeric default 0;

update public.users
set is_admin=false, admin_role=null, admin_permissions='[]'::jsonb, admin_status='inactive'
where lower(email) <> lower('na8061104@gmail.com');

update public.users
set role='super_admin', account_type='both', is_admin=true, admin_role='super_admin', admin_status='active', admin_permissions='["all"]'::jsonb
where lower(email)=lower('na8061104@gmail.com');

-- Projects legacy-safe columns
alter table public.projects add column if not exists country_code text default 'om';
alter table public.projects add column if not exists status text default 'pending';
alter table public.projects add column if not exists category text;
alter table public.projects add column if not exists city text;
alter table public.projects add column if not exists price numeric default 0;
alter table public.projects add column if not exists roi numeric default 0;
alter table public.projects add column if not exists is_sponsored boolean default false;
alter table public.projects add column if not exists sponsored boolean default false;
alter table public.projects add column if not exists sponsor_weight int default 0;
alter table public.projects add column if not exists sponsored_until timestamptz;
alter table public.projects add column if not exists saves_count int default 0;
alter table public.projects add column if not exists ctr numeric default 0;
alter table public.projects add column if not exists search_vector tsvector;

-- Analytics/events/campaigns
create table if not exists public.analytics_events (id uuid primary key default gen_random_uuid(), created_at timestamptz default now());
alter table public.analytics_events add column if not exists user_auth_id uuid;
alter table public.analytics_events add column if not exists session_id text;
alter table public.analytics_events add column if not exists event_type text default 'event';
alter table public.analytics_events add column if not exists entity_type text;
alter table public.analytics_events add column if not exists entity_id uuid;
alter table public.analytics_events add column if not exists country_code text default 'om';
alter table public.analytics_events add column if not exists placement text;
alter table public.analytics_events add column if not exists metadata jsonb default '{}'::jsonb;

create table if not exists public.ad_campaigns (id uuid primary key default gen_random_uuid(), created_at timestamptz default now());
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

-- Recommendation/upload tables
create table if not exists public.recommendation_events (
  id uuid primary key default gen_random_uuid(), user_auth_id uuid, project_id uuid, event_type text default 'view', weight numeric default 1, created_at timestamptz default now()
);

create table if not exists public.user_recommendation_cache (
  id uuid primary key default gen_random_uuid(), user_auth_id uuid not null, project_id uuid not null, score numeric default 0, reasons jsonb default '[]'::jsonb,
  expires_at timestamptz default now() + interval '12 hours', created_at timestamptz default now(), unique(user_auth_id, project_id)
);

create table if not exists public.upload_assets (
  id uuid primary key default gen_random_uuid(), user_auth_id uuid, project_id uuid, bucket text, path text, public_url text, mime_type text,
  size_bytes bigint, width int, height int, sort_order int default 100, is_cover boolean default false, created_at timestamptz default now()
);

-- Safe indexes
create index if not exists idx_notifications_entity on public.notifications(entity_type, entity_id);
create index if not exists idx_notifications_target_user on public.notifications(target_user_id);
create index if not exists idx_notifications_unread on public.notifications(target_user_id, is_read);
create index if not exists idx_notifications_user_auth on public.notifications(user_auth_id);
create index if not exists idx_analytics_events_type_date on public.analytics_events(event_type, created_at desc);
create index if not exists idx_analytics_events_entity on public.analytics_events(entity_type, entity_id, created_at desc);
create index if not exists idx_ad_campaigns_active on public.ad_campaigns(is_active, country_code, placement);
create index if not exists idx_recommendation_events_user_project on public.recommendation_events(user_auth_id, project_id, created_at desc);
create index if not exists idx_upload_assets_project on public.upload_assets(project_id, sort_order);

-- Admin analytics RPC
create or replace function public.admin_get_launch_analytics()
returns table(metric text, value bigint)
language sql security definer
as $$
  select 'views', count(*)::bigint from public.analytics_events where event_type='project_view'
  union all select 'saves', count(*)::bigint from public.investor_saved_projects
  union all select 'contacts', count(*)::bigint from public.investor_contacted_projects
  union all select 'notifications_unread', count(*)::bigint from public.notifications where coalesce(is_read,false)=false and read_at is null
  union all select 'sponsored_campaigns', count(*)::bigint from public.ad_campaigns where is_active=true;
$$;
grant execute on function public.admin_get_launch_analytics() to authenticated;

-- Unread notifications RPC
create or replace function public.get_unread_notifications_count(uid uuid)
returns bigint
language sql security definer
as $$
  select count(*)::bigint from public.notifications
  where (user_auth_id=uid or user_id=uid or target_user_id=uid)
    and coalesce(is_read,false)=false and read_at is null;
$$;
grant execute on function public.get_unread_notifications_count(uuid) to authenticated;

-- Sample admin notification
insert into public.notifications(user_auth_id,title,body,type,link_url)
select auth_id,'v23 clean جاهزة','تم تثبيت نسخة نظيفة بدون أخطاء Realtime ومع ترقيع آمن للجداول القديمة.','system','/om/ar/dashboard'
from public.users where lower(email)=lower('na8061104@gmail.com') and auth_id is not null
on conflict do nothing;
