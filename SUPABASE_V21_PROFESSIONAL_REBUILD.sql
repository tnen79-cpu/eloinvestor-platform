-- =============================================================
-- ELOINVESTOR V21 PROFESSIONAL REBUILD
-- Safe migration for Supabase / PostgreSQL
-- Run this file once from Supabase SQL Editor using RUN, not EXPLAIN.
-- =============================================================

create extension if not exists "pgcrypto";

-- -----------------------------
-- 1) USERS / ADMIN FOUNDATION
-- -----------------------------
alter table if exists users add column if not exists auth_id uuid;
alter table if exists users add column if not exists email text;
alter table if exists users add column if not exists name text;
alter table if exists users add column if not exists phone text;
alter table if exists users add column if not exists whatsapp text;
alter table if exists users add column if not exists account_type text default 'investor';
alter table if exists users add column if not exists role text default 'user';
alter table if exists users add column if not exists subscription_status text default 'free';
alter table if exists users add column if not exists plan text default 'free';
alter table if exists users add column if not exists is_blocked boolean default false;
alter table if exists users add column if not exists is_verified boolean default false;
alter table if exists users add column if not exists verification_status text default 'unverified';
alter table if exists users add column if not exists trust_score numeric default 0;
alter table if exists users add column if not exists budget_min numeric default 0;
alter table if exists users add column if not exists budget_max numeric default 0;
alter table if exists users add column if not exists preferred_location text;
alter table if exists users add column if not exists preferred_categories text[] default '{}'::text[];
alter table if exists users add column if not exists investor_preferences jsonb default '{}'::jsonb;
alter table if exists users add column if not exists is_admin boolean default false;
alter table if exists users add column if not exists admin_role text;
alter table if exists users add column if not exists admin_permissions jsonb default '{}'::jsonb;
alter table if exists users add column if not exists admin_status text default 'inactive';
alter table if exists users add column if not exists created_at timestamptz default now();
alter table if exists users add column if not exists updated_at timestamptz default now();

alter table users alter column is_admin set default false;
alter table users alter column admin_role drop default;
alter table users alter column admin_status set default 'inactive';
alter table users alter column admin_permissions set default '{}'::jsonb;

-- keep admin only for intentionally marked admin accounts
update users
set is_admin = false, admin_role = null, admin_permissions = '{}'::jsonb, admin_status = 'inactive'
where coalesce(is_admin, false) = false
  and coalesce(role, 'user') not in ('admin', 'super_admin');

-- Your super admin account
update users
set role = 'super_admin', account_type = 'both', is_admin = true, admin_role = 'super_admin', admin_permissions = '{"all":true}'::jsonb, admin_status = 'active'
where lower(email) = lower('na8061104@gmail.com');

create index if not exists idx_users_auth_id on users(auth_id);
create index if not exists idx_users_email_lower on users(lower(email));
create index if not exists idx_users_admin on users(is_admin, admin_role, admin_status);

-- Safe admin checker. Security definer avoids users-policy recursion.
create or replace function public.is_platform_admin(check_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.auth_id = check_uid
      and coalesce(u.is_admin, false) = true
      and coalesce(u.admin_status, 'active') not in ('inactive', 'revoked', 'suspended')
      and (u.admin_role in ('admin','super_admin','verification_admin','content_admin','finance_admin','support_admin') or u.role in ('admin','super_admin'))
  );
$$;

revoke all on function public.is_platform_admin(uuid) from public;
grant execute on function public.is_platform_admin(uuid) to authenticated;

-- RLS for users without recursion
alter table users enable row level security;
drop policy if exists "users_select_own_or_admin" on users;
drop policy if exists "users_update_own" on users;
drop policy if exists "users_admin_update" on users;

create policy "users_select_own_or_admin"
on users for select
to authenticated
using (auth.uid() = auth_id or public.is_platform_admin(auth.uid()));

create policy "users_update_own"
on users for update
to authenticated
using (auth.uid() = auth_id)
with check (auth.uid() = auth_id);

create policy "users_admin_update"
on users for update
to authenticated
using (public.is_platform_admin(auth.uid()))
with check (public.is_platform_admin(auth.uid()));

-- Admin RPCs
create or replace function public.admin_get_my_profile()
returns setof users
language sql
security definer
set search_path = public
as $$
  select * from public.users where auth_id = auth.uid() limit 1;
$$;

grant execute on function public.admin_get_my_profile() to authenticated;

