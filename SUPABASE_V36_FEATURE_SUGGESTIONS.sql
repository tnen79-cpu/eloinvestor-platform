-- EloInvestor v36 feature suggestions
-- Run after previous migrations.

-- 1) Saved searches for investors
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid not null,
  country_code text default 'om',
  title text,
  category text,
  city text,
  price_min numeric default 0,
  price_max numeric default 0,
  roi_min numeric default 0,
  is_active boolean default true,
  last_notified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists saved_searches_user_idx on public.saved_searches(user_auth_id, is_active);

-- 2) Ratings only for investors who contacted the project
create table if not exists public.deal_ratings (
  id uuid primary key default gen_random_uuid(),
  reviewer_auth_id uuid not null,
  reviewed_auth_id uuid,
  project_id uuid not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  status text not null default 'pending',
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz default now(),
  unique(reviewer_auth_id, project_id)
);
create index if not exists deal_ratings_project_idx on public.deal_ratings(project_id, status);

-- 3) NDA acceptances
create table if not exists public.project_nda_acceptances (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  investor_auth_id uuid not null,
  accepted_at timestamptz default now(),
  ip_address text,
  user_agent text,
  unique(project_id, investor_auth_id)
);
create index if not exists project_nda_acceptances_project_idx on public.project_nda_acceptances(project_id, investor_auth_id);

alter table public.project_documents add column if not exists requires_nda boolean default false;
alter table public.project_documents add column if not exists is_sensitive boolean default false;

-- 4) Promotion analytics safe atomic functions
alter table public.promotion_requests add column if not exists promotion_views integer not null default 0;
alter table public.promotion_requests add column if not exists promotion_clicks integer not null default 0;
alter table public.promotion_requests add column if not exists promotion_contacts integer not null default 0;
alter table public.promotion_requests add column if not exists renewal_notified_at timestamptz;
alter table public.promotion_requests add column if not exists auto_renew boolean default false;

create or replace function public.increment_active_promotion_metric(p_project_id uuid, metric_name text)
returns void
language plpgsql
security definer
as $$
begin
  update public.promotion_requests
  set
    promotion_views = promotion_views + case when metric_name = 'view' then 1 else 0 end,
    promotion_clicks = promotion_clicks + case when metric_name = 'click' then 1 else 0 end,
    promotion_contacts = promotion_contacts + case when metric_name = 'contact' then 1 else 0 end
  where project_id = p_project_id
    and lower(coalesce(status, '')) in ('active','approved','running')
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now());
end;
$$;

create or replace function public.increment_active_promotion_metric_atomic(p_project_id uuid, metric_name text)
returns void
language plpgsql
security definer
as $$
begin
  perform public.increment_active_promotion_metric(p_project_id, metric_name);
end;
$$;

-- Project counters atomic helpers
create or replace function public.increment_project_view_count(p_project_id uuid)
returns void language sql security definer as $$
  update public.projects set views_count = coalesce(views_count, 0) + 1 where id = p_project_id;
$$;

create or replace function public.increment_project_contact_count(p_project_id uuid)
returns void language sql security definer as $$
  update public.projects set contacts_count = coalesce(contacts_count, 0) + 1 where id = p_project_id;
$$;

-- 5) Promotion renewal reminder. Schedule daily from Supabase cron if enabled.
create or replace function public.notify_promotions_expiring_soon()
returns integer
language plpgsql
security definer
as $$
declare
  inserted_count integer := 0;
begin
  insert into public.notifications(user_auth_id, title, body, type, is_read, created_at)
  select
    coalesce(pr.user_auth_id, pr.owner_auth_id),
    'ترويجك سينتهي قريبًا',
    'باقي أقل من يومين على انتهاء الترويج. يمكنك التجديد من لوحة التحكم.',
    'promotion_renewal',
    false,
    now()
  from public.promotion_requests pr
  where lower(coalesce(pr.status,'')) in ('active','approved','running')
    and pr.ends_at between now() and now() + interval '2 days'
    and pr.renewal_notified_at is null
    and coalesce(pr.user_auth_id, pr.owner_auth_id) is not null;

  get diagnostics inserted_count = row_count;

  update public.promotion_requests
  set renewal_notified_at = now()
  where lower(coalesce(status,'')) in ('active','approved','running')
    and ends_at between now() and now() + interval '2 days'
    and renewal_notified_at is null;

  return inserted_count;
end;
$$;

-- 6) Saved search matching notifier. Can be called after approving/adding projects or by cron.
create or replace function public.notify_saved_search_matches()
returns integer
language plpgsql
security definer
as $$
declare
  inserted_count integer := 0;
begin
  insert into public.notifications(user_auth_id, title, body, type, is_read, created_at)
  select distinct
    ss.user_auth_id,
    'فرصة جديدة تطابق بحثك',
    'تمت إضافة مشروع جديد يطابق البحث المحفوظ: ' || coalesce(ss.title, 'بحث محفوظ'),
    'saved_search_match',
    false,
    now()
  from public.saved_searches ss
  join public.projects p on coalesce(p.country_code, 'om') = coalesce(ss.country_code, 'om')
  where ss.is_active = true
    and lower(coalesce(p.status,'')) in ('approved','active','published')
    and p.created_at > coalesce(ss.last_notified_at, ss.created_at - interval '1 day')
    and (coalesce(ss.category,'') = '' or coalesce(p.category, p.sector, '') = ss.category)
    and (coalesce(ss.city,'') = '' or coalesce(p.city, p.governorate, p.location, '') ilike '%' || ss.city || '%')
    and (coalesce(ss.price_min,0) = 0 or coalesce(p.price, p.project_price, p.asking_price, 0) >= ss.price_min)
    and (coalesce(ss.price_max,0) = 0 or coalesce(p.price, p.project_price, p.asking_price, 0) <= ss.price_max)
    and (coalesce(ss.roi_min,0) = 0 or coalesce(p.roi, p.profit_percentage, 0) >= ss.roi_min);

  get diagnostics inserted_count = row_count;
  update public.saved_searches set last_notified_at = now(), updated_at = now() where is_active = true;
  return inserted_count;
end;
$$;

-- RLS safe defaults
alter table public.saved_searches enable row level security;
alter table public.project_nda_acceptances enable row level security;
alter table public.deal_ratings enable row level security;

do $$ begin
  create policy saved_searches_owner_select on public.saved_searches for select using (auth.uid() = user_auth_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy saved_searches_owner_write on public.saved_searches for all using (auth.uid() = user_auth_id) with check (auth.uid() = user_auth_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy nda_owner_select on public.project_nda_acceptances for select using (auth.uid() = investor_auth_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy nda_owner_insert on public.project_nda_acceptances for insert with check (auth.uid() = investor_auth_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy deal_ratings_public_published on public.deal_ratings for select using (status = 'published' or auth.uid() = reviewer_auth_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy deal_ratings_contacted_insert on public.deal_ratings for insert with check (
    auth.uid() = reviewer_auth_id and exists (
      select 1 from public.investor_contacted_projects icp
      where icp.investor_auth_id = auth.uid() and icp.project_id = deal_ratings.project_id
    )
  );
exception when duplicate_object then null; end $$;
