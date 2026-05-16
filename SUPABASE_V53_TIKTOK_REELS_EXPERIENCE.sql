-- =========================================================
-- EloInvestor v53 TikTok-style Reels Experience
-- - Fullscreen reels support
-- - Likes / shares / contact counters
-- - RLS policies for video interactions
-- - Safe SQL without ON CONFLICT
-- =========================================================

begin;

create extension if not exists pgcrypto;

-- =========================
-- PROJECT VIDEOS compatibility
-- =========================
create table if not exists public.project_videos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  user_auth_id uuid,
  video_url text,
  file_url text,
  title text,
  file_name text,
  sort_order integer default 0,
  is_active boolean default true,
  likes_count integer default 0,
  shares_count integer default 0,
  contacts_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.project_videos add column if not exists project_id uuid;
alter table public.project_videos add column if not exists user_auth_id uuid;
alter table public.project_videos add column if not exists video_url text;
alter table public.project_videos add column if not exists file_url text;
alter table public.project_videos add column if not exists title text;
alter table public.project_videos add column if not exists file_name text;
alter table public.project_videos add column if not exists sort_order integer default 0;
alter table public.project_videos add column if not exists is_active boolean default true;
alter table public.project_videos add column if not exists likes_count integer default 0;
alter table public.project_videos add column if not exists shares_count integer default 0;
alter table public.project_videos add column if not exists contacts_count integer default 0;
alter table public.project_videos add column if not exists created_at timestamptz default now();
alter table public.project_videos add column if not exists updated_at timestamptz default now();

update public.project_videos
set likes_count = coalesce(likes_count, 0),
    shares_count = coalesce(shares_count, 0),
    contacts_count = coalesce(contacts_count, 0),
    is_active = coalesce(is_active, true);

create index if not exists idx_project_videos_project_id on public.project_videos(project_id);
create index if not exists idx_project_videos_active_created on public.project_videos(is_active, created_at desc);

-- Clean orphan videos before FK
alter table public.project_videos drop constraint if exists project_videos_project_id_fkey;

delete from public.project_videos v
where v.project_id is not null
  and not exists (select 1 from public.projects p where p.id = v.project_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'project_videos_project_id_fkey') then
    alter table public.project_videos
    add constraint project_videos_project_id_fkey
    foreign key (project_id) references public.projects(id) on delete cascade;
  end if;
end $$;

-- =========================
-- LIKES
-- =========================
create table if not exists public.project_video_likes (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null,
  project_id uuid,
  user_auth_id uuid not null,
  created_at timestamptz default now()
);

alter table public.project_video_likes add column if not exists video_id uuid;
alter table public.project_video_likes add column if not exists project_id uuid;
alter table public.project_video_likes add column if not exists user_auth_id uuid;
alter table public.project_video_likes add column if not exists created_at timestamptz default now();

alter table public.project_video_likes alter column video_id drop not null;
alter table public.project_video_likes alter column user_auth_id drop not null;

-- Clean orphan likes
alter table public.project_video_likes drop constraint if exists project_video_likes_video_id_fkey;

delete from public.project_video_likes l
where l.video_id is not null
  and not exists (select 1 from public.project_videos v where v.id = l.video_id);

