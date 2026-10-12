-- إلو مستثمر v37 - Chat Presence + Seen + Typing Foundation
-- شغّل هذا الملف بعد v29/v31/v36.

alter table public.chat_messages
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz;

create index if not exists idx_chat_messages_conversation_read
  on public.chat_messages(conversation_id, receiver_auth_id, read_at);

create table if not exists public.chat_presence (
  user_auth_id uuid primary key,
  is_online boolean not null default false,
  last_seen timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.chat_presence enable row level security;

drop policy if exists "chat users can read presence" on public.chat_presence;
create policy "chat users can read presence"
on public.chat_presence
for select
using (auth.uid() is not null);

drop policy if exists "users can upsert own presence" on public.chat_presence;
create policy "users can upsert own presence"
on public.chat_presence
for insert
with check (auth.uid() = user_auth_id);

drop policy if exists "users can update own presence" on public.chat_presence;
create policy "users can update own presence"
on public.chat_presence
for update
using (auth.uid() = user_auth_id)
with check (auth.uid() = user_auth_id);

-- السماح للمستقبل بتحديث حالة القراءة لرسائله المستلمة فقط
-- ملاحظة: إذا عندك policy موجودة مسبقاً للتحديث على chat_messages، اتركها أو شغّل هذا بأمان.
drop policy if exists "receivers can mark messages read" on public.chat_messages;
create policy "receivers can mark messages read"
on public.chat_messages
for update
using (auth.uid() = receiver_auth_id)
with check (auth.uid() = receiver_auth_id);

-- Realtime publication. قد يظهر notice إذا الجدول مضاف مسبقاً وهذا طبيعي.
do $$
begin
  begin
    alter publication supabase_realtime add table public.chat_messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.chat_conversations;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.chat_presence;
  exception when duplicate_object then null;
  end;
end $$;
