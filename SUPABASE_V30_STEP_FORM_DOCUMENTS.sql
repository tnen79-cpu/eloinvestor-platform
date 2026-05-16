-- EloInvestor v30: project documents + unified add-project flow support
create extension if not exists "pgcrypto";

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  user_auth_id uuid,
  document_type text default 'other',
  title text,
  file_name text,
  file_url text,
  document_url text,
  file_path text,
  storage_path text,
  note text,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table public.project_documents add column if not exists project_id uuid;
alter table public.project_documents add column if not exists user_auth_id uuid;
alter table public.project_documents add column if not exists document_type text default 'other';
alter table public.project_documents add column if not exists title text;
alter table public.project_documents add column if not exists file_name text;
alter table public.project_documents add column if not exists file_url text;
alter table public.project_documents add column if not exists document_url text;
alter table public.project_documents add column if not exists file_path text;
alter table public.project_documents add column if not exists storage_path text;
alter table public.project_documents add column if not exists note text;
alter table public.project_documents add column if not exists status text default 'pending';
alter table public.project_documents add column if not exists created_at timestamptz default now();

create index if not exists idx_project_documents_project on public.project_documents(project_id, created_at desc);
create index if not exists idx_project_documents_user on public.project_documents(user_auth_id, created_at desc);

alter table public.project_documents enable row level security;
drop policy if exists "project_documents_select_own" on public.project_documents;
create policy "project_documents_select_own" on public.project_documents for select to authenticated using (auth.uid() = user_auth_id);
drop policy if exists "project_documents_insert_own" on public.project_documents;
create policy "project_documents_insert_own" on public.project_documents for insert to authenticated with check (auth.uid() = user_auth_id);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('project-documents','project-documents',true,15728640,array['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']::text[])
on conflict (id) do update set public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "project_documents_storage_select" on storage.objects;
create policy "project_documents_storage_select" on storage.objects for select to public using (bucket_id = 'project-documents');
drop policy if exists "project_documents_storage_insert" on storage.objects;
create policy "project_documents_storage_insert" on storage.objects for insert to authenticated with check (bucket_id = 'project-documents');
