-- EloInvestor v39 - Admin payment gateway settings for Thawani
-- شغّل هذا الملف في Supabase SQL Editor قبل تجربة تبويب بوابة الدفع.

create table if not exists public.payment_gateway_settings (
  provider text primary key,
  is_enabled boolean not null default true,
  mode text not null default 'test' check (mode in ('test', 'live')),
  base_url text not null default 'https://uatcheckout.thawani.om/api/v1',
  checkout_url text not null default 'https://uatcheckout.thawani.om',
  publishable_key text,
  secret_key text,
  webhook_url text,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.payment_gateway_settings enable row level security;

-- لا نسمح بقراءة المفاتيح من المتصفح مباشرة. القراءة والكتابة تتم عبر API Route باستخدام service role.
drop policy if exists "payment_gateway_settings_no_client_select" on public.payment_gateway_settings;
create policy "payment_gateway_settings_no_client_select"
  on public.payment_gateway_settings
  for select
  using (false);

drop policy if exists "payment_gateway_settings_no_client_write" on public.payment_gateway_settings;
create policy "payment_gateway_settings_no_client_write"
  on public.payment_gateway_settings
  for all
  using (false)
  with check (false);

insert into public.payment_gateway_settings (
  provider,
  is_enabled,
  mode,
  base_url,
  checkout_url,
  webhook_url
) values (
  'thawani',
  true,
  'test',
  'https://uatcheckout.thawani.om/api/v1',
  'https://uatcheckout.thawani.om',
  'https://eloinvestor.com/api/payments/thawani/webhook'
)
on conflict (provider) do update set
  webhook_url = coalesce(public.payment_gateway_settings.webhook_url, excluded.webhook_url),
  updated_at = now();

-- تأكد أن جدول سجلات الإدارة موجود حتى يتم تسجيل تغيير إعدادات الدفع.
create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  admin_auth_id uuid,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
