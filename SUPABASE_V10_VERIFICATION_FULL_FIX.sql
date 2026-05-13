-- EloInvestor Next v10 — Verification schema full fix
-- Run this whole file once in Supabase SQL Editor.

create table if not exists verification_requests (
  id uuid primary key default gen_random_uuid()
);

alter table verification_requests
add column if not exists user_auth_id uuid,
add column if not exists request_type text default 'project',
add column if not exists type text default 'project',
add column if not exists project_id uuid,
add column if not exists project_title text,
add column if not exists country_code text default 'om',
add column if not exists status text default 'pending',
add column if not exists full_name text,
add column if not exists company_name text,
add column if not exists document_type text,
add column if not exists document_url text,
add column if not exists note text,
add column if not exists notes text,
add column if not exists admin_note text,
add column if not exists reviewed_at timestamptz,
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now();

update verification_requests
set request_type = coalesce(request_type, type, 'project'),
    type = coalesce(type, request_type, 'project'),
    country_code = lower(coalesce(country_code, 'om')),
    status = coalesce(status, 'pending'),
    notes = coalesce(notes, note),
    note = coalesce(note, notes)
where true;

alter table projects add column if not exists is_verified boolean default false;
alter table projects add column if not exists verification_status text default 'none';
alter table projects add column if not exists owner_auth_id uuid;
alter table projects add column if not exists user_auth_id uuid;

update projects
set user_auth_id = owner_auth_id
where user_auth_id is null and owner_auth_id is not null;

update projects
set owner_auth_id = user_auth_id
where owner_auth_id is null and user_auth_id is not null;

alter table users add column if not exists role text default 'user';
alter table users add column if not exists is_verified boolean default false;
alter table users add column if not exists is_verified_investor boolean default false;
alter table users add column if not exists verification_status text default 'none';

alter table verification_requests enable row level security;

drop policy if exists "users_read_own_verification_requests" on verification_requests;
create policy "users_read_own_verification_requests"
on verification_requests
for select
to authenticated
using (user_auth_id = auth.uid());

drop policy if exists "users_insert_own_verification_requests" on verification_requests;
create policy "users_insert_own_verification_requests"
on verification_requests
for insert
to authenticated
with check (user_auth_id = auth.uid());

drop policy if exists "admins_read_verification_requests" on verification_requests;
create policy "admins_read_verification_requests"
on verification_requests
for select
to authenticated
using (
  exists (
    select 1 from users
    where users.auth_id = auth.uid()
    and coalesce(users.role, 'user') in ('admin','super_admin','owner')
  )
);

drop policy if exists "admins_update_verification_requests" on verification_requests;
create policy "admins_update_verification_requests"
on verification_requests
for update
to authenticated
using (
  exists (
    select 1 from users
    where users.auth_id = auth.uid()
    and coalesce(users.role, 'user') in ('admin','super_admin','owner')
  )
)
with check (
  exists (
    select 1 from users
    where users.auth_id = auth.uid()
    and coalesce(users.role, 'user') in ('admin','super_admin','owner')
  )
);

notify pgrst, 'reload schema';
