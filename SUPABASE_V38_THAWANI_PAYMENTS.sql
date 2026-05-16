-- EloInvestor v38 - Thawani payment gateway integration
-- Run this after v37 migrations.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'thawani',
  purpose text not null default 'promotion',
  user_auth_id uuid,
  promotion_request_id uuid,
  project_id uuid,
  amount numeric(12,3) not null default 0,
  currency text not null default 'OMR',
  status text not null default 'pending',
  provider_session_id text unique,
  provider_payment_id text,
  provider_payload jsonb default '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments enable row level security;

do $$ begin
  create policy payments_owner_can_read on public.payments
  for select using (auth.uid() = user_auth_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy payments_admin_can_read on public.payments
  for select using (exists (select 1 from public.users u where u.auth_id = auth.uid() and coalesce(u.role,'user') in ('admin','super_admin')));
exception when duplicate_object then null; end $$;

alter table public.promotion_requests
  add column if not exists payment_provider text,
  add column if not exists payment_session_id text,
  add column if not exists payment_status text default 'unpaid',
  add column if not exists paid_at timestamptz,
  add column if not exists payment_payload jsonb default '{}'::jsonb;

create index if not exists payments_provider_session_idx on public.payments(provider, provider_session_id);
create index if not exists payments_promotion_request_idx on public.payments(promotion_request_id);
create index if not exists promotion_requests_payment_session_idx on public.promotion_requests(payment_session_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists payments_touch_updated_at on public.payments;
create trigger payments_touch_updated_at
before update on public.payments
for each row execute function public.touch_updated_at();

-- Optional: admin summary view for revenue reports.
create or replace view public.admin_payment_revenue_monthly as
select
  date_trunc('month', created_at)::date as month,
  count(*) filter (where status = 'paid') as paid_orders,
  coalesce(sum(amount) filter (where status = 'paid'), 0) as paid_revenue_omr,
  coalesce(avg(amount) filter (where status = 'paid'), 0) as average_order_value_omr
from public.payments
group by 1
order by 1 desc;
