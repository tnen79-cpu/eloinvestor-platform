-- V34.7 Promotion analytics + running status
-- شغّل هذا الملف في Supabase SQL Editor لإضافة إحصائيات نتائج الترويج.

alter table public.promotion_requests
  add column if not exists promotion_views bigint not null default 0,
  add column if not exists promotion_clicks bigint not null default 0,
  add column if not exists promotion_contacts bigint not null default 0,
  add column if not exists last_view_at timestamptz,
  add column if not exists last_click_at timestamptz,
  add column if not exists last_contact_at timestamptz;

create index if not exists promotion_requests_status_idx on public.promotion_requests(status);
create index if not exists promotion_requests_project_id_idx on public.promotion_requests(project_id);
create index if not exists promotion_requests_owner_auth_id_idx on public.promotion_requests(owner_auth_id);

-- RPCs اختيارية للاستخدام لاحقًا عند تسجيل ظهور/نقرة/تواصل من الواجهة بدون race condition.
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

grant execute on function public.increment_promotion_metric(uuid, text) to authenticated;
