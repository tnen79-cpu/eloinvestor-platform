-- v50 Interest + Forgot Password stability fix
-- شغّل هذا الملف بعد v49/v48.

-- تأكيد جدول اهتمام المستثمر
create table if not exists public.project_interests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  investor_auth_id uuid not null,
  status text default 'interested',
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id, investor_auth_id)
);

alter table public.project_interests add column if not exists updated_at timestamptz default now();
alter table public.project_interests enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_interests' and policyname='Investor can insert own project interests') then
    create policy "Investor can insert own project interests" on public.project_interests
    for insert with check (auth.uid() = investor_auth_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_interests' and policyname='Investor can update own project interests') then
    create policy "Investor can update own project interests" on public.project_interests
    for update using (auth.uid() = investor_auth_id) with check (auth.uid() = investor_auth_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_interests' and policyname='Investor can read own project interests') then
    create policy "Investor can read own project interests" on public.project_interests
    for select using (auth.uid() = investor_auth_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_interests' and policyname='Owners can read interests on their projects') then
    create policy "Owners can read interests on their projects" on public.project_interests
    for select using (exists (
      select 1 from public.projects p
      where p.id = project_interests.project_id
      and (p.owner_auth_id = auth.uid() or p.user_id = auth.uid() or p.created_by = auth.uid() or p.auth_id = auth.uid())
    ));
  end if;
end $$;

-- توافق notifications بين message و body
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  title text not null default '',
  message text,
  body text,
  type text default 'general',
  link_url text,
  is_read boolean default false,
  created_at timestamptz default now()
);
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists body text;
alter table public.notifications add column if not exists link_url text;
alter table public.notifications add column if not exists type text default 'general';
alter table public.notifications add column if not exists is_read boolean default false;
update public.notifications set message = body where message is null and body is not null;
update public.notifications set body = message where body is null and message is not null;
