# EloInvestor Next v13.2 — Dashboard QA + Roles + RTL/LTR

## What changed
- Repaired user dashboard layout so the public header/mobile nav does not collide with dashboard UI.
- Sidebar placement is now language-aware:
  - Arabic: sidebar on the right.
  - English: sidebar on the left.
- Sidebar labels switch between Arabic and English according to `/[country]/[lang]`.
- Sidebar items are role-aware:
  - Investor sees investor center, saved, suggested deals, interests.
  - Project owner sees my projects, add project, investor requests, packages.
  - Both sees both groups.
  - Admin gets a direct admin panel shortcut only when role/account type is admin/super_admin.
- Added an active-tab guard so a user never remains on a tab that their role should not see.
- Tightened dashboard CSS to prevent overlap, horizontal scroll, and RTL/LTR menu misalignment.

## Build check
- TypeScript check passed with `npx tsc --noEmit`.
- `next build` compiles and TypeScript passes. Final page-data collection requires real Supabase env variables in `.env.local`.
