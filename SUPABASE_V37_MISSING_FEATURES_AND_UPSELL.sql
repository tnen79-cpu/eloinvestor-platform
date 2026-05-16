-- EloInvestor v37 - Missing feature completion + post-project promotion upsell support
-- Run after SUPABASE_V36_FEATURE_SUGGESTIONS.sql

-- 1) Auto welcome message for project owners
alter table public.users add column if not exists auto_welcome_message text;
alter table public.users add column if not exists welcome_message text;

comment on column public.users.auto_welcome_message is 'Owner custom message automatically sent when an investor starts a conversation.';

-- 2) Promotion renewal helper fields
alter table public.promotion_requests add column if not exists renewed_from uuid;
alter table public.promotion_requests add column if not exists renewal_request_count integer not null default 0;
alter table public.promotion_requests add column if not exists last_renewal_requested_at timestamptz;

-- 3) One-click renewal request RPC. It creates a new pending promotion request copied from the previous one.
create or replace function public.request_promotion_renewal(p_request_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  source_row public.promotion_requests%rowtype;
  new_id uuid;
  requester uuid := auth.uid();
begin
  select * into source_row from public.promotion_requests where id = p_request_id;
  if source_row.id is null then
    raise exception 'Promotion request not found';
  end if;

  if requester is null or requester <> coalesce(source_row.user_auth_id, source_row.owner_auth_id) then
    raise exception 'Not allowed';
  end if;

  insert into public.promotion_requests(
    project_id,
    user_auth_id,
    owner_auth_id,
    title,
    plan_key,
    plan_code,
    plan_name,
    placement,
    duration_days,
    price,
    amount,
    sponsor_weight,
    status,
    auto_renew,
    notes,
    note,
    country_code,
    renewed_from,
    starts_at,
    ends_at,
    created_at
  ) values (
    source_row.project_id,
    coalesce(source_row.user_auth_id, source_row.owner_auth_id),
    coalesce(source_row.owner_auth_id, source_row.user_auth_id),
    coalesce(source_row.title, 'تجديد ترويج'),
    source_row.plan_key,
    source_row.plan_code,
    source_row.plan_name,
    source_row.placement,
    coalesce(source_row.duration_days, 7),
    coalesce(source_row.price, source_row.amount, 0),
    coalesce(source_row.amount, source_row.price, 0),
    coalesce(source_row.sponsor_weight, 25),
    'pending_payment',
    false,
    'طلب تجديد ترويج بنقرة واحدة',
    'طلب تجديد ترويج بنقرة واحدة',
    source_row.country_code,
    source_row.id,
    now(),
    now() + make_interval(days => coalesce(source_row.duration_days, 7)),
    now()
  ) returning id into new_id;

  update public.promotion_requests
  set renewal_request_count = coalesce(renewal_request_count, 0) + 1,
      last_renewal_requested_at = now()
  where id = source_row.id;

  insert into public.notifications(user_auth_id, title, body, type, is_read, created_at)
  values (
    coalesce(source_row.user_auth_id, source_row.owner_auth_id),
    'تم إنشاء طلب تجديد الترويج',
    'تم تجهيز طلب تجديد الترويج، وسيتم تفعيله بعد الدفع أو مراجعة الإدارة.',
    'promotion_renewal_requested',
    false,
    now()
  );

  return new_id;
end;
$$;

-- 4) Saved search trigger: notify matching investors when a project is approved/published.
create or replace function public.notify_saved_search_matches_for_project()
returns trigger
language plpgsql
security definer
as $$
declare
  inserted_count integer := 0;
begin
  if lower(coalesce(new.status,'')) not in ('approved','active','published') then
    return new;
  end if;

  insert into public.notifications(user_auth_id, title, body, type, is_read, created_at)
  select distinct
    ss.user_auth_id,
    'فرصة جديدة تطابق بحثك',
    'تم نشر مشروع جديد يطابق بحثك المحفوظ: ' || coalesce(ss.title, 'بحث محفوظ'),
    'saved_search_match',
    false,
    now()
  from public.saved_searches ss
  where ss.is_active = true
    and coalesce(ss.country_code, 'om') = coalesce(new.country_code, 'om')
    and (coalesce(ss.category,'') = '' or coalesce(new.category, new.sector, '') = ss.category)
    and (coalesce(ss.city,'') = '' or coalesce(new.city, new.governorate, new.location, '') ilike '%' || ss.city || '%')
    and (coalesce(ss.price_min,0) = 0 or coalesce(new.price, new.project_price, new.asking_price, 0) >= ss.price_min)
    and (coalesce(ss.price_max,0) = 0 or coalesce(new.price, new.project_price, new.asking_price, 0) <= ss.price_max)
    and (coalesce(ss.roi_min,0) = 0 or coalesce(new.roi, new.profit_percentage, 0) >= ss.roi_min)
    and ss.user_auth_id is not null;

  get diagnostics inserted_count = row_count;
  if inserted_count > 0 then
    update public.saved_searches
    set last_notified_at = now(), updated_at = now()
    where is_active = true
      and coalesce(country_code, 'om') = coalesce(new.country_code, 'om');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_saved_search_matches_for_project on public.projects;
create trigger trg_notify_saved_search_matches_for_project
after insert or update of status on public.projects
for each row execute function public.notify_saved_search_matches_for_project();

-- 5) Optional daily reminders for expiring promotions. Enable pg_cron in Supabase before using this block.
-- select cron.schedule('elo-promotion-renewal-reminders', '0 8 * * *', $$select public.notify_promotions_expiring_soon();$$);

-- 6) RLS policy for renewal RPC reads still relies on existing promotion_requests policies.
-- If your promotion_requests table has no owner read policy yet, add a safe owner policy:
do $$ begin
  create policy promotion_requests_owner_select on public.promotion_requests
  for select using (auth.uid() = coalesce(user_auth_id, owner_auth_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy promotion_requests_owner_insert on public.promotion_requests
  for insert with check (auth.uid() = coalesce(user_auth_id, owner_auth_id));
exception when duplicate_object then null; end $$;
