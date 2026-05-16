# V43.1 SQL Fix

هذا الإصدار يصلح خطأ Supabase:

`column name_ar of relation platform_languages does not exist`

استخدم الملف الجديد:

`SUPABASE_V43_LANGUAGES_TRANSLATIONS_ADMIN.sql`

الملف صار يضيف الأعمدة الناقصة أولاً باستخدام `alter table add column if not exists` ثم يضيف البيانات.