-- Remove duplicate likes before unique
with ranked as (
  select ctid, row_number() over (partition by video_id, user_auth_id order by created_at desc nulls last) as rn
  from public.project_video_likes
  where video_id is not null and user_auth_id is not null
)
delete from public.project_video_likes l
using ranked r
where l.ctid = r.ctid and r.rn > 1;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'project_video_likes_video_user_unique') then
    alter table public.project_video_likes
    add constraint project_video_likes_video_user_unique unique (video_id, user_auth_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'project_video_likes_video_id_fkey') then
    alter table public.project_video_likes
    add constraint project_video_likes_video_id_fkey
    foreign key (video_id) references public.project_videos(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_project_video_likes_video_id on public.project_video_likes(video_id);
create index if not exists idx_project_video_likes_user_auth_id on public.project_video_likes(user_auth_id);

-- =========================
-- SHARES
-- =========================
create table if not exists public.project_video_shares (
  id uuid primary key default gen_random_uuid(),
  video_id uuid,
  project_id uuid,
  user_auth_id uuid,
  share_url text,
  created_at timestamptz default now()
);

alter table public.project_video_shares add column if not exists video_id uuid;
alter table public.project_video_shares add column if not exists project_id uuid;
alter table public.project_video_shares add column if not exists user_auth_id uuid;
alter table public.project_video_shares add column if not exists share_url text;
alter table public.project_video_shares add column if not exists created_at timestamptz default now();

alter table public.project_video_shares drop constraint if exists project_video_shares_video_id_fkey;

delete from public.project_video_shares s
where s.video_id is not null
  and not exists (select 1 from public.project_videos v where v.id = s.video_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'project_video_shares_video_id_fkey') then
    alter table public.project_video_shares
    add constraint project_video_shares_video_id_fkey
    foreign key (video_id) references public.project_videos(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_project_video_shares_video_id on public.project_video_shares(video_id);

-- =========================
-- Counter functions / triggers
-- =========================
create or replace function public.refresh_project_video_likes_count(p_video_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.project_videos
  set likes_count = (
    select count(*)::integer from public.project_video_likes where video_id = p_video_id
  ),
  updated_at = now()
  where id = p_video_id;
end;
$$;

create or replace function public.project_video_likes_count_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_project_video_likes_count(new.video_id);
    return new;
  elsif tg_op = 'DELETE' then
    perform public.refresh_project_video_likes_count(old.video_id);
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_project_video_likes_count_insert on public.project_video_likes;
drop trigger if exists trg_project_video_likes_count_delete on public.project_video_likes;

create trigger trg_project_video_likes_count_insert
after insert on public.project_video_likes
for each row execute function public.project_video_likes_count_trigger();

create trigger trg_project_video_likes_count_delete
after delete on public.project_video_likes
for each row execute function public.project_video_likes_count_trigger();

create or replace function public.project_video_shares_count_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.project_videos
  set shares_count = coalesce(shares_count, 0) + 1,
      updated_at = now()
  where id = new.video_id;
  return new;
end;
$$;

drop trigger if exists trg_project_video_shares_count_insert on public.project_video_shares;
create trigger trg_project_video_shares_count_insert
after insert on public.project_video_shares
for each row execute function public.project_video_shares_count_trigger();

create or replace function public.increment_project_video_contact(p_video_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.project_videos
  set contacts_count = coalesce(contacts_count, 0) + 1,
      updated_at = now()
  where id = p_video_id;
end;
$$;

-- Existing project contact counter fallback
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
exception when undefined_column then
  update public.projects
  set updated_at = now()
  where id = p_project_id;
end;
$$;

-- Rebuild counts once
update public.project_videos v
set likes_count = coalesce((select count(*)::integer from public.project_video_likes l where l.video_id = v.id), 0),
    shares_count = coalesce((select count(*)::integer from public.project_video_shares s where s.video_id = v.id), 0);

-- =========================
-- RLS Policies
-- =========================
alter table public.project_videos enable row level security;
alter table public.project_video_likes enable row level security;
alter table public.project_video_shares enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_videos' and policyname='project_videos_public_read') then
    create policy project_videos_public_read on public.project_videos for select using (is_active = true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_videos' and policyname='project_videos_owner_insert') then
    create policy project_videos_owner_insert on public.project_videos for insert with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_videos' and policyname='project_videos_owner_update') then
    create policy project_videos_owner_update on public.project_videos for update using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_video_likes' and policyname='project_video_likes_all') then
    create policy project_video_likes_all on public.project_video_likes for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_video_shares' and policyname='project_video_shares_all') then
    create policy project_video_shares_all on public.project_video_shares for all using (true) with check (true);
  end if;
end $$;

-- =========================
-- Storage bucket for project videos
-- =========================
insert into storage.buckets (id, name, public)
select 'project-videos', 'project-videos', true
where not exists (select 1 from storage.buckets where id='project-videos');

-- Storage policies for project-videos bucket
-- Supabase storage policies names are global per table, so use unique policy names.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='project_videos_public_read_v53') then
    create policy project_videos_public_read_v53 on storage.objects for select using (bucket_id = 'project-videos');
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='project_videos_upload_v53') then
    create policy project_videos_upload_v53 on storage.objects for insert with check (bucket_id = 'project-videos');
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='project_videos_update_v53') then
    create policy project_videos_update_v53 on storage.objects for update using (bucket_id = 'project-videos') with check (bucket_id = 'project-videos');
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='project_videos_delete_v53') then
    create policy project_videos_delete_v53 on storage.objects for delete using (bucket_id = 'project-videos');
  end if;
end $$;

commit;