create or replace function public.admin_list_users(search_text text default null, result_limit int default 500)
returns setof users
language sql
security definer
set search_path = public
as $$
  select *
  from public.users u
  where public.is_platform_admin(auth.uid())
    and (
      search_text is null or search_text = ''
      or lower(coalesce(u.email,'')) like '%' || lower(search_text) || '%'
      or lower(coalesce(u.name,'')) like '%' || lower(search_text) || '%'
      or lower(coalesce(u.phone,'')) like '%' || lower(search_text) || '%'
    )
  order by u.created_at desc nulls last
  limit greatest(1, least(coalesce(result_limit, 500), 1000));
$$;

grant execute on function public.admin_list_users(text, int) to authenticated;

create or replace function public.admin_list_admin_users()
returns setof users
language sql
security definer
set search_path = public
as $$
  select * from public.users u
  where public.is_platform_admin(auth.uid())
    and coalesce(u.is_admin,false) = true
    and coalesce(u.admin_status,'active') not in ('revoked','inactive')
  order by u.created_at desc nulls last;
$$;

grant execute on function public.admin_list_admin_users() to authenticated;

-- -----------------------------
-- 2) PROJECTS + VISIBILITY
-- -----------------------------
alter table if exists projects add column if not exists slug text;
alter table if exists projects add column if not exists status text default 'pending';
alter table if exists projects add column if not exists moderation_status text default 'pending';
alter table if exists projects add column if not exists verification_status text default 'none';
alter table if exists projects add column if not exists is_verified boolean default false;
alter table if exists projects add column if not exists is_featured boolean default false;
alter table if exists projects add column if not exists is_sponsored boolean default false;
alter table if exists projects add column if not exists featured_until timestamptz;
alter table if exists projects add column if not exists sponsored_until timestamptz;
alter table if exists projects add column if not exists views_count integer default 0;
alter table if exists projects add column if not exists contacts_count integer default 0;
alter table if exists projects add column if not exists saves_count integer default 0;
alter table if exists projects add column if not exists owner_auth_id uuid;
alter table if exists projects add column if not exists user_auth_id uuid;
alter table if exists projects add column if not exists country_code text default 'om';
alter table if exists projects add column if not exists updated_at timestamptz default now();

create index if not exists idx_projects_status_country on projects(status, country_code);
create index if not exists idx_projects_owner on projects(owner_auth_id, user_auth_id);
create index if not exists idx_projects_slug on projects(slug);

alter table projects enable row level security;
drop policy if exists "projects_public_approved" on projects;
drop policy if exists "projects_owner_select" on projects;
drop policy if exists "projects_owner_insert" on projects;
drop policy if exists "projects_owner_update" on projects;
drop policy if exists "projects_admin_all" on projects;

create policy "projects_public_approved"
on projects for select
to anon, authenticated
using (status in ('approved','active','published') and coalesce(status,'') <> 'rejected');

create policy "projects_owner_select"
on projects for select
to authenticated
using (auth.uid() = owner_auth_id or auth.uid() = user_auth_id or auth.uid() = created_by or public.is_platform_admin(auth.uid()));

create policy "projects_owner_insert"
on projects for insert
to authenticated
with check (auth.uid() = owner_auth_id or auth.uid() = user_auth_id or public.is_platform_admin(auth.uid()));

create policy "projects_owner_update"
on projects for update
to authenticated
using (auth.uid() = owner_auth_id or auth.uid() = user_auth_id or public.is_platform_admin(auth.uid()))
with check (auth.uid() = owner_auth_id or auth.uid() = user_auth_id or public.is_platform_admin(auth.uid()));

create policy "projects_admin_all"
on projects for all
to authenticated
using (public.is_platform_admin(auth.uid()))
with check (public.is_platform_admin(auth.uid()));

-- Project images
create table if not exists project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  image_url text,
  url text,
  path text,
  is_cover boolean default false,
  sort_order int default 100,
  created_at timestamptz default now()
);
create index if not exists idx_project_images_project on project_images(project_id, sort_order);
alter table project_images enable row level security;
drop policy if exists "project_images_public" on project_images;
drop policy if exists "project_images_admin_all" on project_images;
create policy "project_images_public" on project_images for select to anon, authenticated using (true);
create policy "project_images_admin_all" on project_images for all to authenticated using (public.is_platform_admin(auth.uid())) with check (public.is_platform_admin(auth.uid()));

