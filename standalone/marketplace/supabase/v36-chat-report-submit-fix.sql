-- إلو مستثمر v36 - تثبيت إرسال بلاغ الشات
-- شغّل هذا الملف بعد v31/v35 إذا كان زر إرسال البلاغ لا يحفظ البلاغ.

create table if not exists public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  reporter_auth_id uuid not null,
  reported_auth_id uuid,
  project_id uuid,
  reason text not null default 'other',
  note text,
  status text not null default 'open',
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.chat_reports enable row level security;

create index if not exists idx_chat_reports_conversation on public.chat_reports(conversation_id);
create index if not exists idx_chat_reports_status on public.chat_reports(status);
create index if not exists idx_chat_reports_reporter on public.chat_reports(reporter_auth_id);

create unique index if not exists idx_chat_reports_one_open_per_user
  on public.chat_reports(conversation_id, reporter_auth_id)
  where status in ('open', 'under_review');

drop policy if exists "chat participants can create reports" on public.chat_reports;
create policy "chat participants can create reports"
on public.chat_reports
for insert
with check (
  auth.uid() = reporter_auth_id
  and exists (
    select 1
    from public.chat_conversations c
    where c.id = chat_reports.conversation_id
      and (c.owner_auth_id = auth.uid() or c.investor_auth_id = auth.uid())
      and (reported_auth_id is null or reported_auth_id in (c.owner_auth_id, c.investor_auth_id))
  )
);

drop policy if exists "reporters and moderators can read reports" on public.chat_reports;
create policy "reporters and moderators can read reports"
on public.chat_reports
for select
using (
  reporter_auth_id = auth.uid()
  or public.is_admin_staff('chat_moderation')
  or public.is_admin_staff('support')
);

drop policy if exists "moderators can update reports" on public.chat_reports;
create policy "moderators can update reports"
on public.chat_reports
for update
using (public.is_admin_staff('chat_moderation') or public.is_admin_staff('support'))
with check (public.is_admin_staff('chat_moderation') or public.is_admin_staff('support'));
