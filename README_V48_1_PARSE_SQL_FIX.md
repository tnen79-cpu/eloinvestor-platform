# v48.1 Smart Form Fix

- Fixed `Unterminated string constant` in `components/AddProjectForm.tsx`.
- Added `SUPABASE_V48_1_SMART_FORM_SAFE.sql` to handle old/new translation table schemas.
- Use the new SQL instead of the previous `SUPABASE_V48_SMART_FORM.sql` if your DB has `translation_key`.
