-- v50 Trust Systems Final: verification + ratings + reports
-- Safe with older database structures as much as possible.

create extension if not exists pgcrypto;

-- =========================
-- STORAGE BUCKETS
-- =========================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('verification-files', 'verification-files', true, 10485760, array['application/pdf','image/png','image/jpeg','image/webp']),
  ('project-documents', 'project-documents', true, 10485760, array['application/pdf','image/png','image/jpeg','image/webp']),
  ('avatars', 'avatars', true, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = excluded.public;

-- =========================
-- VERIFICATION REQUESTS
-- =========================
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_auth_id text not null,
  request_type text not null default 'investor',
  type text,
  project_id text,
  project_title text,
  status text not null default 'pending',
  document_url text,
  file_url text,
  document_type text,
  note text,
  notes text,
  admin_note text,
  country_code text default 'om',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.verification_requests add column if not exists id uuid default gen_random_uuid();
alter table public.verification_requests add column if not exists user_auth_id text;
alter table public.verification_requests add column if not exists request_type text default 'investor';
alter table public.verification_requests add column if not exists type text;
alter table public.verification_requests add column if not exists project_id text;
alter table public.verification_requests add column if not exists project_title text;
alter table public.verification_requests add column if not exists status text default 'pending';
alter table public.verification_requests add column if not exists document_url text;
alter table public.verification_requests add column if not exists file_url text;
alter table public.verification_requests add column if not exists document_type text;
alter table public.verification_requests add column if not exists note text;
alter table public.verification_requests add column if not exists notes text;
alter table public.verification_requests add column if not exists admin_note text;
alter table public.verification_requests add column if not exists country_code text default 'om';
alter table public.verification_requests add column if not exists reviewed_by text;
alter table public.verification_requests add column if not exists reviewed_at timestamptz;
alter table public.verification_requests add column if not exists created_at timestamptz default now();
alter table public.verification_requests add column if not exists updated_at timestamptz default now();

update public.verification_requests set request_type = coalesce(request_type, type, 'investor') where request_type is null;
update public.verification_requests set type = coalesce(type, request_type, 'investor') where type is null;
update public.verification_requests set status = coalesce(status, 'pending') where status is null;

-- Projects/users compatibility for badges
alter table public.projects add column if not exists is_verified boolean default false;
alter table public.projects add column if not exists verified boolean default false;
alter table public.projects add column if not exists verification_status text default 'pending';
alter table public.users add column if not exists is_verified boolean default false;
alter table public.users add column if not exists verification_status text default 'pending';
alter table public.users add column if not exists is_blocked boolean default false;

-- =========================
-- REPORTS
-- =========================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_auth_id text not null,
  target_type text not null default 'project',
  target_id text not null,
  project_id text,
  reported_user_auth_id text,
  reason text not null default 'other',
  description text,
  status text not null default 'open',
  admin_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.reports add column if not exists id uuid default gen_random_uuid();
alter table public.reports add column if not exists reporter_auth_id text;
alter table public.reports add column if not exists target_type text default 'project';
alter table public.reports add column if not exists target_id text;
alter table public.reports add column if not exists project_id text;
alter table public.reports add column if not exists reported_user_auth_id text;
alter table public.reports add column if not exists reason text default 'other';
alter table public.reports add column if not exists description text;
alter table public.reports add column if not exists status text default 'open';
alter table public.reports add column if not exists admin_note text;
alter table public.reports add column if not exists reviewed_by text;
alter table public.reports add column if not exists reviewed_at timestamptz;
alter table public.reports add column if not exists created_at timestamptz default now();
alter table public.reports add column if not exists updated_at timestamptz default now();

update public.reports set status = coalesce(status, 'open') where status is null;
update public.reports set reason = coalesce(reason, 'other') where reason is null;

-- =========================
-- RATINGS
-- =========================
create table if not exists public.deal_ratings (
  id uuid primary key default gen_random_uuid(),
  reviewer_auth_id text not null,
  reviewed_auth_id text,
  project_id text not null,
  rating numeric not null default 5 check (rating >= 1 and rating <= 5),
  comment text,
  status text not null default 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.deal_ratings add column if not exists id uuid default gen_random_uuid();
alter table public.deal_ratings add column if not exists reviewer_auth_id text;
alter table public.deal_ratings add column if not exists reviewed_auth_id text;
alter table public.deal_ratings add column if not exists project_id text;
alter table public.deal_ratings add column if not exists rating numeric default 5;
alter table public.deal_ratings add column if not exists comment text;
alter table public.deal_ratings add column if not exists status text default 'pending';
alter table public.deal_ratings add column if not exists reviewed_by text;
alter table public.deal_ratings add column if not exists reviewed_at timestamptz;
alter table public.deal_ratings add column if not exists created_at timestamptz default now();
alter table public.deal_ratings add column if not exists updated_at timestamptz default now();

update public.deal_ratings set status = coalesce(status, 'pending') where status is null;
update public.deal_ratings set rating = 5 where rating is null;

-- Contact log required for rating eligibility
create table if not exists public.investor_contacted_projects (
  id uuid primary key default gen_random_uuid(),
  investor_auth_id text not null,
  project_id text not null,
  contact_type text default 'contact',
  created_at timestamptz default now()
);
alter table public.investor_contacted_projects add column if not exists investor_auth_id text;
alter table public.investor_contacted_projects add column if not exists project_id text;
alter table public.investor_contacted_projects add column if not exists contact_type text default 'contact';
alter table public.investor_contacted_projects add column if not exists created_at timestamptz default now();

-- =========================
-- ADMIN HELPER RPCS
-- =========================
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where (u.auth_id = auth.uid()::text or u.id::text = auth.uid()::text)
      and (
        coalesce(u.is_admin, false) = true
        or lower(coalesce(u.role, '')) in ('admin','super_admin','owner','manager')
        or lower(coalesce(u.account_type, '')) in ('admin','super_admin','owner','manager')
      )
  );
$$;

create or replace function public.admin_get_reports()
returns setof public.reports
language sql
security definer
set search_path = public
as $$
  select * from public.reports order by created_at desc limit 500;
$$;

create or replace function public.admin_get_ratings()
returns setof public.deal_ratings
language sql
security definer
set search_path = public
as $$
  select * from public.deal_ratings order by created_at desc limit 500;
$$;

-- =========================
-- INDEXES
-- =========================
create index if not exists idx_verification_requests_user on public.verification_requests(user_auth_id);
create index if not exists idx_verification_requests_status on public.verification_requests(status);
create index if not exists idx_verification_requests_project on public.verification_requests(project_id);
create index if not exists idx_reports_status on public.reports(status);
create index if not exists idx_reports_reporter on public.reports(reporter_auth_id);
create index if not exists idx_reports_project on public.reports(project_id);
create index if not exists idx_deal_ratings_status on public.deal_ratings(status);
create index if not exists idx_deal_ratings_project on public.deal_ratings(project_id);
create index if not exists idx_contacted_project_user on public.investor_contacted_projects(investor_auth_id, project_id);

-- =========================
-- RLS POLICIES
-- =========================
alter table public.verification_requests enable row level security;
alter table public.reports enable row level security;
alter table public.deal_ratings enable row level security;
alter table public.investor_contacted_projects enable row level security;

do $$
begin
  drop policy if exists verification_user_insert on public.verification_requests;
  drop policy if exists verification_user_select_own on public.verification_requests;
  drop policy if exists verification_admin_all on public.verification_requests;
  drop policy if exists reports_user_insert on public.reports;
  drop policy if exists reports_user_select_own on public.reports;
  drop policy if exists reports_admin_all on public.reports;
  drop policy if exists ratings_user_insert on public.deal_ratings;
  drop policy if exists ratings_public_published on public.deal_ratings;
  drop policy if exists ratings_user_select_own on public.deal_ratings;
  drop policy if exists ratings_admin_all on public.deal_ratings;
  drop policy if exists contacted_user_insert on public.investor_contacted_projects;
  drop policy if exists contacted_user_select_own on public.investor_contacted_projects;
  drop policy if exists contacted_admin_all on public.investor_contacted_projects;
end $$;

create policy verification_user_insert on public.verification_requests
for insert to authenticated
with check (user_auth_id = auth.uid()::text);

create policy verification_user_select_own on public.verification_requests
for select to authenticated
using (user_auth_id = auth.uid()::text or public.is_current_user_admin());

create policy verification_admin_all on public.verification_requests
for all to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

create policy reports_user_insert on public.reports
for insert to authenticated
with check (reporter_auth_id = auth.uid()::text);

create policy reports_user_select_own on public.reports
for select to authenticated
using (reporter_auth_id = auth.uid()::text or public.is_current_user_admin());

create policy reports_admin_all on public.reports
for all to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

create policy ratings_user_insert on public.deal_ratings
for insert to authenticated
with check (reviewer_auth_id = auth.uid()::text);

create policy ratings_public_published on public.deal_ratings
for select to anon, authenticated
using (status = 'published');

create policy ratings_user_select_own on public.deal_ratings
for select to authenticated
using (reviewer_auth_id = auth.uid()::text or reviewed_auth_id = auth.uid()::text or public.is_current_user_admin());

create policy ratings_admin_all on public.deal_ratings
for all to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

create policy contacted_user_insert on public.investor_contacted_projects
for insert to authenticated
with check (investor_auth_id = auth.uid()::text);

create policy contacted_user_select_own on public.investor_contacted_projects
for select to authenticated
using (investor_auth_id = auth.uid()::text or public.is_current_user_admin());

create policy contacted_admin_all on public.investor_contacted_projects
for all to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());
