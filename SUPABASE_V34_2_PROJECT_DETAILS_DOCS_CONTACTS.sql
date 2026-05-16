-- =========================================================
-- EloInvestor v34.2 Project Details Docs + Contact Support
-- Safe for legacy Supabase databases
-- =========================================================

create extension if not exists "pgcrypto";

-- 1) Dedicated project documents table.
create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  user_auth_id uuid,
  title text,
  document_type text,
  file_name text,
  file_url text,
  public_url text,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  is_public boolean default true,
  created_at timestamptz default now()
);

alter table public.project_documents add column if not exists project_id uuid;
alter table public.project_documents add column if not exists user_auth_id uuid;
alter table public.project_documents add column if not exists title text;
alter table public.project_documents add column if not exists document_type text;
alter table public.project_documents add column if not exists file_name text;
alter table public.project_documents add column if not exists file_url text;
alter table public.project_documents add column if not exists public_url text;
alter table public.project_documents add column if not exists storage_path text;
alter table public.project_documents add column if not exists mime_type text;
alter table public.project_documents add column if not exists size_bytes bigint;
alter table public.project_documents add column if not exists is_public boolean default true;
alter table public.project_documents add column if not exists created_at timestamptz default now();

create index if not exists idx_project_documents_project on public.project_documents(project_id, created_at desc);
create index if not exists idx_project_documents_user on public.project_documents(user_auth_id, created_at desc);

alter table public.project_documents enable row level security;

drop policy if exists "project_documents_public_select" on public.project_documents;
create policy "project_documents_public_select"
on public.project_documents
for select
to anon, authenticated
using (coalesce(is_public, true) = true);

drop policy if exists "project_documents_owner_insert" on public.project_documents;
create policy "project_documents_owner_insert"
on public.project_documents
for insert
to authenticated
with check (auth.uid() = user_auth_id or user_auth_id is null);

drop policy if exists "project_documents_owner_update" on public.project_documents;
create policy "project_documents_owner_update"
on public.project_documents
for update
to authenticated
using (auth.uid() = user_auth_id)
with check (auth.uid() = user_auth_id);

drop policy if exists "project_documents_owner_delete" on public.project_documents;
create policy "project_documents_owner_delete"
on public.project_documents
for delete
to authenticated
using (auth.uid() = user_auth_id);

-- 2) Ensure upload_assets can also store project documents.
create table if not exists public.upload_assets (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  project_id uuid,
  bucket text,
  path text,
  public_url text,
  mime_type text,
  size_bytes bigint,
  sort_order int default 100,
  is_cover boolean default false,
  created_at timestamptz default now()
);

alter table public.upload_assets add column if not exists project_id uuid;
alter table public.upload_assets add column if not exists user_auth_id uuid;
alter table public.upload_assets add column if not exists bucket text;
alter table public.upload_assets add column if not exists path text;
alter table public.upload_assets add column if not exists public_url text;
alter table public.upload_assets add column if not exists mime_type text;
alter table public.upload_assets add column if not exists size_bytes bigint;
alter table public.upload_assets add column if not exists sort_order int default 100;
alter table public.upload_assets add column if not exists is_cover boolean default false;
alter table public.upload_assets add column if not exists created_at timestamptz default now();

create index if not exists idx_upload_assets_project_docs on public.upload_assets(project_id, bucket, sort_order);

-- 3) Storage bucket for project documents.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-documents',
  'project-documents',
  true,
  10485760,
  array['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- 4) Add contact fields if missing.
alter table public.projects add column if not exists whatsapp text;
alter table public.projects add column if not exists phone text;
alter table public.projects add column if not exists opportunity_type text;

-- 5) Admin view for project documents.
drop view if exists public.admin_project_documents_view cascade;
create view public.admin_project_documents_view as
select
  d.id,
  d.project_id,
  d.user_auth_id,
  coalesce(d.title, d.file_name, d.document_type, 'ملف مرفق') as title,
  d.document_type,
  coalesce(d.public_url, d.file_url) as url,
  d.mime_type,
  d.size_bytes,
  d.is_public,
  d.created_at,
  coalesce(p.title, 'مشروع') as project_title
from public.project_documents d
left join public.projects p on p.id = d.project_id;

grant select on public.admin_project_documents_view to authenticated;
