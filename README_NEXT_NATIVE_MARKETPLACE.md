# Native Next.js marketplace improvements

This change modifies the existing Next.js application on `main`. It does not import the standalone HTML checkpoint or mount it in the application.

## Implemented

- Search retains advanced filters when collapsed and when secondary forms are submitted. Opportunities are fetched in batches, with deterministic ordering, and displayed 18 per page. Database failure is not presented as an empty marketplace. The current search path supports up to 5,000 rows and reports a limit error instead of silently truncating larger catalogs.
- Comparisons accept up to four valid unique project IDs, report loading errors, keep selection order, and fetch only selected public fields for published opportunities in the active country. Project cards no longer invent letter grades or declare low investment risk.
- Annual ROI is calculated from price and monthly net profit when available; otherwise its source is reported data or missing data. The scenario calculator includes purchase costs, profit changes and payback, and is available on comparison and project detail pages.
- `/{country}/{lang}/workspace` and the dashboard's saved tab provide account-scoped review stages, checklists and private notes. Saves compare the previous JSON snapshot to prevent overwriting another session's changes. Re-saving a project does not overwrite its notes.
- Saved searches validate financial bounds, link back to matching opportunities and show failures. The UI does not promise automated notifications that are not implemented by this change.
- Project-save API checks the existing authoritative owner before any update, strips unapproved fields from client payloads and derives publication state from server settings. Editing returns the project to review and clears its old verification. The upload form remembers an already-created project during partial-failure retries.
- Verification center is shared by the dashboard and verification page. Current documents and replaced history remain visible. Submission uses owned private Storage objects and retry keys; review derives its target from the stored request and updates the decision, aggregate badge, audit log and notification in one database transaction. Stale decisions and cross-owner replacement are rejected.
- Investor contact has explicit optional consent, defaults to no contact sharing and derives conversation participants from the database. A repeat contact reuses its conversation and increments the counter only once. `/{country}/{lang}/interests` allows withdrawing interest and revoking contact sharing.
- Owners see scoped leads in the dashboard's requests tab, with follow-up stages and private notes for eligible active subscriptions. Name/phone/WhatsApp additionally require active investor consent. Historical contacts are not treated as consent. Conversations already created remain available after interest is withdrawn.
- Broken profile-module syntax/stale Firebase references, a broken admin import and the out-of-sync dependency lockfile were corrected. Supabase clients and Next.js are pinned to the installed tested versions.

## Database activation

The native migration is `supabase/migrations/20261012001908_next_marketplace_review_workspace.sql`. It targets the existing Next.js tables (`verification_requests`, `users`, `projects`, `conversations`, `investor_saved_projects`, `investor_contacted_projects`, `saved_searches`, `admin_action_logs`, `notifications`) and Storage buckets `verification-files`/`verification-docs`. Do not apply the static checkpoint migrations to this application.

The migration has **not** been applied to a live Supabase project. Administrative access was unavailable during the work. Until it is applied, private workspace and review/contact operations stop with an unavailable-service message. Confirm the deployed schema has the tables and columns used here; older schemas store identity columns as either text or UUID, both of which are covered by local tests. Existing duplicate contact pairs would prevent the new unique index from being created; resolve them deliberately before migration rather than dropping history.

The migration makes both verification buckets private and adds restrictive policies, preventing public file serving and direct request writes from browser sessions. Old public verification URLs are opened through signed URLs by the new review controls. Files historically stored under a profile ID different from the authentication ID need their ownership mapping checked before activation. Superseded documents are retained.

Review staff need `admin_permissions.verifications=true` or the `verification_admin` role; super admins have access. Administrative profile writes use the scoped `next_admin_update_user` function. Ordinary users cannot change roles, billing or verification through a legacy broad browser policy. Only super admins can change staff permissions. Do not rerun historical SQL scripts after this migration, as they can restore old broad RPC grants and public bucket settings.

## Validation and limits

Passed: `npm run typecheck`, `npm test`, `npm run build`, and local HTTP checks returning 400 for invalid comparison IDs and 401 for unauthenticated project/verification submission. Tests include financial edge cases, payload/ownership checks, persistent advanced inputs, and PGlite verification/privacy/role/rollback tests for both text and UUID identity schemas.

Browser visual testing was not completed because the Chromium download returned invalid ZIP data. No live account signup, real message, payment, schema mutation or server deployment was performed. The existing payment system and image/video/document uploads remain separate flows; this change does not claim that all publication media or billing operations have been made atomic. It is not a full production security audit. Authenticated live testing and schema activation remain necessary before release.
