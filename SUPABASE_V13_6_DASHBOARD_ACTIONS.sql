-- EloInvestor Next v13.6 - Dashboard action support
-- Run this after older V12/V13 SQL files.

alter table users
add column if not exists phone text,
add column if not exists whatsapp text,
add column if not exists account_type text default 'investor',
add column if not exists investor_preferences jsonb default '{}'::jsonb,
add column if not exists preferred_categories text[] default '{}',
add column if not exists preferred_location text,
add column if not exists budget_min numeric default 0,
add column if not exists budget_max numeric default 0;

create table if not exists package_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid not null,
  requested_plan text not null,
  current_plan text,
  status text default 'pending',
  note text,
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table package_upgrade_requests
add column if not exists user_auth_id uuid,
add column if not exists requested_plan text,
add column if not exists current_plan text,
add column if not exists status text default 'pending',
add column if not exists note text,
add column if not exists admin_note text,
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now();

alter table verification_requests
add column if not exists title text,
add column if not exists document_name text,
add column if not exists note text;

alter table package_upgrade_requests enable row level security;

drop policy if exists package_requests_select_own on package_upgrade_requests;
create policy package_requests_select_own on package_upgrade_requests
for select to authenticated
using (auth.uid() = user_auth_id or exists (select 1 from users u where u.auth_id = auth.uid() and u.role in ('admin','super_admin')));

drop policy if exists package_requests_insert_own on package_upgrade_requests;
create policy package_requests_insert_own on package_upgrade_requests
for insert to authenticated
with check (auth.uid() = user_auth_id);

drop policy if exists package_requests_admin_update on package_upgrade_requests;
create policy package_requests_admin_update on package_upgrade_requests
for update to authenticated
using (exists (select 1 from users u where u.auth_id = auth.uid() and u.role in ('admin','super_admin')))
with check (exists (select 1 from users u where u.auth_id = auth.uid() and u.role in ('admin','super_admin')));

notify pgrst, 'reload schema';
