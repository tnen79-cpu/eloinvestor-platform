-- إلو مستثمر v38 - MVP essentials
-- شغّل هذا الملف بعد v37.
-- الميزات: مرفقات الشات، طلبات دفع الباقات، سياسات التخزين، وفهرسة أدق.

-- 1) Chat attachments
alter table public.chat_messages
  alter column body drop not null,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint;

create index if not exists idx_chat_messages_attachment
  on public.chat_messages(conversation_id)
  where attachment_url is not null;

-- Storage buckets. إذا كانت موجودة مسبقاً سيتم تجاهلها.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-receipts',
  'payment-receipts',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS policies
-- ملاحظة: Supabase Storage يستخدم storage.objects. هذه السياسات تسمح للمستخدم برفع ملف داخل مجلد يحمل auth.uid().
drop policy if exists "users upload own chat attachments" on storage.objects;
create policy "users upload own chat attachments"
on storage.objects
for insert
with check (
  bucket_id = 'chat-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "authenticated read chat attachments" on storage.objects;
create policy "authenticated read chat attachments"
on storage.objects
for select
using (bucket_id = 'chat-attachments' and auth.uid() is not null);

drop policy if exists "users upload own payment receipts" on storage.objects;
create policy "users upload own payment receipts"
on storage.objects
for insert
with check (
  bucket_id = 'payment-receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "users and admins read payment receipts" on storage.objects;
create policy "users and admins read payment receipts"
on storage.objects
for select
using (
  bucket_id = 'payment-receipts'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin_staff('payments')
    or public.is_admin_staff('plans')
    or public.is_admin_staff('support')
  )
);

-- 2) Payment requests for package activation
create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid not null,
  plan text not null,
  amount_omr numeric not null default 0,
  credits integer not null default 0,
  featured_projects integer not null default 0,
  days integer not null default 30,
  payment_method text not null default 'bank_transfer',
  payment_reference text,
  receipt_url text,
  note text,
  status text not null default 'pending', -- pending, approved, rejected
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_payment_requests_user on public.payment_requests(user_auth_id);
create index if not exists idx_payment_requests_status on public.payment_requests(status, created_at desc);

alter table public.payment_requests enable row level security;

drop policy if exists "users create own payment requests" on public.payment_requests;
create policy "users create own payment requests"
on public.payment_requests
for insert
with check (auth.uid() = user_auth_id);

drop policy if exists "users read own payment requests" on public.payment_requests;
create policy "users read own payment requests"
on public.payment_requests
for select
using (
  auth.uid() = user_auth_id
  or public.is_admin_staff('payments')
  or public.is_admin_staff('plans')
  or public.is_admin_staff('support')
);

drop policy if exists "admins update payment requests" on public.payment_requests;
create policy "admins update payment requests"
on public.payment_requests
for update
using (public.is_admin_staff('payments') or public.is_admin_staff('plans') or public.is_admin_staff('support'))
with check (public.is_admin_staff('payments') or public.is_admin_staff('plans') or public.is_admin_staff('support'));

-- 3) Function to approve payment and activate package safely from admin SQL/API later
create or replace function public.approve_payment_request(request_id uuid, admin_note_text text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.payment_requests%rowtype;
  current_remaining integer;
  current_featured integer;
begin
  if not (public.is_admin_staff('payments') or public.is_admin_staff('plans') or public.is_admin_staff('support')) then
    raise exception 'not allowed';
  end if;

  select * into r from public.payment_requests where id = request_id for update;
  if not found then raise exception 'payment request not found'; end if;
  if r.status = 'approved' then return; end if;

  select coalesce(remaining_projects,0), coalesce(featured_projects,0)
  into current_remaining, current_featured
  from public.users
  where auth_id = r.user_auth_id
  for update;

  update public.users
  set
    plan = r.plan,
    subscription_status = 'active',
    remaining_projects = coalesce(current_remaining,0) + coalesce(r.credits,0),
    featured_projects = coalesce(current_featured,0) + coalesce(r.featured_projects,0),
    subscription_expires_at = now() + make_interval(days => coalesce(r.days,30)),
    paid_owner_requests_enabled = true
  where auth_id = r.user_auth_id;

  update public.payment_requests
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), admin_note = admin_note_text, updated_at = now()
  where id = request_id;

  insert into public.notifications(user_auth_id, title, message, type, link_url, created_by)
  values(r.user_auth_id, 'تم تفعيل الباقة', 'تم قبول الدفع وتفعيل باقتك بنجاح.', 'payment', 'user-dashboard.html', auth.uid());
end;
$$;

-- صلاحية payments للمدراء الحاليين إذا كانوا super_admin/support
update public.admin_staff
set permissions = array_append(permissions, 'payments')
where is_active = true
  and not ('payments' = any(permissions))
  and (role = 'super_admin' or '*' = any(permissions) or 'support' = any(permissions) or 'plans' = any(permissions));

-- Realtime optional
DO $$
begin
  begin
    alter publication supabase_realtime add table public.payment_requests;
  exception when duplicate_object then null;
  end;
end $$;
