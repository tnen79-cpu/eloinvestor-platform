-- إلو مستثمر v12 - جداول اختيارية لتفعيل المحفوظات/التواصل/الإشعارات بشكل حقيقي
-- شغّلها في Supabase SQL Editor إذا لم تكن الجداول موجودة.

alter table public.users
  add column if not exists investor_preferences jsonb default '{}'::jsonb,
  add column if not exists verification_status text default 'not_verified',
  add column if not exists plan text default 'free',
  add column if not exists subscription_status text default 'free';

create table if not exists public.investor_saved_projects (
  id uuid primary key default gen_random_uuid(),
  investor_auth_id uuid not null,
  project_id uuid not null,
  project_snapshot jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(investor_auth_id, project_id)
);

create table if not exists public.investor_contacted_projects (
  id uuid primary key default gen_random_uuid(),
  investor_auth_id uuid not null,
  project_id uuid not null,
  project_snapshot jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(investor_auth_id, project_id)
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid not null,
  title text not null,
  body text,
  type text default 'info',
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid not null,
  title text not null,
  body text,
  created_at timestamptz default now()
);

alter table public.investor_saved_projects enable row level security;
alter table public.investor_contacted_projects enable row level security;
alter table public.user_notifications enable row level security;
alter table public.user_activity enable row level security;

drop policy if exists "saved own read" on public.investor_saved_projects;
create policy "saved own read" on public.investor_saved_projects for select using (auth.uid() = investor_auth_id);
drop policy if exists "saved own upsert" on public.investor_saved_projects;
create policy "saved own upsert" on public.investor_saved_projects for insert with check (auth.uid() = investor_auth_id);

drop policy if exists "contacted own read" on public.investor_contacted_projects;
create policy "contacted own read" on public.investor_contacted_projects for select using (auth.uid() = investor_auth_id);
drop policy if exists "contacted own upsert" on public.investor_contacted_projects;
create policy "contacted own upsert" on public.investor_contacted_projects for insert with check (auth.uid() = investor_auth_id);

drop policy if exists "notifications own read" on public.user_notifications;
create policy "notifications own read" on public.user_notifications for select using (auth.uid() = user_auth_id);
drop policy if exists "notifications own update" on public.user_notifications;
create policy "notifications own update" on public.user_notifications for update using (auth.uid() = user_auth_id);

drop policy if exists "activity own read" on public.user_activity;
create policy "activity own read" on public.user_activity for select using (auth.uid() = user_auth_id);
