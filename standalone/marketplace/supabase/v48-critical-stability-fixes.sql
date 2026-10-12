-- v48 Critical stability fixes
-- Run after previous v38-v47 SQL files.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  title text,
  message text,
  body text,
  type text default 'info',
  link_url text,
  is_read boolean default false,
  created_by uuid,
  created_at timestamptz default now()
);

create table if not exists public.platform_ads (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  image_url text,
  link_url text,
  button_text text,
  placement text default 'home_top',
  sort_order int default 0,
  is_active boolean default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 1) Keep notifications compatible with old and new functions.
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists body text;
update public.notifications set message = coalesce(message, body) where message is null and body is not null;
update public.notifications set body = coalesce(body, message) where body is null and message is not null;

-- 2) Make ads optional text fields truly optional.
alter table public.platform_ads add column if not exists title text;
alter table public.platform_ads add column if not exists subtitle text;
alter table public.platform_ads add column if not exists button_text text;
alter table public.platform_ads add column if not exists placement text default 'home_top';
alter table public.platform_ads add column if not exists sort_order int default 0;
alter table public.platform_ads add column if not exists starts_at timestamptz;
alter table public.platform_ads add column if not exists ends_at timestamptz;
alter table public.platform_ads alter column title drop not null;
alter table public.platform_ads alter column title drop default;
alter table public.platform_ads alter column subtitle drop default;
alter table public.platform_ads alter column button_text drop default;

-- 3) Disable old demo/fallback ads so nothing appears unless the admin enables it.
update public.platform_ads
set is_active = false
where coalesce(link_url,'#') = '#'
  and (title ilike '%مساحة إعلانية%' or subtitle ilike '%ضع إعلانك%' or button_text in ('اعرف المزيد','أعلن الآن','تواصل معنا'));

-- 4) Recreate payment approval function using notifications.message and body together.
create or replace function public.approve_payment_request(request_id uuid, admin_note_text text default null)
returns void
language plpgsql
security definer
as $$
declare
  req record;
  expiry timestamptz;
begin
  select * into req from public.payment_requests where id = request_id;
  if req is null then
    raise exception 'payment request not found';
  end if;

  expiry := now() + make_interval(days => coalesce(req.days, 30));

  update public.payment_requests
  set status = 'approved', admin_note = admin_note_text, reviewed_at = now(), reviewed_by = auth.uid()
  where id = request_id;

  update public.users
  set plan = req.plan,
      subscription_status = 'active',
      subscription_expires_at = expiry,
      remaining_projects = coalesce(remaining_projects, 0) + coalesce(req.credits, 0),
      featured_projects = coalesce(featured_projects, 0) + coalesce(req.featured_projects, 0),
      paid_owner_requests_enabled = true
  where auth_id = req.user_auth_id;

  insert into public.notifications(user_auth_id, title, message, body, type, link_url, created_by)
  values (
    req.user_auth_id,
    'تم تفعيل الباقة',
    'تمت الموافقة على طلب الدفع وتفعيل باقتك بنجاح.',
    'تمت الموافقة على طلب الدفع وتفعيل باقتك بنجاح.',
    'payment',
    'user-dashboard.html#packages',
    auth.uid()
  );
end;
$$;
