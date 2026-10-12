-- v40 Admin Ads Panel
-- شغّل هذا الملف بعد v39 حتى تظهر إدارة الإعلانات وتعمل إضافة/تعديل/حذف من لوحة الإدارة.

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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.platform_ads add column if not exists updated_at timestamptz default now();
alter table public.platform_ads enable row level security;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.auth_id = auth.uid()
      and lower(coalesce(u.role,'')) = 'admin'
  )
  or exists (
    select 1 from public.admin_staff s
    where s.auth_id = auth.uid()
      and coalesce(s.is_active,true) = true
  );
$$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='platform_ads' and policyname='Public can read active ads') then
    create policy "Public can read active ads" on public.platform_ads
      for select using (
        is_active = true
        and (starts_at is null or starts_at <= now())
        and (ends_at is null or ends_at >= now())
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='platform_ads' and policyname='Admins can manage ads') then
    create policy "Admins can manage ads" on public.platform_ads
      for all using (public.is_platform_admin())
      with check (public.is_platform_admin());
  end if;
end $$;

insert into public.platform_ads (title, subtitle, image_url, link_url, button_text, placement, sort_order, is_active)
select 'مساحة إعلانية', 'ضع إعلانك أمام المستثمرين المهتمين', 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80', 'add-project.html', 'تواصل معنا', 'home_top', 1, true
where not exists (select 1 from public.platform_ads where placement='home_top');
