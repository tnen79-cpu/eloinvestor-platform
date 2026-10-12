# alo v69 professional language system

Built from clean v53.

Files added:
- assets/js/i18n.js
- assets/js/header-language.js
- assets/css/i18n.css
- assets/i18n/ar.json
- assets/i18n/en.json
- admin-languages.html
- admin-language-translate.html
- assets/js/admin-languages-v69.js
- assets/js/admin-language-translate-v69.js
- supabase/v69-professional-language-system.sql
- supabase/v69-seed-ui-translation-keys.sql
- supabase/functions/translate-project/index.ts

Steps:
1. Run supabase/v69-professional-language-system.sql.
2. Run supabase/v69-seed-ui-translation-keys.sql.
3. Upload files.
4. Make sure Edge Function translate-project uses the included index.ts and Azure secrets are configured.
5. Open admin-languages.html.
6. Open translation editor for English and use 'تعبئة تلقائية من الملف', then 'حفظ الكل'.

Tagged HTML files: 17
Generated translation keys: 545
