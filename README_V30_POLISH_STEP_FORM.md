# v30 Polish + Step Add Project

## What changed
- Unified public footer across all public pages.
- Header search is centered and visually aligned with the marketplace homepage.
- Added a 5-step add-project flow:
  1. Project info
  2. Financials
  3. Contact
  4. Images
  5. Documents + verification
- Added support for project documents:
  - Feasibility study
  - Sales statement
  - Registration/license
  - Other project files
- Added `project_documents` SQL and `project-documents` storage bucket.
- Added CSS polish for consistent green marketplace identity.

## SQL
Run:
`SUPABASE_V30_STEP_FORM_DOCUMENTS.sql`
