-- =====================================================
-- ELOINVESTOR V19 PRODUCTION TRUST SYSTEMS
-- Migration-safe SQL for Supabase/PostgreSQL
-- =====================================================

create extension if not exists "pgcrypto";

-- ---------- Admin safety columns ----------
alter table users add column if not exists auth_id uuid;
alter table users add column if not exists is_admin boolean default false;
alter table users add column if not exists admin_role text;
alter table users add column if not exists admin_permissions jsonb default '[]'::jsonb;
alter table users add column if not exists admin_status text default 'inactive';
alter table users add column if not exists status text default 'active';
alter table users add column if not exists is_blocked boolean default false;
alter table users add column if not exists trust_score numeric default 0;
alter table users add column if not exists ratings_count integer default 0;
alter table users add column if not exists average_rating numeric default 0;

alter table users alter column is_admin set default false;
alter table users alter column admin_role drop default;
alter table users alter column admin_status set default 'inactive';
alter table users alter column admin_permissions set default '[]'::jsonb;

-- Keep only selected account as super admin. Change this email if needed.
update users
set role = 'super_admin', account_type = 'both', is_admin = true, admin_role = 'super_admin', admin_permissions = '["all"]'::jsonb, admin_status = 'active', status = 'active', is_blocked = false
where lower(email) = lower('na8061104@gmail.com');

update users
set is_admin = false, admin_role = null, admin_permissions = '[]'::jsonb, admin_status = 'inactive'
where lower(coalesce(email,'')) <> lower('na8061104@gmail.com')
  and coalesce(role,'') not in ('admin','super_admin');

-- ---------- Notifications ----------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  title text not null,
  body text not null,
  type text default 'system',
  link_url text,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table notifications enable row level security;
drop policy if exists "notifications_select_own" on notifications;
create policy "notifications_select_own" on notifications for select to authenticated using (user_auth_id = auth.uid() or user_auth_id is null);
drop policy if exists "notifications_update_own" on notifications;
create policy "notifications_update_own" on notifications for update to authenticated using (user_auth_id = auth.uid()) with check (user_auth_id = auth.uid());
drop policy if exists "notifications_insert_authenticated" on notifications;
create policy "notifications_insert_authenticated" on notifications for insert to authenticated with check (true);
create index if not exists idx_notifications_user_read on notifications(user_auth_id, is_read, created_at desc);

-- ---------- Reports / Moderation ----------
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_auth_id uuid,
  target_type text not null default 'project',
  target_id uuid,
  project_id uuid,
  reported_user_auth_id uuid,
  reason text,
  description text,
  status text default 'open',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

alter table reports enable row level security;
drop policy if exists "reports_insert_own" on reports;
create policy "reports_insert_own" on reports for insert to authenticated with check (reporter_auth_id = auth.uid());
drop policy if exists "reports_select_own" on reports;
create policy "reports_select_own" on reports for select to authenticated using (reporter_auth_id = auth.uid());
create index if not exists idx_reports_status on reports(status, created_at desc);
create index if not exists idx_reports_project on reports(project_id);

-- ---------- Deal ratings / trust score ----------
create table if not exists deal_ratings (
  id uuid primary key default gen_random_uuid(),
  reviewer_auth_id uuid not null,
  reviewed_auth_id uuid,
  project_id uuid,
  rating integer not null check (rating between 1 and 5),
  comment text,
  status text default 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  unique (reviewer_auth_id, reviewed_auth_id, project_id)
);

alter table deal_ratings enable row level security;
drop policy if exists "ratings_insert_own" on deal_ratings;
create policy "ratings_insert_own" on deal_ratings for insert to authenticated with check (reviewer_auth_id = auth.uid());
drop policy if exists "ratings_select_published_or_own" on deal_ratings;
create policy "ratings_select_published_or_own" on deal_ratings for select to authenticated using (status = 'published' or reviewer_auth_id = auth.uid() or reviewed_auth_id = auth.uid());
create index if not exists idx_deal_ratings_reviewed on deal_ratings(reviewed_auth_id, status);
create index if not exists idx_deal_ratings_project on deal_ratings(project_id, status);