-- -----------------------------
-- 3) SAVED / CONTACTED / CHAT
-- -----------------------------
create table if not exists investor_saved_projects (
  id uuid primary key default gen_random_uuid(),
  investor_auth_id uuid not null,
  project_id uuid not null,
  project_snapshot jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(investor_auth_id, project_id)
);
alter table investor_saved_projects enable row level security;
drop policy if exists "saved_select_own" on investor_saved_projects;
drop policy if exists "saved_insert_own" on investor_saved_projects;
drop policy if exists "saved_delete_own" on investor_saved_projects;
drop policy if exists "saved_admin" on investor_saved_projects;
create policy "saved_select_own" on investor_saved_projects for select to authenticated using (auth.uid() = investor_auth_id or public.is_platform_admin(auth.uid()));
create policy "saved_insert_own" on investor_saved_projects for insert to authenticated with check (auth.uid() = investor_auth_id);
create policy "saved_delete_own" on investor_saved_projects for delete to authenticated using (auth.uid() = investor_auth_id or public.is_platform_admin(auth.uid()));
create policy "saved_admin" on investor_saved_projects for all to authenticated using (public.is_platform_admin(auth.uid())) with check (public.is_platform_admin(auth.uid()));

create table if not exists investor_contacted_projects (
  id uuid primary key default gen_random_uuid(),
  investor_auth_id uuid not null,
  project_id uuid not null,
  project_snapshot jsonb default '{}'::jsonb,
  conversation_id uuid,
  created_at timestamptz default now(),
  unique(investor_auth_id, project_id)
);
alter table investor_contacted_projects enable row level security;
drop policy if exists "contacted_select_own" on investor_contacted_projects;
drop policy if exists "contacted_insert_own" on investor_contacted_projects;
drop policy if exists "contacted_admin" on investor_contacted_projects;
create policy "contacted_select_own" on investor_contacted_projects for select to authenticated using (auth.uid() = investor_auth_id or public.is_platform_admin(auth.uid()));
create policy "contacted_insert_own" on investor_contacted_projects for insert to authenticated with check (auth.uid() = investor_auth_id);
create policy "contacted_admin" on investor_contacted_projects for all to authenticated using (public.is_platform_admin(auth.uid())) with check (public.is_platform_admin(auth.uid()));

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  buyer_id uuid,
  investor_id uuid,
  owner_id uuid,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table conversations add column if not exists buyer_id uuid;
alter table conversations add column if not exists investor_id uuid;
alter table conversations add column if not exists owner_id uuid;
alter table conversations add column if not exists last_message text;
alter table conversations add column if not exists last_message_at timestamptz;
alter table conversations enable row level security;
drop policy if exists "conversations_users" on conversations;
drop policy if exists "conversations_insert" on conversations;
drop policy if exists "conversations_admin" on conversations;
create policy "conversations_users" on conversations for select to authenticated using (auth.uid() = investor_id or auth.uid() = buyer_id or auth.uid() = owner_id or public.is_platform_admin(auth.uid()));
create policy "conversations_insert" on conversations for insert to authenticated with check (auth.uid() = investor_id or auth.uid() = buyer_id or public.is_platform_admin(auth.uid()));
create policy "conversations_admin" on conversations for all to authenticated using (public.is_platform_admin(auth.uid())) with check (public.is_platform_admin(auth.uid()));

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid,
  sender_id uuid not null,
  body text,
  read_at timestamptz,
  created_at timestamptz default now()
);
alter table messages enable row level security;
drop policy if exists "messages_users" on messages;
drop policy if exists "messages_insert" on messages;
drop policy if exists "messages_admin" on messages;
create policy "messages_users" on messages for select to authenticated using (
  public.is_platform_admin(auth.uid()) or exists (
    select 1 from conversations c where c.id = messages.conversation_id and (c.investor_id = auth.uid() or c.buyer_id = auth.uid() or c.owner_id = auth.uid())
  )
);
create policy "messages_insert" on messages for insert to authenticated with check (auth.uid() = sender_id);
create policy "messages_admin" on messages for all to authenticated using (public.is_platform_admin(auth.uid())) with check (public.is_platform_admin(auth.uid()));

-- -----------------------------
-- 4) VERIFICATION / PACKAGES / ADS / SLIDER
-- -----------------------------
create table if not exists verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid not null,
  project_id uuid,
  request_type text default 'project',
  status text default 'pending',
  document_url text,
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table verification_requests enable row level security;
drop policy if exists "verification_own_or_admin" on verification_requests;
drop policy if exists "verification_insert_own" on verification_requests;
drop policy if exists "verification_admin_all" on verification_requests;
create policy "verification_own_or_admin" on verification_requests for select to authenticated using (auth.uid() = user_auth_id or public.is_platform_admin(auth.uid()));
create policy "verification_insert_own" on verification_requests for insert to authenticated with check (auth.uid() = user_auth_id);
create policy "verification_admin_all" on verification_requests for all to authenticated using (public.is_platform_admin(auth.uid())) with check (public.is_platform_admin(auth.uid()));

