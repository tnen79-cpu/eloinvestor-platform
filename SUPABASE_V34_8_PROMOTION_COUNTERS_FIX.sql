-- V34.8 Promotion counters fix
-- يحل مشكلة بقاء أرقام نتائج الترويج على صفر عبر ربط العداد بمشاهدة المشروع، النقر على كرت ممول، والتواصل.

alter table public.promotion_requests
  add column if not exists promotion_views bigint not null default 0,
  add column if not exists promotion_clicks bigint not null default 0,
  add column if not exists promotion_contacts bigint not null default 0,
  add column if not exists last_view_at timestamptz,
  add column if not exists last_click_at timestamptz,
  add column if not exists last_contact_at timestamptz;

create index if not exists promotion_requests_status_idx on public.promotion_requests(status);
create index if not exists promotion_requests_project_id_idx on public.promotion_requests(project_id);
create index if not exists promotion_requests_active_project_idx on public.promotion_requests(project_id, status, ends_at);

-- عداد مباشر بواسطة رقم طلب الترويج، أبقيناه للتوافق.
create or replace function public.increment_promotion_metric(request_id uuid, metric_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if metric_name = 'view' then
    update public.promotion_requests
      set promotion_views = coalesce(promotion_views, 0) + 1,
          last_view_at = now()
    where id = request_id;
  elsif metric_name = 'click' then
    update public.promotion_requests
      set promotion_clicks = coalesce(promotion_clicks, 0) + 1,
          last_click_at = now()
    where id = request_id;
  elsif metric_name = 'contact' then
    update public.promotion_requests
      set promotion_contacts = coalesce(promotion_contacts, 0) + 1,
          last_contact_at = now()
    where id = request_id;
  else
    raise exception 'Unsupported promotion metric: %', metric_name;
  end if;
end;
$$;

-- العداد المستخدم من الواجهة: يحدث كل طلب ترويج فعال مرتبط بالمشروع.
create or replace function public.increment_active_promotion_metric(p_project_id text, metric_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_uuid uuid;
begin
  begin
    v_project_uuid := p_project_id::uuid;
  exception when invalid_text_representation then
    return;
  end;

  if metric_name = 'view' then
    update public.promotion_requests
      set promotion_views = coalesce(promotion_views, 0) + 1,
          last_view_at = now()
    where project_id = v_project_uuid
      and lower(coalesce(status, '')) in ('active', 'approved', 'running')
      and (ends_at is null or ends_at >= now());
  elsif metric_name = 'click' then
    update public.promotion_requests
      set promotion_clicks = coalesce(promotion_clicks, 0) + 1,
          last_click_at = now()
    where project_id = v_project_uuid
      and lower(coalesce(status, '')) in ('active', 'approved', 'running')
      and (ends_at is null or ends_at >= now());
  elsif metric_name = 'contact' then
    update public.promotion_requests
      set promotion_contacts = coalesce(promotion_contacts, 0) + 1,
          last_contact_at = now()
    where project_id = v_project_uuid
      and lower(coalesce(status, '')) in ('active', 'approved', 'running')
      and (ends_at is null or ends_at >= now());
  else
    raise exception 'Unsupported promotion metric: %', metric_name;
  end if;
end;
$$;

grant execute on function public.increment_promotion_metric(uuid, text) to authenticated;
grant execute on function public.increment_active_promotion_metric(text, text) to anon, authenticated;
