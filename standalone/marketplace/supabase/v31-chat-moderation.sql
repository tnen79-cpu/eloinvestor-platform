-- إلو مستثمر v31 - Chat activation + moderation reports
-- شغّل هذا الملف بعد v29-chat-realtime.sql.
-- بعدها من Supabase > Realtime فعّل الجداول: chat_conversations, chat_messages, notifications, chat_reports

alter table public.chat_conversations
  add column if not exists is_reported boolean not null default false,
  add column if not exists moderation_status text not null default 'normal',
  add column if not exists closed_by uuid,
  add column if not exists closed_reason text,
  add column if not exists closed_at timestamptz;

alter table public.chat_messages
  add column if not exists is_flagged boolean not null default false,
  add column if not exists moderation_note text;

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

create index if not exists idx_chat_reports_conversation on public.chat_reports(conversation_id);
create index if not exists idx_chat_reports_status on public.chat_reports(status);
create index if not exists idx_chat_reports_reporter on public.chat_reports(reporter_auth_id);
create index if not exists idx_chat_reports_reported on public.chat_reports(reported_auth_id);

alter table public.chat_reports enable row level security;

-- المشاركون بالمحادثة يستطيعون إنشاء بلاغ فقط على محادثاتهم

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

-- المستخدم يرى البلاغات التي أرسلها، والإدارة ترى الكل بصلاحية chat_moderation/support

drop policy if exists "reporters and moderators can read reports" on public.chat_reports;
create policy "reporters and moderators can read reports"
on public.chat_reports
for select
using (
  reporter_auth_id = auth.uid()
  or public.is_admin_staff('chat_moderation')
  or public.is_admin_staff('support')
);

-- الإدارة فقط تحدث حالة البلاغ

drop policy if exists "moderators can update reports" on public.chat_reports;
create policy "moderators can update reports"
on public.chat_reports
for update
using (public.is_admin_staff('chat_moderation') or public.is_admin_staff('support'))
with check (public.is_admin_staff('chat_moderation') or public.is_admin_staff('support'));

-- السماح للإدارة بمشاهدة المحادثات والرسائل للحالات المبلغ عنها فقط أو بصلاحية الدعم
-- إذا كانت لديك policies قديمة على chat_conversations/chat_messages، اتركها كما هي؛ هذه تضيف دعم moderation.

drop policy if exists "moderators can read reported conversations" on public.chat_conversations;
create policy "moderators can read reported conversations"
on public.chat_conversations
for select
using (
  public.is_admin_staff('chat_moderation')
  or public.is_admin_staff('support')
);

drop policy if exists "moderators can read reported messages" on public.chat_messages;
create policy "moderators can read reported messages"
on public.chat_messages
for select
using (
  public.is_admin_staff('chat_moderation')
  or public.is_admin_staff('support')
);

-- إدراج صلاحية chat_moderation للـ super admin الموجودين، إن وجدوا
update public.admin_staff
set permissions = array_append(permissions, 'chat_moderation')
where is_active = true
  and not ('chat_moderation' = any(permissions))
  and (role = 'super_admin' or '*' = any(permissions) or 'support' = any(permissions));

-- منع تكرار البلاغ المفتوح من نفس المستخدم على نفس المحادثة
-- (الحماية موجودة في JS أيضاً، هذا للحماية على مستوى DB)
create unique index if not exists idx_chat_reports_one_open_per_user
  on public.chat_reports(conversation_id, reporter_auth_id)
  where status in ('open', 'under_review');