create or replace view public.admin_verification_overview as
select
  vr.*,
  coalesce(p.title_ar, p.title, p.project_title, p.name_ar, 'مشروع بدون عنوان') as project_name,
  coalesce(u.name, u.email, 'مستخدم') as user_name,
  u.email as user_email
from verification_requests vr
left join projects p on p.id = vr.project_id
left join users u on u.auth_id = vr.user_auth_id;

create table if not exists subscription_packages (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text,
  name_en text,
  package_type text default 'investor',
  price numeric default 0,
  currency text default 'OMR',
  recommendation_limit int default 3,
  project_limit int default 1,
  verification_included boolean default false,
  featured_included boolean default false,
  is_active boolean default true,
  sort_order int default 100,
  created_at timestamptz default now()
);

create table if not exists subscription_requests (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  package_code text,
  package_type text,
  status text default 'pending',
  payment_reference text,
  admin_note text,
  created_at timestamptz default now()
);

create table if not exists platform_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);
insert into platform_settings(key, value) values ('homepage_slider_enabled', 'true') on conflict (key) do nothing;

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
  slide_order int default 100,
  created_at timestamptz default now()
);

create table if not exists platform_ads (
  id uuid primary key default gen_random_uuid(),
  title text,
  placement text default 'home_top',
  image_url text,
  link_url text,
  country_code text default 'om',
  is_active boolean default true,
  sort_order int default 100,
  impressions int default 0,
  clicks int default 0,
  created_at timestamptz default now()
);

-- -----------------------------
-- 5) NOTIFICATIONS / REPORTS / RATINGS / LOGS / ANALYTICS
-- -----------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  title text,
  body text,
  type text default 'system',
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_auth_id uuid,
  target_type text,
  target_id uuid,
  project_id uuid,
  reported_user_auth_id uuid,
  reason text,
  description text,
  status text default 'open',
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  reviewer_auth_id uuid,
  reviewed_auth_id uuid,
  project_id uuid,
  rating int,
  comment text,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  admin_auth_id uuid,
  action text not null,
  target_type text,
  target_id text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists project_views_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  viewer_id uuid,
  created_at timestamptz default now()
);

create or replace function public.admin_get_reports()
returns setof reports language sql security definer set search_path = public as $$
  select * from reports where public.is_platform_admin(auth.uid()) order by created_at desc nulls last;
$$;
grant execute on function public.admin_get_reports() to authenticated;

create or replace function public.admin_get_ratings()
returns setof ratings language sql security definer set search_path = public as $$
  select * from ratings where public.is_platform_admin(auth.uid()) order by created_at desc nulls last;
$$;
grant execute on function public.admin_get_ratings() to authenticated;

create or replace function public.admin_get_logs()
returns setof admin_action_logs language sql security definer set search_path = public as $$
  select * from admin_action_logs where public.is_platform_admin(auth.uid()) order by created_at desc nulls last limit 500;
$$;
grant execute on function public.admin_get_logs() to authenticated;

create or replace function public.admin_get_users()
returns setof users language sql security definer set search_path = public as $$
  select * from users where public.is_platform_admin(auth.uid()) order by created_at desc nulls last limit 500;
$$;
grant execute on function public.admin_get_users() to authenticated;

-- Default packages
insert into subscription_packages(code, name_ar, name_en, package_type, price, currency, recommendation_limit, project_limit, verification_included, featured_included, is_active, sort_order)
values
('investor_free','مستثمر مجاني','Investor Free','investor',0,'OMR',3,0,false,false,true,10),
('investor_pro','مستثمر Pro','Investor Pro','investor',9,'OMR',25,0,false,false,true,20),
('investor_elite','مستثمر Elite','Investor Elite','investor',19,'OMR',999,0,false,false,true,30),
('owner_starter','صاحب مشروع Starter','Owner Starter','owner',0,'OMR',0,1,false,false,true,40),
('owner_business','صاحب مشروع Business','Owner Business','owner',15,'OMR',0,5,true,true,true,50)
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
  sort_order = excluded.sort_order;

-- Storage bucket for verification docs
insert into storage.buckets (id, name, public)
values ('verification-docs', 'verification-docs', true)
on conflict (id) do nothing;

drop policy if exists "verification_storage_select" on storage.objects;
drop policy if exists "verification_storage_insert" on storage.objects;
create policy "verification_storage_select" on storage.objects for select to public using (bucket_id = 'verification-docs');
create policy "verification_storage_insert" on storage.objects for insert to authenticated with check (bucket_id = 'verification-docs');

-- Final sanity check
select 'v21 professional rebuild migration completed' as status;
