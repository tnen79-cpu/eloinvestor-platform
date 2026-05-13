-- =============================================================
-- EloInvestor v17 Feature Stability Migration
-- Safe for old HTML/Next schemas: no CREATE POLICY IF NOT EXISTS
-- Run once in Supabase SQL Editor. Safe to re-run.
-- =============================================================

create extension if not exists "pgcrypto";

-- -----------------------------
-- USERS: profile, roles, plans, preferences
-- -----------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique,
  email text,
  name text,
  role text default 'user',
  account_type text default 'investor',
  subscription_status text default 'free',
  created_at timestamptz default now()
);

alter table public.users add column if not exists auth_id uuid;
alter table public.users add column if not exists email text;
alter table public.users add column if not exists name text;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists whatsapp text;
alter table public.users add column if not exists role text default 'user';
alter table public.users add column if not exists account_type text default 'investor';
alter table public.users add column if not exists plan text default 'free';
alter table public.users add column if not exists subscription_status text default 'free';
alter table public.users add column if not exists remaining_projects integer default 1;
alter table public.users add column if not exists projects_remaining integer default 1;
alter table public.users add column if not exists verification_status text default 'unverified';
alter table public.users add column if not exists investor_verification_status text default 'unverified';
alter table public.users add column if not exists budget_min numeric default 0;
alter table public.users add column if not exists budget_max numeric default 0;
alter table public.users add column if not exists preferred_location text;
alter table public.users add column if not exists preferred_categories text[] default '{}';
alter table public.users add column if not exists investor_preferences jsonb default '{}'::jsonb;
alter table public.users add column if not exists updated_at timestamptz default now();

create unique index if not exists users_auth_id_uidx on public.users(auth_id) where auth_id is not null;

alter table public.users enable row level security;

drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_select_own_or_admin" on public.users;
create policy "users_select_own"
on public.users
for select
to authenticated
using (auth.uid() = auth_id);

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
on public.users
for insert
to authenticated
with check (auth.uid() = auth_id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
on public.users
for update
to authenticated
using (auth.uid() = auth_id)
with check (auth.uid() = auth_id);

-- -----------------------------
-- PROJECTS: non-destructive compatibility columns
-- -----------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table public.projects add column if not exists slug text;
alter table public.projects add column if not exists title_ar text;
alter table public.projects add column if not exists title_en text;
alter table public.projects add column if not exists description text;
alter table public.projects add column if not exists description_ar text;
alter table public.projects add column if not exists category text;
alter table public.projects add column if not exists opportunity_type text default 'sale';
alter table public.projects add column if not exists country_code text default 'om';
alter table public.projects add column if not exists governorate text;
alter table public.projects add column if not exists city text;
alter table public.projects add column if not exists price numeric default 0;
alter table public.projects add column if not exists monthly_profit numeric default 0;
alter table public.projects add column if not exists roi numeric default 0;
alter table public.projects add column if not exists phone text;
alter table public.projects add column if not exists whatsapp text;
alter table public.projects add column if not exists owner_auth_id uuid;
alter table public.projects add column if not exists user_auth_id uuid;
alter table public.projects add column if not exists auth_id uuid;
alter table public.projects add column if not exists user_id uuid;
alter table public.projects add column if not exists created_by uuid;
alter table public.projects add column if not exists cover_image_url text;
alter table public.projects add column if not exists image_url text;
alter table public.projects add column if not exists status text default 'pending';
alter table public.projects add column if not exists is_verified boolean default false;
alter table public.projects add column if not exists verified boolean default false;
alter table public.projects add column if not exists verification_status text default 'unverified';
alter table public.projects add column if not exists views_count integer default 0;
alter table public.projects add column if not exists contacts_count integer default 0;
alter table public.projects add column if not exists saves_count integer default 0;
alter table public.projects add column if not exists updated_at timestamptz default now();

create index if not exists projects_owner_auth_idx on public.projects(owner_auth_id);
create index if not exists projects_user_auth_idx on public.projects(user_auth_id);
create index if not exists projects_status_idx on public.projects(status);
create index if not exists projects_category_idx on public.projects(category);

alter table public.projects enable row level security;

drop policy if exists "projects_public_approved" on public.projects;
create policy "projects_public_approved"
on public.projects
for select
to anon, authenticated
using (status in ('approved','active','published') or owner_auth_id = auth.uid() or user_auth_id = auth.uid() or auth_id = auth.uid() or user_id = auth.uid() or created_by = auth.uid());

drop policy if exists "projects_insert_owner" on public.projects;
create policy "projects_insert_owner"
on public.projects
for insert
to authenticated
with check (
  owner_auth_id = auth.uid()
  or user_auth_id = auth.uid()
  or auth_id = auth.uid()
  or user_id = auth.uid()
  or created_by = auth.uid()
);

drop policy if exists "projects_update_owner" on public.projects;
create policy "projects_update_owner"
on public.projects
for update
to authenticated
using (owner_auth_id = auth.uid() or user_auth_id = auth.uid() or auth_id = auth.uid() or user_id = auth.uid() or created_by = auth.uid())
with check (owner_auth_id = auth.uid() or user_auth_id = auth.uid() or auth_id = auth.uid() or user_id = auth.uid() or created_by = auth.uid());

-- -----------------------------
-- SAVED PROJECTS
-- -----------------------------
create table if not exists public.investor_saved_projects (
  id uuid primary key default gen_random_uuid(),
  investor_auth_id uuid,
  project_id uuid,
  project_snapshot jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.investor_saved_projects add column if not exists investor_auth_id uuid;
alter table public.investor_saved_projects add column if not exists project_id uuid;
alter table public.investor_saved_projects add column if not exists project_snapshot jsonb default '{}'::jsonb;
alter table public.investor_saved_projects add column if not exists created_at timestamptz default now();
create unique index if not exists investor_saved_unique_idx on public.investor_saved_projects(investor_auth_id, project_id) where investor_auth_id is not null and project_id is not null;
create index if not exists investor_saved_user_idx on public.investor_saved_projects(investor_auth_id, created_at desc);

alter table public.investor_saved_projects enable row level security;

drop policy if exists "saved_select_own" on public.investor_saved_projects;
create policy "saved_select_own" on public.investor_saved_projects for select to authenticated using (auth.uid() = investor_auth_id);
drop policy if exists "saved_insert_own" on public.investor_saved_projects;
create policy "saved_insert_own" on public.investor_saved_projects for insert to authenticated with check (auth.uid() = investor_auth_id);
drop policy if exists "saved_update_own" on public.investor_saved_projects;
create policy "saved_update_own" on public.investor_saved_projects for update to authenticated using (auth.uid() = investor_auth_id) with check (auth.uid() = investor_auth_id);
drop policy if exists "saved_delete_own" on public.investor_saved_projects;
create policy "saved_delete_own" on public.investor_saved_projects for delete to authenticated using (auth.uid() = investor_auth_id);

-- -----------------------------
-- CONVERSATIONS + MESSAGES
-- Supports both old buyer_id and new investor_id names.
-- -----------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  buyer_id uuid,
  investor_id uuid,
  owner_id uuid,
  status text default 'open',
  created_at timestamptz default now()
);

alter table public.conversations add column if not exists project_id uuid;
alter table public.conversations add column if not exists buyer_id uuid;
alter table public.conversations add column if not exists investor_id uuid;
alter table public.conversations add column if not exists owner_id uuid;
alter table public.conversations add column if not exists country_code text;
alter table public.conversations add column if not exists status text default 'open';
alter table public.conversations add column if not exists last_message text;
alter table public.conversations add column if not exists last_message_at timestamptz default now();
alter table public.conversations add column if not exists updated_at timestamptz default now();
alter table public.conversations add column if not exists created_at timestamptz default now();

create unique index if not exists conversations_project_buyer_uidx on public.conversations(project_id, buyer_id) where project_id is not null and buyer_id is not null;
create unique index if not exists conversations_project_investor_uidx on public.conversations(project_id, investor_id) where project_id is not null and investor_id is not null;
create index if not exists conversations_owner_idx on public.conversations(owner_id, last_message_at desc);
create index if not exists conversations_buyer_idx on public.conversations(buyer_id, last_message_at desc);
create index if not exists conversations_investor_idx on public.conversations(investor_id, last_message_at desc);

alter table public.conversations enable row level security;

drop policy if exists "conversation_select_users" on public.conversations;
create policy "conversation_select_users" on public.conversations for select to authenticated using (
  auth.uid() = buyer_id or auth.uid() = investor_id or auth.uid() = owner_id
);

drop policy if exists "conversation_insert_investor" on public.conversations;
create policy "conversation_insert_investor" on public.conversations for insert to authenticated with check (
  auth.uid() = buyer_id or auth.uid() = investor_id
);

drop policy if exists "conversation_update_users" on public.conversations;
create policy "conversation_update_users" on public.conversations for update to authenticated using (
  auth.uid() = buyer_id or auth.uid() = investor_id or auth.uid() = owner_id
) with check (
  auth.uid() = buyer_id or auth.uid() = investor_id or auth.uid() = owner_id
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid,
  sender_id uuid,
  body text,
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table public.messages add column if not exists conversation_id uuid;
alter table public.messages add column if not exists sender_id uuid;
alter table public.messages add column if not exists body text;
alter table public.messages add column if not exists read_at timestamptz;
alter table public.messages add column if not exists created_at timestamptz default now();
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);
create index if not exists messages_sender_idx on public.messages(sender_id);

alter table public.messages enable row level security;

drop policy if exists "messages_select_users" on public.messages;
create policy "messages_select_users" on public.messages for select to authenticated using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
    and (c.buyer_id = auth.uid() or c.investor_id = auth.uid() or c.owner_id = auth.uid())
  )
);

