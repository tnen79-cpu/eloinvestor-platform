-- إلو مستثمر v20 - Admin Control Center support
-- شغّل هذا بعد v16/v17. آمن للتشغيل أكثر من مرة.

alter table public.projects
  add column if not exists views_count integer default 0,
  add column if not exists contacts_count integer default 0,
  add column if not exists saves_count integer default 0,
  add column if not exists is_featured boolean default false,
  add column if not exists verification_status text default 'not_verified',
  add column if not exists verification_note text,
  add column if not exists admin_note text,
  add column if not exists risk_level text;

create table if not exists public.verification_files (
  id uuid primary key default gen_random_uuid(),
  owner_auth_id uuid,
  project_id uuid,
  target_type text default 'investor', -- investor / project
  file_url text,
  file_name text,
  file_type text,
  status text default 'pending', -- pending / verified / rejected / needs_revision
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.verification_files
  add column if not exists owner_auth_id uuid,
  add column if not exists project_id uuid,
  add column if not exists target_type text default 'investor',
  add column if not exists file_url text,
  add column if not exists file_name text,
  add column if not exists file_type text,
  add column if not exists status text default 'pending',
  add column if not exists admin_note text,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists created_at timestamptz default now();

alter table public.verification_files enable row level security;

drop policy if exists "admins can read verification files" on public.verification_files;
create policy "admins can read verification files"
on public.verification_files
for select
using (public.is_admin_staff('verification') or public.is_admin_staff('projects') or public.is_admin_staff('overview'));

drop policy if exists "admins can update verification files" on public.verification_files;
create policy "admins can update verification files"
on public.verification_files
for update
using (public.is_admin_staff('verification') or public.is_admin_staff('projects'))
with check (public.is_admin_staff('verification') or public.is_admin_staff('projects'));

drop policy if exists "owners can insert own verification files" on public.verification_files;
create policy "owners can insert own verification files"
on public.verification_files
for insert
with check (auth.uid() = owner_auth_id);

drop policy if exists "owners can read own verification files" on public.verification_files;
create policy "owners can read own verification files"
on public.verification_files
for select
using (auth.uid() = owner_auth_id or public.is_admin_staff('verification') or public.is_admin_staff('projects'));

-- تأكد من صلاحيات الإدارة على المشاريع للتحديث والحذف
alter table public.projects enable row level security;

drop policy if exists "admins can read all projects" on public.projects;
create policy "admins can read all projects"
on public.projects
for select
using (public.is_admin_staff('projects') or public.is_admin_staff('overview') or public.is_admin_staff('verification'));

drop policy if exists "admins can update projects" on public.projects;
create policy "admins can update projects"
on public.projects
for update
using (public.is_admin_staff('projects') or public.is_admin_staff('verification'))
with check (public.is_admin_staff('projects') or public.is_admin_staff('verification'));
