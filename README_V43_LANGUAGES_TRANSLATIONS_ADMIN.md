# v43 — Languages & Translations Admin

## Added
- Admin tab: **اللغات والترجمات**
- Manage active languages from admin:
  - Code
  - Arabic name
  - English name
  - RTL/LTR direction
  - Default language
  - Active/inactive
- Manage UI translation strings:
  - Namespace
  - Translation key
  - Arabic text
  - English text
  - Notes
  - Active/inactive
- Header language switcher now reads active languages from Supabase instead of being hardcoded to Arabic/English only.
- Safe auto-translate placeholder button. Connect it later to a Supabase Edge Function or server API so translation API keys are never exposed in the browser.

## SQL
Run:

`SUPABASE_V43_LANGUAGES_TRANSLATIONS_ADMIN.sql`

## Notes
- Existing pages still keep fallback hardcoded labels when no translation is found.
- This version gives admin control and database structure for translations. Gradually replace static page labels with `platform_translations` keys as pages are finalized.
