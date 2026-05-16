-- =========================================================
-- EloInvestor v34.4 Promotion Control + Map Links + Docs
-- Safe legacy-compatible migration
-- =========================================================

create extension if not exists "pgcrypto";

-- Project documents table: stores feasibility studies, sales reports, licenses, plans, etc.
create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  user_auth_id uuid,
  title text,
  document_type text,
  note text,
  file_name text,
  file_url text,
  document_url text,
  public_url text,
  file_path text,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  is_public boolean default true,
  status text default 'uploaded',
  created_at timestamptz default now()
);

alter table public.project_documents add column if not exists project_id uuid;
alter table public.project_documents add column if not exists user_auth_id uuid;
alter table public.project_documents add column if not exists title text;
alter table public.project_documents add column if not exists document_type text;
alter table public.project_documents add column if not exists note text;
alter table public.project_documents add column if not exists file_name text;
alter table public.project_documents add column if not exists file_url text;
alter table public.project_documents add column if not exists document_url text;
alter table public.project_documents add column if not exists public_url text;
alter table public.project_documents add column if not exists file_path text;
alter table public.project_documents add column if not exists storage_path text;
alter table public.project_documents add column if not exists mime_type text;
alter table public.project_documents add column if not exists size_bytes bigint;
alter table public.project_documents add column if not exists is_public boolean default true;
alter table public.project_documents add column if not exists status text default 'uploaded';
alter table public.project_documents add column if not exists created_at timestamptz default now();

create index if not exists idx_project_documents_project on public.project_documents(project_id, created_at desc);
create index if not exists idx_project_documents_user on public.project_documents(user_auth_id, created_at desc);

alter table public.project_documents enable row level security;
drop policy if exists "project_documents_public_select" on public.project_documents;
create policy "project_documents_public_select" on public.project_documents
for select to anon, authenticated
using (coalesce(is_public, true) = true or auth.uid() = user_auth_id);

drop policy if exists "project_documents_insert_own" on public.project_documents;
create policy "project_documents_insert_own" on public.project_documents
for insert to authenticated
with check (auth.uid() = user_auth_id or user_auth_id is null);

drop policy if exists "project_documents_update_own" on public.project_documents;
create policy "project_documents_update_own" on public.project_documents
for update to authenticated
using (auth.uid() = user_auth_id)
with check (auth.uid() = user_auth_id);

-- Promotion requests: owners submit paid promotion requests; admin approves/activates/rejects.
create table if not exists public.promotion_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  user_auth_id uuid,
  plan_code text,
  plan_name text,
  placement text default 'home_sponsored',
  duration_days int default 7,
  price numeric default 0,
  amount numeric default 0,
  status text default 'pending',
  note text,
  admin_note text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.promotion_requests add column if not exists project_id uuid;
alter table public.promotion_requests add column if not exists user_auth_id uuid;
alter table public.promotion_requests add column if not exists plan_code text;
alter table public.promotion_requests add column if not exists plan_name text;
alter table public.promotion_requests add column if not exists placement text default 'home_sponsored';
alter table public.promotion_requests add column if not exists duration_days int default 7;
alter table public.promotion_requests add column if not exists price numeric default 0;
alter table public.promotion_requests add column if not exists amount numeric default 0;
alter table public.promotion_requests add column if not exists status text default 'pending';
alter table public.promotion_requests add column if not exists note text;
alter table public.promotion_requests add column if not exists admin_note text;
alter table public.promotion_requests add column if not exists starts_at timestamptz;
alter table public.promotion_requests add column if not exists ends_at timestamptz;
alter table public.promotion_requests add column if not exists updated_at timestamptz default now();

create index if not exists idx_promotion_requests_project on public.promotion_requests(project_id, created_at desc);
create index if not exists idx_promotion_requests_user on public.promotion_requests(user_auth_id, created_at desc);
create index if not exists idx_promotion_requests_status on public.promotion_requests(status, created_at desc);

alter table public.promotion_requests enable row level security;
drop policy if exists "promotion_requests_select_own" on public.promotion_requests;
create policy "promotion_requests_select_own" on public.promotion_requests
for select to authenticated
using (auth.uid() = user_auth_id);

drop policy if exists "promotion_requests_insert_own" on public.promotion_requests;
create policy "promotion_requests_insert_own" on public.promotion_requests
for insert to authenticated
with check (auth.uid() = user_auth_id or user_auth_id is null);

-- Project columns used by maps, sponsorship, counters and owner contact.
alter table public.projects add column if not exists map_lat numeric;
alter table public.projects add column if not exists map_lng numeric;
alter table public.projects add column if not exists map_url text;
alter table public.projects add column if not exists is_sponsored boolean default false;
alter table public.projects add column if not exists sponsored boolean default false;
alter table public.projects add column if not exists sponsor_weight int default 0;
alter table public.projects add column if not exists sponsored_until timestamptz;
alter table public.projects add column if not exists views_count int default 0;
alter table public.projects add column if not exists contacts_count int default 0;

-- Storage buckets.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('project-documents','project-documents',true,15728640,array['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]),
('project-images','project-images',true,5242880,array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update set public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

-- Admin helper view for documents and promotion requests.
drop view if exists public.admin_project_documents_view cascade;
create view public.admin_project_documents_view as
select
  d.*,
  coalesce(p.title, 'مشروع بدون عنوان') as project_title,
  coalesce(u.name, split_part(u.email, '@', 1), 'مستخدم') as user_name
from public.project_documents d
left join public.projects p on p.id = d.project_id
left join public.users u on u.auth_id = d.user_auth_id;

grant select on public.admin_project_documents_view to authenticated;

drop view if exists public.admin_promotion_requests_view cascade;
create view public.admin_promotion_requests_view as
select
  pr.*,
  coalesce(p.title, 'مشروع بدون عنوان') as project_title,
  coalesce(u.name, split_part(u.email, '@', 1), 'مستخدم') as user_name
from public.promotion_requests pr
left join public.projects p on p.id = pr.project_id
left join public.users u on u.auth_id = pr.user_auth_id;

grant select on public.admin_promotion_requests_view to authenticated;
