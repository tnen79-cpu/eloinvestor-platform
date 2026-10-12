-- v39 Marketplace Smart Features
-- شغّل هذا الملف بعد v38 لإضافة الحفظ، الاهتمام، الإعلانات، والإشعارات بدون كسر الجداول القديمة.

create table if not exists public.project_interests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  investor_auth_id uuid not null,
  status text default 'interested',
  note text,
  created_at timestamptz default now(),
  unique(project_id, investor_auth_id)
);

create table if not exists public.platform_ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  link_url text,
  button_text text default 'اعرف المزيد',
  placement text default 'home_top',
  sort_order int default 0,
  is_active boolean default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  title text not null,
  body text,
  type text default 'general',
  link_url text,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.project_interests enable row level security;
alter table public.platform_ads enable row level security;
alter table public.notifications enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='platform_ads' and policyname='Public can read active ads') then
    create policy "Public can read active ads" on public.platform_ads for select using (is_active = true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_interests' and policyname='Investor can manage own interests') then
    create policy "Investor can manage own interests" on public.project_interests for all using (auth.uid() = investor_auth_id) with check (auth.uid() = investor_auth_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='Users can read own notifications') then
    create policy "Users can read own notifications" on public.notifications for select using (auth.uid() = user_auth_id);
  end if;
end $$;

insert into public.platform_ads (title, subtitle, image_url, link_url, button_text, placement, sort_order, is_active)
select 'مساحة إعلانية', 'ضع إعلانك أمام المستثمرين المهتمين', 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80', 'add-project.html', 'تواصل معنا', 'home_top', 1, true
where not exists (select 1 from public.platform_ads where placement='home_top');
