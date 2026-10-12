-- إلو مستثمر v15
-- ربط ميزة طلبات المستثمرين بالباقات المدفوعة بدون recursion على جدول users.
-- شغل هذا بعد v11/v12/v13/v14 أو بدل v14 إذا ظهر عندك recursion.

alter table public.users
  add column if not exists plan text default 'free',
  add column if not exists subscription_status text default 'free',
  add column if not exists remaining_projects integer default 1,
  add column if not exists featured_projects integer default 0,
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists paid_owner_requests_enabled boolean default false;

create table if not exists public.plan_purchases (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid not null,
  plan text not null,
  amount_omr numeric default 0,
  credits_added integer default 0,
  featured_added integer default 0,
  status text default 'demo_active',
  created_at timestamptz default now()
);

alter table public.plan_purchases enable row level security;

drop policy if exists "users can read own plan purchases" on public.plan_purchases;
create policy "users can read own plan purchases"
on public.plan_purchases
for select
using (auth.uid() = user_auth_id);

drop policy if exists "users can insert own plan purchases" on public.plan_purchases;
create policy "users can insert own plan purchases"
on public.plan_purchases
for insert
with check (auth.uid() = user_auth_id);

-- دالة آمنة تفحص إذا صاحب المشروع يملك المشروع وعنده باقة مدفوعة.
-- SECURITY DEFINER لتفادي infinite recursion الناتج من RLS على users.
create or replace function public.owner_has_paid_access_for_project(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    join public.users u on u.auth_id = auth.uid()
    where p.id = target_project_id
      and p.user_id = auth.uid()
      and (
        coalesce(u.paid_owner_requests_enabled, false) = true
        or lower(coalesce(u.subscription_status, 'free')) in ('active', 'paid', 'premium', 'pro', 'business')
        or lower(coalesce(u.plan, 'free')) in ('starter', 'premium', 'pro', 'business', 'paid')
      )
      and (
        u.subscription_expires_at is null
        or u.subscription_expires_at > now()
      )
  );
$$;

revoke all on function public.owner_has_paid_access_for_project(uuid) from public;
grant execute on function public.owner_has_paid_access_for_project(uuid) to authenticated;

alter table public.investor_contacted_projects enable row level security;

drop policy if exists "owners can read contacts for own projects" on public.investor_contacted_projects;
drop policy if exists "investors can read contacted projects" on public.investor_contacted_projects;
drop policy if exists "contacted own read" on public.investor_contacted_projects;

create policy "investors and paid owners can read contacted projects"
on public.investor_contacted_projects
for select
using (
  auth.uid() = investor_auth_id
  or public.owner_has_paid_access_for_project(project_id)
);

drop policy if exists "investors can register contacted projects" on public.investor_contacted_projects;
drop policy if exists "contacted own upsert" on public.investor_contacted_projects;

create policy "investors can register contacted projects"
on public.investor_contacted_projects
for insert
with check (auth.uid() = investor_auth_id);

-- مهم: لا تنشئ policy على users لقراءة المستثمرين عبر JOIN لأن هذا يسبب infinite recursion.
-- الواجهة تعتمد على بيانات investor_snapshot المخزنة وقت تواصل المستثمر.
