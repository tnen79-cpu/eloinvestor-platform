-- إلو مستثمر v28 - Full Verification Suite
-- شغّل هذا بعد ملفات admin السابقة. الملف آمن ويضيف الأعمدة الناقصة فقط.

alter table public.verification_files
  add column if not exists owner_auth_id uuid,
  add column if not exists investor_auth_id uuid,
  add column if not exists user_auth_id uuid,
  add column if not exists project_id uuid,
  add column if not exists target_type text default 'investor',
  add column if not exists document_type text,
  add column if not exists file_name text,
  add column if not exists file_url text,
  add column if not exists file_type text,
  add column if not exists status text default 'pending',
  add column if not exists admin_note text,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists created_at timestamptz default now();

alter table public.projects
  add column if not exists verification_status text default 'not_verified',
  add column if not exists verification_note text,
  add column if not exists is_verified boolean default false,
  add column if not exists risk_level text,
  add column if not exists views_count integer default 0,
  add column if not exists contacts_count integer default 0,
  add column if not exists saves_count integer default 0;

alter table public.users
  add column if not exists verification_status text default 'not_verified',
  add column if not exists admin_note text;

-- recommended statuses:
-- pending, under_review, verified, rejected, needs_documents, suspicious, expired

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
using (public.is_admin_staff('verification'))
with check (public.is_admin_staff('verification'));

drop policy if exists "users can insert own verification files" on public.verification_files;
create policy "users can insert own verification files"
on public.verification_files
for insert
with check (
  auth.uid() = owner_auth_id
  or auth.uid() = investor_auth_id
  or auth.uid() = user_auth_id
);

drop policy if exists "users can read own verification files" on public.verification_files;
create policy "users can read own verification files"
on public.verification_files
for select
using (
  auth.uid() = owner_auth_id
  or auth.uid() = investor_auth_id
  or auth.uid() = user_auth_id
  or public.is_admin_staff('verification')
);
