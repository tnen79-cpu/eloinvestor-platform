-- =========================================================
-- EloInvestor v52 - Reels menu + Project video upload RLS fix
-- شغّل هذا الملف بعد v51. يحل مشكلة:
-- new row violates row-level security policy عند رفع فيديو المشروع
-- =========================================================

begin;

-- Bucket الفيديوهات
insert into storage.buckets (id, name, public)
select 'project-videos', 'project-videos', true
where not exists (select 1 from storage.buckets where id = 'project-videos');

update storage.buckets
set public = true
where id = 'project-videos';

-- جدول فيديوهات المشاريع
create table if not exists public.project_videos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  user_auth_id uuid,
  video_url text,
  file_url text,
  file_name text,
  title text,
  sort_order integer default 100,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.project_videos add column if not exists project_id uuid;
alter table public.project_videos add column if not exists user_auth_id uuid;
alter table public.project_videos add column if not exists video_url text;
alter table public.project_videos add column if not exists file_url text;
alter table public.project_videos add column if not exists file_name text;
alter table public.project_videos add column if not exists title text;
alter table public.project_videos add column if not exists sort_order integer default 100;
alter table public.project_videos add column if not exists is_active boolean default true;
alter table public.project_videos add column if not exists created_at timestamptz default now();
alter table public.project_videos add column if not exists updated_at timestamptz default now();

alter table public.project_videos enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='project_videos' and policyname='project_videos_public_select_v52'
  ) then
    create policy project_videos_public_select_v52
    on public.project_videos for select
    using (is_active = true or auth.uid() = user_auth_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='project_videos' and policyname='project_videos_auth_insert_v52'
  ) then
    create policy project_videos_auth_insert_v52
    on public.project_videos for insert
    with check (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='project_videos' and policyname='project_videos_auth_update_v52'
  ) then
    create policy project_videos_auth_update_v52
    on public.project_videos for update
    using (auth.uid() is not null)
    with check (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='project_videos' and policyname='project_videos_auth_delete_v52'
  ) then
    create policy project_videos_auth_delete_v52
    on public.project_videos for delete
    using (auth.uid() is not null);
  end if;
end $$;

create index if not exists idx_project_videos_project_id_v52 on public.project_videos(project_id);
create index if not exists idx_project_videos_user_auth_id_v52 on public.project_videos(user_auth_id);
create index if not exists idx_project_videos_active_v52 on public.project_videos(is_active, created_at);

-- Storage RLS policies for project-videos bucket
-- مهم: خطأ الفيديو غالباً من storage.objects وليس من project_videos.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='project_videos_public_read_v52'
  ) then
    create policy project_videos_public_read_v52
    on storage.objects for select
    using (bucket_id = 'project-videos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='project_videos_auth_upload_v52'
  ) then
    create policy project_videos_auth_upload_v52
    on storage.objects for insert
    with check (bucket_id = 'project-videos' and auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='project_videos_auth_update_v52'
  ) then
    create policy project_videos_auth_update_v52
    on storage.objects for update
    using (bucket_id = 'project-videos' and auth.role() = 'authenticated')
    with check (bucket_id = 'project-videos' and auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='project_videos_auth_delete_v52'
  ) then
    create policy project_videos_auth_delete_v52
    on storage.objects for delete
    using (bucket_id = 'project-videos' and auth.role() = 'authenticated');
  end if;
end $$;

commit;