drop policy if exists "messages_insert_users" on public.messages;
create policy "messages_insert_users" on public.messages for insert to authenticated with check (
  auth.uid() = sender_id and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
    and (c.buyer_id = auth.uid() or c.investor_id = auth.uid() or c.owner_id = auth.uid())
  )
);

drop policy if exists "messages_update_reader" on public.messages;
create policy "messages_update_reader" on public.messages for update to authenticated using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
    and (c.buyer_id = auth.uid() or c.investor_id = auth.uid() or c.owner_id = auth.uid())
  )
) with check (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
    and (c.buyer_id = auth.uid() or c.investor_id = auth.uid() or c.owner_id = auth.uid())
  )
);

-- Contacted fallback table
create table if not exists public.investor_contacted_projects (
  id uuid primary key default gen_random_uuid(),
  investor_auth_id uuid,
  project_id uuid,
  conversation_id uuid,
  project_snapshot jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.investor_contacted_projects add column if not exists investor_auth_id uuid;
alter table public.investor_contacted_projects add column if not exists project_id uuid;
alter table public.investor_contacted_projects add column if not exists conversation_id uuid;
alter table public.investor_contacted_projects add column if not exists project_snapshot jsonb default '{}'::jsonb;
alter table public.investor_contacted_projects add column if not exists created_at timestamptz default now();
create unique index if not exists investor_contacted_unique_idx on public.investor_contacted_projects(investor_auth_id, project_id) where investor_auth_id is not null and project_id is not null;

alter table public.investor_contacted_projects enable row level security;
drop policy if exists "contacted_select_own" on public.investor_contacted_projects;
create policy "contacted_select_own" on public.investor_contacted_projects for select to authenticated using (auth.uid() = investor_auth_id);
drop policy if exists "contacted_insert_own" on public.investor_contacted_projects;
create policy "contacted_insert_own" on public.investor_contacted_projects for insert to authenticated with check (auth.uid() = investor_auth_id);
drop policy if exists "contacted_update_own" on public.investor_contacted_projects;
create policy "contacted_update_own" on public.investor_contacted_projects for update to authenticated using (auth.uid() = investor_auth_id) with check (auth.uid() = investor_auth_id);

-- -----------------------------
-- VERIFICATION + PAID PROJECT TRUST BADGE
-- -----------------------------
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  project_id uuid,
  request_type text default 'project',
  status text default 'pending',
  document_url text,
  created_at timestamptz default now()
);

alter table public.verification_requests add column if not exists user_auth_id uuid;
alter table public.verification_requests add column if not exists project_id uuid;
alter table public.verification_requests add column if not exists request_type text default 'project';
alter table public.verification_requests add column if not exists status text default 'pending';
alter table public.verification_requests add column if not exists title text;
alter table public.verification_requests add column if not exists document_name text;
alter table public.verification_requests add column if not exists document_url text;
alter table public.verification_requests add column if not exists file_url text;
alter table public.verification_requests add column if not exists file_path text;
alter table public.verification_requests add column if not exists storage_path text;
alter table public.verification_requests add column if not exists note text;
alter table public.verification_requests add column if not exists admin_note text;
alter table public.verification_requests add column if not exists created_at timestamptz default now();
alter table public.verification_requests add column if not exists updated_at timestamptz default now();
create index if not exists verification_user_idx on public.verification_requests(user_auth_id, created_at desc);
create index if not exists verification_status_idx on public.verification_requests(status, created_at desc);

alter table public.verification_requests enable row level security;
drop policy if exists "verification_select_own" on public.verification_requests;
create policy "verification_select_own" on public.verification_requests for select to authenticated using (auth.uid() = user_auth_id);
drop policy if exists "verification_insert_own" on public.verification_requests;
create policy "verification_insert_own" on public.verification_requests for insert to authenticated with check (auth.uid() = user_auth_id);
drop policy if exists "verification_update_own_pending" on public.verification_requests;
create policy "verification_update_own_pending" on public.verification_requests for update to authenticated using (auth.uid() = user_auth_id and status = 'pending') with check (auth.uid() = user_auth_id);

insert into storage.buckets (id, name, public)
values ('verification-docs', 'verification-docs', true)
on conflict (id) do nothing;

drop policy if exists "verification_storage_select" on storage.objects;
create policy "verification_storage_select" on storage.objects for select to public using (bucket_id = 'verification-docs');
drop policy if exists "verification_storage_insert" on storage.objects;
create policy "verification_storage_insert" on storage.objects for insert to authenticated with check (bucket_id = 'verification-docs');
drop policy if exists "verification_storage_update_own" on storage.objects;
create policy "verification_storage_update_own" on storage.objects for update to authenticated using (bucket_id = 'verification-docs' and owner = auth.uid()) with check (bucket_id = 'verification-docs');

