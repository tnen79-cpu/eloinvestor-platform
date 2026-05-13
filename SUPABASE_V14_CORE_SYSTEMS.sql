-- EloInvestor v14 Core Systems Rebuild
-- Run in Supabase SQL editor after the previous v13.6 SQL.

create extension if not exists pgcrypto;

-- Profiles: investor interests + safer self updates
alter table public.users add column if not exists budget_min numeric default 0;
alter table public.users add column if not exists budget_max numeric default 0;
alter table public.users add column if not exists preferred_location text default '';
alter table public.users add column if not exists preferred_categories text[] default '{}';
alter table public.users add column if not exists investor_preferences jsonb default '{}'::jsonb;
alter table public.users enable row level security;

drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
for select to authenticated
using (auth.uid() = auth_id::uuid or role in ('admin','super_admin'));

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
for update to authenticated
using (auth.uid() = auth_id::uuid)
with check (auth.uid() = auth_id::uuid);

-- Conversations and messages
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  buyer_id uuid not null,
  owner_id uuid not null,
  country_code text default 'om',
  status text default 'open',
  last_message text default '',
  last_message_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(project_id, buyer_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists conversations_buyer_idx on public.conversations(buyer_id, last_message_at desc);
create index if not exists conversations_owner_idx on public.conversations(owner_id, last_message_at desc);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);
create index if not exists messages_unread_idx on public.messages(conversation_id, sender_id, read_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists conversations_participants_select on public.conversations;
create policy conversations_participants_select on public.conversations
for select to authenticated
using (auth.uid() = buyer_id or auth.uid() = owner_id);

drop policy if exists conversations_participants_insert on public.conversations;
create policy conversations_participants_insert on public.conversations
for insert to authenticated
with check (auth.uid() = buyer_id);

drop policy if exists conversations_participants_update on public.conversations;
create policy conversations_participants_update on public.conversations
for update to authenticated
using (auth.uid() = buyer_id or auth.uid() = owner_id)
with check (auth.uid() = buyer_id or auth.uid() = owner_id);

drop policy if exists messages_participants_select on public.messages;
create policy messages_participants_select on public.messages
for select to authenticated
using (exists (
  select 1 from public.conversations c
  where c.id = messages.conversation_id
  and (c.buyer_id = auth.uid() or c.owner_id = auth.uid())
));

drop policy if exists messages_participants_insert on public.messages;
create policy messages_participants_insert on public.messages
for insert to authenticated
with check (
  auth.uid() = sender_id and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
    and (c.buyer_id = auth.uid() or c.owner_id = auth.uid())
  )
);

drop policy if exists messages_participants_update_read on public.messages;
create policy messages_participants_update_read on public.messages
for update to authenticated
using (exists (
  select 1 from public.conversations c
  where c.id = messages.conversation_id
  and (c.buyer_id = auth.uid() or c.owner_id = auth.uid())
))
with check (exists (
  select 1 from public.conversations c
  where c.id = messages.conversation_id
  and (c.buyer_id = auth.uid() or c.owner_id = auth.uid())
));

-- Verification requests and Storage bucket metadata
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid not null,
  request_type text not null,
  title text default '',
  document_name text default '',
  document_url text default '',
  file_url text default '',
  file_path text default '',
  storage_path text default '',
  note text default '',
  status text default 'pending',
  admin_note text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.verification_requests enable row level security;

drop policy if exists verification_owner_select on public.verification_requests;
create policy verification_owner_select on public.verification_requests
for select to authenticated
using (auth.uid() = user_auth_id);

drop policy if exists verification_owner_insert on public.verification_requests;
create policy verification_owner_insert on public.verification_requests
for insert to authenticated
with check (auth.uid() = user_auth_id);

insert into storage.buckets (id, name, public)
values ('verification-docs', 'verification-docs', true)
on conflict (id) do nothing;

-- Storage policies. If these already exist with different names, this block is safe.
drop policy if exists verification_docs_select on storage.objects;
create policy verification_docs_select on storage.objects
for select to authenticated
using (bucket_id = 'verification-docs');

drop policy if exists verification_docs_insert_own on storage.objects;
create policy verification_docs_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'verification-docs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Optional upgrade requests table used by dashboard packages.
create table if not exists public.package_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid not null,
  requested_plan text not null,
  current_plan text default 'free',
  status text default 'pending',
  note text default '',
  created_at timestamptz default now()
);

alter table public.package_upgrade_requests enable row level security;

drop policy if exists package_requests_owner_insert on public.package_upgrade_requests;
create policy package_requests_owner_insert on public.package_upgrade_requests
for insert to authenticated
with check (auth.uid() = user_auth_id);

drop policy if exists package_requests_owner_select on public.package_upgrade_requests;
create policy package_requests_owner_select on public.package_upgrade_requests
for select to authenticated
using (auth.uid() = user_auth_id);
