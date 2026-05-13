-- EloInvestor Next v12 - Contact Gate + Internal Chat
-- Run in Supabase SQL Editor.

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  buyer_id uuid not null,
  owner_id uuid not null,
  country_code text default 'om',
  status text default 'open',
  last_message text,
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id, buyer_id)
);

alter table conversations
add column if not exists project_id uuid,
add column if not exists buyer_id uuid,
add column if not exists owner_id uuid,
add column if not exists country_code text default 'om',
add column if not exists status text default 'open',
add column if not exists last_message text,
add column if not exists last_message_at timestamptz default now(),
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now();

create unique index if not exists conversations_project_buyer_unique
on conversations(project_id, buyer_id);

create index if not exists conversations_buyer_idx on conversations(buyer_id);
create index if not exists conversations_owner_idx on conversations(owner_id);
create index if not exists conversations_project_idx on conversations(project_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null,
  body text,
  image_url text,
  created_at timestamptz default now(),
  read_at timestamptz
);

alter table messages
add column if not exists conversation_id uuid,
add column if not exists sender_id uuid,
add column if not exists body text,
add column if not exists image_url text,
add column if not exists created_at timestamptz default now(),
add column if not exists read_at timestamptz;

create index if not exists messages_conversation_idx on messages(conversation_id, created_at);
create index if not exists messages_sender_idx on messages(sender_id);

alter table projects add column if not exists contacts_count integer default 0;
alter table projects add column if not exists views_count integer default 0;
alter table projects add column if not exists whatsapp text;
alter table projects add column if not exists phone text;

create or replace function increment_project_contact_count(p_project_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update projects
  set contacts_count = coalesce(contacts_count, 0) + 1
  where id = p_project_id;
exception when undefined_column then
  null;
end;
$$;

alter table conversations enable row level security;
alter table messages enable row level security;

drop policy if exists "participants_read_conversations" on conversations;
create policy "participants_read_conversations"
on conversations
for select
to authenticated
using (auth.uid() = buyer_id or auth.uid() = owner_id);

drop policy if exists "buyers_create_conversations" on conversations;
create policy "buyers_create_conversations"
on conversations
for insert
to authenticated
with check (auth.uid() = buyer_id);

drop policy if exists "participants_update_conversations" on conversations;
create policy "participants_update_conversations"
on conversations
for update
to authenticated
using (auth.uid() = buyer_id or auth.uid() = owner_id)
with check (auth.uid() = buyer_id or auth.uid() = owner_id);

drop policy if exists "participants_read_messages" on messages;
create policy "participants_read_messages"
on messages
for select
to authenticated
using (
  exists (
    select 1 from conversations c
    where c.id = messages.conversation_id
    and (c.buyer_id = auth.uid() or c.owner_id = auth.uid())
  )
);

drop policy if exists "participants_insert_messages" on messages;
create policy "participants_insert_messages"
on messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1 from conversations c
    where c.id = messages.conversation_id
    and (c.buyer_id = auth.uid() or c.owner_id = auth.uid())
  )
);

drop policy if exists "participants_update_read_messages" on messages;
create policy "participants_update_read_messages"
on messages
for update
to authenticated
using (
  exists (
    select 1 from conversations c
    where c.id = messages.conversation_id
    and (c.buyer_id = auth.uid() or c.owner_id = auth.uid())
  )
)
with check (
  exists (
    select 1 from conversations c
    where c.id = messages.conversation_id
    and (c.buyer_id = auth.uid() or c.owner_id = auth.uid())
  )
);

-- Realtime support. Enable the publication if not already enabled.
do $$
begin
  begin
    alter publication supabase_realtime add table conversations;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table messages;
  exception when duplicate_object then null;
  end;
end $$;

notify pgrst, 'reload schema';
