# EloInvestor Next v12.6 - HTML Feature Parity

## Added
- Investor center in user dashboard:
  - Saved projects
  - Contacted projects
  - Subscription/preference summary
- Save/unsave project button on project details page.
- Contact log into `investor_contacted_projects` whenever a conversation is opened.
- Public packages page `/[country]/[lang]/packages`.
- Navigation link for packages.
- Supabase SQL migration: `SUPABASE_V12_6_FEATURE_PARITY.sql`.

## Supabase
Run the SQL files in order, then run:
1. `SUPABASE_V12_CONTACT_CHAT.sql`
2. `SUPABASE_V12_6_FEATURE_PARITY.sql`

## Build check
Tested with fake Supabase env variables:
`NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy npm run build`

Build result: success.
