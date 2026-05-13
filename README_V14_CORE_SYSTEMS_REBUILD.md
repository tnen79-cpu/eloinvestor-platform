# EloInvestor Next v14 — Core Systems Rebuild

## المنفذ
- ربط الشات الداخلي داخل لوحة المستخدم بجدول `messages` مع Supabase Realtime.
- تحميل المحادثات لصاحب المشروع والمستثمر من جدول `conversations` بدل الاكتفاء بسجل المستثمر.
- منع تكرار رسالة الترحيب عند الضغط المتكرر على زر التواصل.
- رفع مستندات التوثيق فعليًا إلى Supabase Storage bucket: `verification-docs`.
- إنشاء طلب توثيق يحتوي `document_url / file_url / storage_path` عند نجاح الرفع.
- حفظ اهتمامات المستثمر في جدول `users`: الميزانية، الموقع، القطاعات، و`investor_preferences`.
- تحسين جلب مشاريع المستخدم بمحاولة query موحدة ثم fallback آمن للأعمدة القديمة.
- إصلاح id المكرر في قائمة الإدارة: `admin-panel` بدل `overview`.
- تحسين ProgressPanel بقيم max ذكية بدل أرقام ثابتة.
- إضافة SQL جديد: `SUPABASE_V14_CORE_SYSTEMS.sql`.

## مهم بعد الرفع
1. شغّل ملف SQL الجديد في Supabase:
   `SUPABASE_V14_CORE_SYSTEMS.sql`
2. تأكد من تفعيل Realtime على جدول `messages` من Supabase Dashboard.
3. تأكد من وجود متغيرات البيئة:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - اختياري: `NEXT_PUBLIC_VERIFICATION_BUCKET=verification-docs`

## فحص البناء
تم فحص:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy npm run build
```
والـ build نجح.
