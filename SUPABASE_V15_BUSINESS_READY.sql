-- EloInvestor v15 Business Ready
-- Saved projects, investor premium suggestions, paid project verification, and package requests.

create extension if not exists pgcrypto;

create table if not exists investor_saved_projects (
  id uuid primary key default gen_random_uuid(),
  investor_auth_id uuid not null,
  project_id uuid not null,
  project_snapshot jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique (investor_auth_id, project_id)
);

create table if not exists investor_contacted_projects (
  id uuid primary key default gen_random_uuid(),
  investor_auth_id uuid not null,
  project_id uuid,
  conversation_id uuid,
  project_snapshot jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique (investor_auth_id, project_id)
);

create table if not exists package_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid not null,
  current_plan text default 'free',
  requested_plan text not null,
  status text default 'pending',
  note text,
  created_at timestamptz default now(),
  reviewed_at timestamptz,
  admin_note text
);

create table if not exists investor_recommendation_logs (
  id uuid primary key default gen_random_uuid(),
  investor_auth_id uuid not null,
  project_id uuid not null,
  score numeric default 0,
  source text default 'preferences',
  created_at timestamptz default now(),
  unique (investor_auth_id, project_id)
);

alter table users add column if not exists preferred_categories text[] default '{}';
alter table users add column if not exists preferred_location text;
alter table users add column if not exists budget_min numeric default 0;
alter table users add column if not exists budget_max numeric default 0;
alter table users add column if not exists investor_preferences jsonb default '{}'::jsonb;
alter table users add column if not exists subscription_status text default 'free';
alter table users add column if not exists plan text default 'free';
alter table users add column if not exists remaining_projects integer default 1;

alter table verification_requests add column if not exists project_id uuid;
alter table verification_requests add column if not exists document_name text;
alter table verification_requests add column if not exists document_url text;
alter table verification_requests add column if not exists file_url text;
alter table verification_requests add column if not exists file_path text;
alter table verification_requests add column if not exists storage_path text;
alter table verification_requests add column if not exists title text;
alter table verification_requests add column if not exists note text;

create index if not exists idx_saved_investor on investor_saved_projects(investor_auth_id, created_at desc);
create index if not exists idx_saved_project on investor_saved_projects(project_id);
create index if not exists idx_contacted_investor on investor_contacted_projects(investor_auth_id, created_at desc);
create index if not exists idx_upgrade_user on package_upgrade_requests(user_auth_id, created_at desc);
create index if not exists idx_recommendation_user on investor_recommendation_logs(investor_auth_id, created_at desc);

alter table investor_saved_projects enable row level security;
alter table investor_contacted_projects enable row level security;
alter table package_upgrade_requests enable row level security;
alter table investor_recommendation_logs enable row level security;

create policy if not exists "saved_select_own" on investor_saved_projects for select to authenticated using (auth.uid() = investor_auth_id);
create policy if not exists "saved_insert_own" on investor_saved_projects for insert to authenticated with check (auth.uid() = investor_auth_id);
create policy if not exists "saved_delete_own" on investor_saved_projects for delete to authenticated using (auth.uid() = investor_auth_id);

create policy if not exists "contacted_select_own" on investor_contacted_projects for select to authenticated using (auth.uid() = investor_auth_id);
create policy if not exists "contacted_insert_own" on investor_contacted_projects for insert to authenticated with check (auth.uid() = investor_auth_id);

create policy if not exists "upgrade_select_own" on package_upgrade_requests for select to authenticated using (auth.uid() = user_auth_id);
create policy if not exists "upgrade_insert_own" on package_upgrade_requests for insert to authenticated with check (auth.uid() = user_auth_id);

create policy if not exists "recommendations_select_own" on investor_recommendation_logs for select to authenticated using (auth.uid() = investor_auth_id);
create policy if not exists "recommendations_insert_own" on investor_recommendation_logs for insert to authenticated with check (auth.uid() = investor_auth_id);

-- Storage bucket should exist in Supabase Storage:
-- project-images
-- verification-docs
