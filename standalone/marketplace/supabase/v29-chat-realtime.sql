-- إلو مستثمر v29 - Internal Chat + Realtime Notifications
-- شغّل هذا الملف بعد ملفات v28.
-- بعدها من Supabase > Database > Replication فعّل realtime للجداول:
-- chat_conversations, chat_messages, notifications

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  owner_auth_id uuid not null,
  investor_auth_id uuid not null,
  project_snapshot jsonb default '{}'::jsonb,
  last_message text,
  last_message_at timestamptz,
  unread_owner integer not null default 0,
  unread_investor integer not null default 0,
  is_closed boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id, owner_auth_id, investor_auth_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_auth_id uuid not null,
  receiver_auth_id uuid not null,
  body text not null,
  attachment_url text,
  attachment_name text,
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table public.notifications add column if not exists link_url text;
alter table public.notifications add column if not exists is_read boolean default false;
alter table public.notifications add column if not exists user_auth_id uuid;
alter table public.notifications add column if not exists created_by uuid;
alter table public.notifications add column if not exists type text default 'info';

create index if not exists idx_chat_conversations_owner on public.chat_conversations(owner_auth_id);
create index if not exists idx_chat_conversations_investor on public.chat_conversations(investor_auth_id);
create index if not exists idx_chat_messages_conversation_created on public.chat_messages(conversation_id, created_at);
create index if not exists idx_notifications_user_read on public.notifications(user_auth_id, is_read);

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;

-- Conversations: الطرفان فقط يشاهدان/ينشئان/يحدثان المحادثة

drop policy if exists "chat participants can read conversations" on public.chat_conversations;
create policy "chat participants can read conversations"
on public.chat_conversations
for select
using (auth.uid() = owner_auth_id or auth.uid() = investor_auth_id or public.is_admin_staff('support'));

drop policy if exists "chat participants can create conversations" on public.chat_conversations;
create policy "chat participants can create conversations"
on public.chat_conversations
for insert
with check (auth.uid() = owner_auth_id or auth.uid() = investor_auth_id);

drop policy if exists "chat participants can update conversations" on public.chat_conversations;
create policy "chat participants can update conversations"
on public.chat_conversations
for update
using (auth.uid() = owner_auth_id or auth.uid() = investor_auth_id or public.is_admin_staff('support'))
with check (auth.uid() = owner_auth_id or auth.uid() = investor_auth_id or public.is_admin_staff('support'));

-- Messages: المرسل أو المستقبل فقط

drop policy if exists "chat participants can read messages" on public.chat_messages;
create policy "chat participants can read messages"
on public.chat_messages
for select
using (
  auth.uid() = sender_auth_id
  or auth.uid() = receiver_auth_id
  or exists (
    select 1 from public.chat_conversations c
    where c.id = chat_messages.conversation_id
      and (c.owner_auth_id = auth.uid() or c.investor_auth_id = auth.uid())
  )
  or public.is_admin_staff('support')
);

drop policy if exists "chat participants can send messages" on public.chat_messages;
create policy "chat participants can send messages"
on public.chat_messages
for insert
with check (
  auth.uid() = sender_auth_id
  and exists (
    select 1 from public.chat_conversations c
    where c.id = chat_messages.conversation_id
      and (c.owner_auth_id = auth.uid() or c.investor_auth_id = auth.uid())
      and (c.owner_auth_id = receiver_auth_id or c.investor_auth_id = receiver_auth_id)
  )
);

drop policy if exists "chat participants can update own read status" on public.chat_messages;
create policy "chat participants can update own read status"
on public.chat_messages
for update
using (auth.uid() = receiver_auth_id or public.is_admin_staff('support'))
with check (auth.uid() = receiver_auth_id or public.is_admin_staff('support'));

-- Notifications: المستخدم يشوف إشعاراته والإدارة حسب الصلاحية

drop policy if exists "users can read own notifications" on public.notifications;
create policy "users can read own notifications"
on public.notifications
for select
using (user_auth_id is null or user_auth_id = auth.uid() or public.is_admin_staff('notifications'));

drop policy if exists "users can update own notifications" on public.notifications;
create policy "users can update own notifications"
on public.notifications
for update
using (user_auth_id = auth.uid() or public.is_admin_staff('notifications'))
with check (user_auth_id = auth.uid() or public.is_admin_staff('notifications'));

drop policy if exists "system can create notifications" on public.notifications;
create policy "system can create notifications"
on public.notifications
for insert
with check (created_by = auth.uid() or public.is_admin_staff('notifications'));
