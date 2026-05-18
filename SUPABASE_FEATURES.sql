
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_auth_id uuid,
  target_type text,
  target_id uuid,
  reason text,
  details text,
  status text default 'pending',
  admin_note text,
  created_at timestamptz default now()
);

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid,
  subject text,
  message text,
  status text default 'open',
  created_at timestamptz default now()
);

alter table users add column if not exists verification_status text default 'unverified';
alter table projects add column if not exists verification_status text default 'unverified';
