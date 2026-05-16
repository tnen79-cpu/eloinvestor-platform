-- =========================================================
-- EloInvestor v34.3 Project Details: Q&A, Map, Promotion
-- Safe migration for legacy Supabase schemas
-- =========================================================

create extension if not exists "pgcrypto";

-- Project coordinates for map display
alter table public.projects add column if not exists map_lat numeric;
alter table public.projects add column if not exists map_lng numeric;
alter table public.projects add column if not exists latitude numeric;
alter table public.projects add column if not exists longitude numeric;
alter table public.projects add column if not exists map_url text;

-- Project documents table used by Add Project + Details + Admin
create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  user_auth_id uuid,
  document_type text default 'other',
  title text,
  file_name text,
  public_url text,
  file_url text,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  is_public boolean default true,
  status text default 'active',
  created_at timestamptz default now()
);

alter table public.project_documents add column if not exists project_id uuid;
alter table public.project_documents add column if not exists user_auth_id uuid;
alter table public.project_documents add column if not exists document_type text default 'other';
alter table public.project_documents add column if not exists title text;
alter table public.project_documents add column if not exists file_name text;
alter table public.project_documents add column if not exists public_url text;
alter table public.project_documents add column if not exists file_url text;
alter table public.project_documents add column if not exists storage_path text;
alter table public.project_documents add column if not exists mime_type text;
alter table public.project_documents add column if not exists size_bytes bigint;
alter table public.project_documents add column if not exists is_public boolean default true;
alter table public.project_documents add column if not exists status text default 'active';
alter table public.project_documents add column if not exists created_at timestamptz default now();

create index if not exists idx_project_documents_project on public.project_documents(project_id, created_at desc);

-- Registered-user questions and owner replies
create table if not exists public.project_questions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  asker_auth_id uuid,
  user_auth_id uuid,
  owner_auth_id uuid,
  question text not null,
  answer text,
  owner_reply text,
  status text default 'published',
  created_at timestamptz default now(),
  answered_at timestamptz,
  updated_at timestamptz default now()
);

alter table public.project_questions add column if not exists project_id uuid;
alter table public.project_questions add column if not exists asker_auth_id uuid;
alter table public.project_questions add column if not exists user_auth_id uuid;
alter table public.project_questions add column if not exists owner_auth_id uuid;
alter table public.project_questions add column if not exists question text;
alter table public.project_questions add column if not exists answer text;
alter table public.project_questions add column if not exists owner_reply text;
alter table public.project_questions add column if not exists status text default 'published';
alter table public.project_questions add column if not exists created_at timestamptz default now();
alter table public.project_questions add column if not exists answered_at timestamptz;
alter table public.project_questions add column if not exists updated_at timestamptz default now();

create index if not exists idx_project_questions_project on public.project_questions(project_id, created_at desc);
create index if not exists idx_project_questions_owner on public.project_questions(owner_auth_id, created_at desc);

alter table public.project_questions enable row level security;

drop policy if exists "project_questions_select_registered" on public.project_questions;
create policy "project_questions_select_registered"
on public.project_questions
for select
to authenticated
using (true);

drop policy if exists "project_questions_insert_registered" on public.project_questions;
create policy "project_questions_insert_registered"
on public.project_questions
for insert
to authenticated
with check (auth.uid() = coalesce(asker_auth_id, user_auth_id));

drop policy if exists "project_questions_owner_reply" on public.project_questions;
create policy "project_questions_owner_reply"
on public.project_questions
for update
to authenticated
using (auth.uid() = owner_auth_id)
with check (auth.uid() = owner_auth_id);

-- Promotion requests extension
create table if not exists public.promotion_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  user_auth_id uuid,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table public.promotion_requests add column if not exists project_id uuid;
alter table public.promotion_requests add column if not exists owner_auth_id uuid;
alter table public.promotion_requests add column if not exists user_auth_id uuid;
alter table public.promotion_requests add column if not exists title text;
alter table public.promotion_requests add column if not exists plan_key text;
alter table public.promotion_requests add column if not exists package_code text;
alter table public.promotion_requests add column if not exists placement text default 'home_sponsored';
alter table public.promotion_requests add column if not exists duration_days int default 7;
alter table public.promotion_requests add column if not exists days int default 7;
alter table public.promotion_requests add column if not exists price numeric default 0;
alter table public.promotion_requests add column if not exists budget numeric default 0;
alter table public.promotion_requests add column if not exists sponsor_weight int default 0;
alter table public.promotion_requests add column if not exists status text default 'pending';
alter table public.promotion_requests add column if not exists notes text;
alter table public.promotion_requests add column if not exists country_code text default 'om';
alter table public.promotion_requests add column if not exists starts_at timestamptz;
alter table public.promotion_requests add column if not exists ends_at timestamptz;
alter table public.promotion_requests add column if not exists reviewed_at timestamptz;
alter table public.promotion_requests add column if not exists created_at timestamptz default now();

create index if not exists idx_promotion_requests_project on public.promotion_requests(project_id, created_at desc);
create index if not exists idx_promotion_requests_owner on public.promotion_requests(owner_auth_id, created_at desc);
create index if not exists idx_promotion_requests_status on public.promotion_requests(status, created_at desc);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
  ('project-documents', 'project-documents', true, 10485760, array['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
