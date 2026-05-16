# v48.4 Save Project Proper Fix

هذه النسخة تعالج فشل حفظ المشروع من المصدر بدل ترقيع SQL منفصل:

- أضيفت أعمدة legacy aliases في payload: `name`, `title_en`, `description_en`, `user_auth_id`, `owner_id`, `sector`, `project_type`.
- تم إصلاح قراءة إعداد النشر التلقائي سواء كان جدول الإعدادات يستخدم `key/value` أو `setting_key/setting_value`.
- تم جعل النشر الافتراضي Auto إذا تعذر قراءة الإعداد بدل إرسال المشروع للمراجعة بالخطأ.
- تم تحسين fallback عند insert/update حتى يعالج أعمدة `NOT NULL` القديمة بدل الاكتفاء بحذف الأعمدة غير الموجودة.
- SQL جديد يضيف الأعمدة المطلوبة ويهيئ buckets الصور والمستندات.

## المطلوب

شغّل الملف:

`SUPABASE_V48_4_SAVE_PROJECT_PROPER_FIX.sql`

ثم جرّب إضافة مشروع جديد من السمارت فورم.