-- -----------------------------
-- PACKAGE / PREMIUM SYSTEM
-- -----------------------------
create table if not exists public.package_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  current_plan text,
  requested_plan text,
  status text default 'pending',
  note text,
  created_at timestamptz default now()
);

alter table public.package_upgrade_requests add column if not exists user_auth_id uuid;
alter table public.package_upgrade_requests add column if not exists current_plan text;
alter table public.package_upgrade_requests add column if not exists requested_plan text;
alter table public.package_upgrade_requests add column if not exists status text default 'pending';
alter table public.package_upgrade_requests add column if not exists note text;
alter table public.package_upgrade_requests add column if not exists created_at timestamptz default now();
alter table public.package_upgrade_requests enable row level security;
drop policy if exists "package_requests_select_own" on public.package_upgrade_requests;
create policy "package_requests_select_own" on public.package_upgrade_requests for select to authenticated using (auth.uid() = user_auth_id);
drop policy if exists "package_requests_insert_own" on public.package_upgrade_requests;
create policy "package_requests_insert_own" on public.package_upgrade_requests for insert to authenticated with check (auth.uid() = user_auth_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  title text,
  body text,
  type text default 'system',
  is_read boolean default false,
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table public.notifications add column if not exists user_auth_id uuid;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists body text;
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists type text default 'system';
alter table public.notifications add column if not exists is_read boolean default false;
alter table public.notifications add column if not exists read_at timestamptz;
alter table public.notifications add column if not exists created_at timestamptz default now();
create index if not exists notifications_user_idx on public.notifications(user_auth_id, created_at desc);

alter table public.notifications enable row level security;
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select to authenticated using (auth.uid() = user_auth_id);
drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own" on public.notifications for insert to authenticated with check (auth.uid() = user_auth_id);
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update to authenticated using (auth.uid() = user_auth_id) with check (auth.uid() = user_auth_id);

-- -----------------------------
-- ANALYTICS
-- -----------------------------
create table if not exists public.project_views_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  viewer_id uuid,
  created_at timestamptz default now()
);

alter table public.project_views_log add column if not exists project_id uuid;
alter table public.project_views_log add column if not exists viewer_id uuid;
alter table public.project_views_log add column if not exists created_at timestamptz default now();
create index if not exists project_views_project_idx on public.project_views_log(project_id, created_at desc);

alter table public.project_views_log enable row level security;
drop policy if exists "project_views_insert_any" on public.project_views_log;
create policy "project_views_insert_any" on public.project_views_log for insert to anon, authenticated with check (true);
drop policy if exists "project_views_select_own_project" on public.project_views_log;
create policy "project_views_select_own_project" on public.project_views_log for select to authenticated using (
  exists (
    select 1 from public.projects p
    where p.id = project_views_log.project_id
    and (p.owner_auth_id = auth.uid() or p.user_auth_id = auth.uid() or p.auth_id = auth.uid() or p.user_id = auth.uid() or p.created_by = auth.uid())
  )
);

-- Atomic counters used by ContactActions and future analytics.
create or replace function public.increment_project_contact_count(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.projects
  set contacts_count = coalesce(contacts_count, 0) + 1,
      updated_at = now()
  where id = p_project_id;
end;
$$;

grant execute on function public.increment_project_contact_count(uuid) to anon, authenticated;

create or replace function public.increment_project_view_count(p_project_id uuid, p_viewer_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_views_log(project_id, viewer_id) values (p_project_id, p_viewer_id);
  update public.projects
  set views_count = coalesce(views_count, 0) + 1,
      updated_at = now()
  where id = p_project_id;
end;
$$;

grant execute on function public.increment_project_view_count(uuid, uuid) to anon, authenticated;

-- Saved counter trigger
create or replace function public.sync_project_save_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.projects set saves_count = coalesce(saves_count, 0) + 1 where id = NEW.project_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.projects set saves_count = greatest(coalesce(saves_count, 0) - 1, 0) where id = OLD.project_id;
    return OLD;
  end if;
  return null;
end;
$$;

drop trigger if exists investor_saved_projects_counter on public.investor_saved_projects;
create trigger investor_saved_projects_counter
after insert or delete on public.investor_saved_projects
for each row execute function public.sync_project_save_count();

-- Realtime-friendly replica identity for dashboard sync.
alter table public.investor_saved_projects replica identity full;
alter table public.investor_contacted_projects replica identity full;
alter table public.conversations replica identity full;
alter table public.messages replica identity full;
alter table public.notifications replica identity full;

-- =============================================================
-- DONE v17
-- =============================================================
