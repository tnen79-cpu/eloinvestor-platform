# EloInvestor v17 Feature Stability

## What changed
- Added migration-safe SQL for old schemas (`SUPABASE_V17_FEATURE_STABILITY.sql`).
- Fixed legacy chat compatibility: supports both `buyer_id` and `investor_id` conversation columns.
- Saved projects now refresh inside the dashboard through Supabase Realtime.
- Contacted projects/conversations and notifications refresh inside the dashboard.
- Investor interests update suggested projects immediately after saving.
- Suggested opportunities no longer show owner-only edit controls.
- Contact flow prevents duplicate welcome messages and logs contacted opportunities.
- Added compatible tables/columns for premium investor plans, package upgrade requests, notifications, paid project verification, counters, and analytics logs.

## Required Supabase step
Run `SUPABASE_V17_FEATURE_STABILITY.sql` in Supabase SQL Editor.

## Build check
`next build` passed with dummy Supabase env variables.
