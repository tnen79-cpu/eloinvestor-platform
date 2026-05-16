-- EloInvestor v40 Payments Core Rebuild
-- نظام دفع مركزي يدعم: الباقات، الاشتراكات، الترويج، Boost 24 ساعة، وسجل عمليات الدفع للإدارة.

create extension if not exists pgcrypto;

create table if not exists public.payment_gateway_settings (
  provider text primary key,
  is_enabled boolean not null default true,
  mode text not null default 'test' check (mode in ('test','live')),
  base_url text not null default 'https://uatcheckout.thawani.om/api/v1',
  checkout_url text not null default 'https://uatcheckout.thawani.om',
  publishable_key text,
  secret_key text,
  webhook_url text,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'thawani',
  payment_type text not null default 'promotion' check (payment_type in ('promotion','package','subscription','boost')),
  purpose text,
  reference_type text,
  reference_id text,
  user_auth_id uuid,
  project_id uuid,
  promotion_request_id uuid,
  plan_code text,
  amount numeric(12,3) not null default 0,
  currency text not null default 'OMR',
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded','expired','cancelled')),
  provider_session_id text unique,
  provider_payment_id text,
  provider_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  webhook_status text,
  paid_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments add column if not exists payment_type text default 'promotion';
alter table public.payments add column if not exists purpose text;
alter table public.payments add column if not exists reference_type text;
alter table public.payments add column if not exists reference_id text;
alter table public.payments add column if not exists user_auth_id uuid;
alter table public.payments add column if not exists project_id uuid;
alter table public.payments add column if not exists promotion_request_id uuid;
alter table public.payments add column if not exists plan_code text;
alter table public.payments add column if not exists amount numeric(12,3) default 0;
alter table public.payments add column if not exists currency text default 'OMR';
alter table public.payments add column if not exists status text default 'pending';
alter table public.payments add column if not exists provider_session_id text;
alter table public.payments add column if not exists provider_payment_id text;
alter table public.payments add column if not exists provider_payload jsonb default '{}'::jsonb;
alter table public.payments add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.payments add column if not exists webhook_status text;
alter table public.payments add column if not exists paid_at timestamptz;
alter table public.payments add column if not exists verified_at timestamptz;
alter table public.payments add column if not exists updated_at timestamptz default now();

create index if not exists payments_user_auth_id_idx on public.payments(user_auth_id);
create index if not exists payments_status_idx on public.payments(status);
create index if not exists payments_type_idx on public.payments(payment_type);
create index if not exists payments_created_at_idx on public.payments(created_at desc);
create index if not exists payments_provider_session_id_idx on public.payments(provider_session_id);

alter table public.promotion_requests add column if not exists payment_status text default 'unpaid';
alter table public.promotion_requests add column if not exists payment_provider text;
alter table public.promotion_requests add column if not exists payment_session_id text;
alter table public.promotion_requests add column if not exists paid_at timestamptz;
alter table public.promotion_requests add column if not exists payment_payload jsonb default '{}'::jsonb;

alter table public.users add column if not exists plan text default 'free';
alter table public.users add column if not exists subscription_status text default 'free';
alter table public.users add column if not exists subscription_expires_at timestamptz;
alter table public.users add column if not exists remaining_projects integer default 1;

create or replace function public.touch_payments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.status = 'paid' and old.status is distinct from 'paid' and new.paid_at is null then
    new.paid_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_touch_payments_updated_at on public.payments;
create trigger trg_touch_payments_updated_at
before update on public.payments
for each row execute function public.touch_payments_updated_at();

create or replace view public.admin_payment_summary as
select
  count(*)::int as total_payments,
  count(*) filter (where status = 'paid')::int as paid_payments,
  count(*) filter (where status = 'pending')::int as pending_payments,
  coalesce(sum(amount) filter (where status = 'paid'), 0)::numeric(12,3) as total_revenue,
  coalesce(sum(amount) filter (where status = 'paid' and payment_type = 'promotion'), 0)::numeric(12,3) as promotion_revenue,
  coalesce(sum(amount) filter (where status = 'paid' and payment_type in ('package','subscription')), 0)::numeric(12,3) as package_revenue,
  coalesce(sum(amount) filter (where status = 'paid' and payment_type = 'boost'), 0)::numeric(12,3) as boost_revenue
from public.payments;

alter table public.payment_gateway_settings enable row level security;
alter table public.payments enable row level security;

drop policy if exists payment_gateway_settings_admin_all on public.payment_gateway_settings;
create policy payment_gateway_settings_admin_all on public.payment_gateway_settings
for all using (
  exists (
    select 1 from public.users u
    where (u.auth_id = auth.uid() or u.id = auth.uid())
      and (u.is_admin = true or coalesce(u.admin_role, u.role) in ('admin','super_admin','finance_admin'))
      and coalesce(u.admin_status, 'active') not in ('suspended','revoked','inactive')
  )
) with check (
  exists (
    select 1 from public.users u
    where (u.auth_id = auth.uid() or u.id = auth.uid())
      and (u.is_admin = true or coalesce(u.admin_role, u.role) in ('admin','super_admin','finance_admin'))
      and coalesce(u.admin_status, 'active') not in ('suspended','revoked','inactive')
  )
);

drop policy if exists payments_owner_select on public.payments;
create policy payments_owner_select on public.payments
for select using (user_auth_id = auth.uid());

drop policy if exists payments_admin_all on public.payments;
create policy payments_admin_all on public.payments
for all using (
  exists (
    select 1 from public.users u
    where (u.auth_id = auth.uid() or u.id = auth.uid())
      and (u.is_admin = true or coalesce(u.admin_role, u.role) in ('admin','super_admin','finance_admin'))
      and coalesce(u.admin_status, 'active') not in ('suspended','revoked','inactive')
  )
) with check (
  exists (
    select 1 from public.users u
    where (u.auth_id = auth.uid() or u.id = auth.uid())
      and (u.is_admin = true or coalesce(u.admin_role, u.role) in ('admin','super_admin','finance_admin'))
      and coalesce(u.admin_status, 'active') not in ('suspended','revoked','inactive')
  )
);

insert into public.payment_gateway_settings(provider, is_enabled, mode, base_url, checkout_url, webhook_url)
values ('thawani', true, 'test', 'https://uatcheckout.thawani.om/api/v1', 'https://uatcheckout.thawani.om', '/api/payments/thawani/webhook')
on conflict (provider) do nothing;
