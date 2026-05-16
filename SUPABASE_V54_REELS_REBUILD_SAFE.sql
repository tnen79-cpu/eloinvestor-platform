-- =========================================================
-- EloInvestor v54 Reels Rebuild Safe SQL
-- - يجعل صفحة الريلز تقرأ من project_videos
-- - يفتح قراءة الفيديوهات المنشورة للزوار
-- - يصلح is_active والقيم الناقصة
-- - يجهز لايك/مشاركة/تواصل بدون ON CONFLICT
-- =========================================================

begin;

create extension if not exists pgcrypto;

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
set video_url = coalesce(video_url, file_url),
    file_url = coalesce(file_url, video_url),
    is_active = coalesce(is_active, true),
    likes_count = coalesce(likes_count, 0),
    shares_count = coalesce(shares_count, 0),
    contacts_count = coalesce(contacts_count, 0),
    updated_at = now();

alter table public.projects add column if not exists video_url text;
alter table public.projects add column if not exists has_video boolean default false;

update public.projects p
set video_url = pv.video_url,
    has_video = true,
    updated_at = now()
from (
  select distinct on (project_id)
    project_id,
    coalesce(video_url, file_url) as video_url
  from public.project_videos
  where coalesce(video_url, file_url) is not null
  order by project_id, created_at desc
) pv
where pv.project_id = p.id;

create index if not exists idx_project_videos_project_id on public.project_videos(project_id);
create index if not exists idx_project_videos_active_created on public.project_videos(is_active, created_at desc);

-- لا نحذف فيديوهات يتيمة هنا حتى لا تضيع بيانات أثناء التطوير، لكن الصفحة ستعرض الفيديو حتى لو بيانات المشروع ناقصة.

create table if not exists public.project_video_likes (
  id uuid primary key default gen_random_uuid(),
  video_id uuid,
  project_id uuid,
  user_auth_id uuid,
  created_at timestamptz default now()
);

alter table public.project_video_likes add column if not exists video_id uuid;
alter table public.project_video_likes add column if not exists project_id uuid;
alter table public.project_video_likes add column if not exists user_auth_id uuid;
alter table public.project_video_likes add column if not exists created_at timestamptz default now();

with ranked as (
  select ctid, row_number() over (partition by video_id, user_auth_id order by created_at desc nulls last) rn
  from public.project_video_likes
  where video_id is not null and user_auth_id is not null
)
delete from public.project_video_likes l using ranked r where l.ctid = r.ctid and r.rn > 1;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='project_video_likes_video_user_unique') then
    alter table public.project_video_likes add constraint project_video_likes_video_user_unique unique (video_id, user_auth_id);
  end if;
end $$;

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

create or replace function public.refresh_project_video_likes_count(p_video_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.project_videos
  set likes_count = (select count(*)::integer from public.project_video_likes where video_id = p_video_id),
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
  update public.projects set updated_at = now() where id = p_project_id;
end;
$$;

update public.project_videos v
set likes_count = coalesce((select count(*)::integer from public.project_video_likes l where l.video_id = v.id), 0),
    shares_count = coalesce((select count(*)::integer from public.project_video_shares s where s.video_id = v.id), 0),
    updated_at = now();

alter table public.project_videos enable row level security;
alter table public.project_video_likes enable row level security;
alter table public.project_video_shares enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_videos' and policyname='project_videos_reels_public_read_v54') then
    create policy project_videos_reels_public_read_v54 on public.project_videos for select using (coalesce(is_active, true) = true and coalesce(video_url, file_url) is not null);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_videos' and policyname='project_videos_reels_write_v54') then
    create policy project_videos_reels_write_v54 on public.project_videos for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_video_likes' and policyname='project_video_likes_reels_all_v54') then
    create policy project_video_likes_reels_all_v54 on public.project_video_likes for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_video_shares' and policyname='project_video_shares_reels_all_v54') then
    create policy project_video_shares_reels_all_v54 on public.project_video_shares for all using (true) with check (true);
  end if;
end $$;

insert into storage.buckets (id, name, public)
select 'project-videos', 'project-videos', true
where not exists (select 1 from storage.buckets where id='project-videos');

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='project_videos_public_read_v54') then
    create policy project_videos_public_read_v54 on storage.objects for select using (bucket_id = 'project-videos');
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='project_videos_upload_v54') then
    create policy project_videos_upload_v54 on storage.objects for insert with check (bucket_id = 'project-videos');
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='project_videos_update_v54') then
    create policy project_videos_update_v54 on storage.objects for update using (bucket_id = 'project-videos') with check (bucket_id = 'project-videos');
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='project_videos_delete_v54') then
    create policy project_videos_delete_v54 on storage.objects for delete using (bucket_id = 'project-videos');
  end if;
end $$;

commit;