create or replace function public.recalculate_user_trust(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update users u
  set
    average_rating = coalesce((select round(avg(rating)::numeric, 2) from deal_ratings where reviewed_auth_id = target_user and status = 'published'), 0),
    ratings_count = coalesce((select count(*) from deal_ratings where reviewed_auth_id = target_user and status = 'published'), 0),
    trust_score = coalesce((select round(avg(rating)::numeric * 20, 2) from deal_ratings where reviewed_auth_id = target_user and status = 'published'), 0)
  where u.auth_id = target_user or u.id = target_user;
end;
$$;

grant execute on function public.recalculate_user_trust(uuid) to authenticated;

-- ---------- Analytics events ----------
create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_auth_id uuid,
  project_id uuid,
  country_code text default 'om',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table analytics_events enable row level security;
drop policy if exists "analytics_insert_authenticated" on analytics_events;
create policy "analytics_insert_authenticated" on analytics_events for insert to authenticated with check (true);
create index if not exists idx_analytics_event_type on analytics_events(event_type, created_at desc);
create index if not exists idx_analytics_project on analytics_events(project_id, created_at desc);

-- ---------- Admin logs ----------
create table if not exists admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  admin_auth_id uuid,
  action text not null,
  target_type text,
  target_id text,
  details jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

alter table admin_action_logs enable row level security;
-- Direct select is intentionally not open; dashboard uses SECURITY DEFINER RPCs.

-- ---------- Admin RPC helpers without users recursion ----------
create or replace function public.admin_get_my_profile()
returns setof users
language sql
security definer
set search_path = public
as $$
  select * from users
  where auth_id = auth.uid()
     or id = auth.uid()
     or lower(email) = lower(coalesce((select email from auth.users where id = auth.uid()), ''))
  limit 1;
$$;

grant execute on function public.admin_get_my_profile() to authenticated;

create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from users
    where (auth_id = auth.uid() or id = auth.uid())
      and (is_admin = true or role in ('admin','super_admin') or admin_role in ('admin','super_admin'))
      and coalesce(admin_status,'active') not in ('suspended','revoked')
      and coalesce(is_blocked,false) = false
  );
$$;

grant execute on function public.is_current_user_admin() to authenticated;

create or replace function public.admin_list_users(search_text text default null, result_limit int default 500)
returns setof users
language sql
security definer
set search_path = public
as $$
  select * from users
  where public.is_current_user_admin()
    and (
      search_text is null
      or lower(coalesce(name,'')) like '%' || lower(search_text) || '%'
      or lower(coalesce(full_name,'')) like '%' || lower(search_text) || '%'
      or lower(coalesce(email,'')) like '%' || lower(search_text) || '%'
      or lower(coalesce(phone,'')) like '%' || lower(search_text) || '%'
    )
  order by created_at desc nulls last
  limit greatest(1, least(coalesce(result_limit, 500), 1000));
$$;

grant execute on function public.admin_list_users(text, int) to authenticated;

create or replace function public.admin_update_user(target_auth_id uuid default null, target_email text default null, patch jsonb default '{}'::jsonb)
returns users
language plpgsql
security definer
set search_path = public
as $$
declare updated users;
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access required';
  end if;

  update users
  set
    name = coalesce(patch->>'name', name),
    full_name = coalesce(patch->>'full_name', full_name),
    phone = coalesce(patch->>'phone', phone),
    whatsapp = coalesce(patch->>'whatsapp', whatsapp),
    account_type = coalesce(patch->>'account_type', account_type),
    role = coalesce(patch->>'role', role),
    subscription_status = coalesce(patch->>'subscription_status', subscription_status),
    plan = coalesce(patch->>'plan', plan),
    status = coalesce(patch->>'status', status),
    is_blocked = coalesce((patch->>'is_blocked')::boolean, is_blocked),
    is_admin = coalesce((patch->>'is_admin')::boolean, is_admin),
    admin_role = case when patch ? 'admin_role' then nullif(patch->>'admin_role','') else admin_role end,
    admin_status = coalesce(patch->>'admin_status', admin_status),
    admin_permissions = coalesce(patch->'admin_permissions', admin_permissions)
  where (target_auth_id is not null and (auth_id = target_auth_id or id = target_auth_id))
     or (target_email is not null and lower(email) = lower(target_email))
  returning * into updated;

  if updated.id is null then
    raise exception 'User not found';
  end if;
  return updated;
end;
$$;

grant execute on function public.admin_update_user(uuid, text, jsonb) to authenticated;

create or replace function public.admin_get_reports()
returns setof reports
language sql
security definer
set search_path = public
as $$
  select * from reports where public.is_current_user_admin() order by created_at desc;
$$;

grant execute on function public.admin_get_reports() to authenticated;

create or replace function public.admin_get_ratings()
returns setof deal_ratings
language sql
security definer
set search_path = public
as $$
  select * from deal_ratings where public.is_current_user_admin() order by created_at desc;
$$;

grant execute on function public.admin_get_ratings() to authenticated;

create or replace function public.admin_get_logs()
returns setof admin_action_logs
language sql
security definer
set search_path = public
as $$
  select * from admin_action_logs where public.is_current_user_admin() order by created_at desc;
$$;

grant execute on function public.admin_get_logs() to authenticated;

-- ---------- Public project visibility safety ----------
alter table projects add column if not exists is_active boolean default true;
alter table projects add column if not exists is_featured boolean default false;
alter table projects add column if not exists featured_until timestamptz;
alter table projects add column if not exists is_verified boolean default false;
alter table projects add column if not exists verification_status text default 'none';

update projects set is_active = false where lower(coalesce(status,'')) in ('rejected','declined','hidden','deleted');

-- ---------- Done ----------
select 'V19 production trust systems installed' as status;
