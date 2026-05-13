# EloInvestor Next v12 — Contact Gate + Internal Chat

## What changed

- Contact buttons on project details are now gated behind login.
- Logged-in users can start an internal conversation with the project owner.
- WhatsApp opens only after login and the contact request is logged.
- New messages page: `/{country}/{lang}/messages`.
- Conversations are attached to a project.
- Realtime message updates are enabled through Supabase Realtime.
- Mobile nav now includes Messages.

## Required Supabase SQL

Run:

```txt
SUPABASE_V12_CONTACT_CHAT.sql
```

## Important

The chat relies on `projects.user_id` as the project owner id. The data layer also supports `owner_auth_id` and `user_auth_id`, but `user_id` is the primary owner column for your current database.

## Optional

If you want WhatsApp to open, make sure projects have `whatsapp` or `phone` filled.
