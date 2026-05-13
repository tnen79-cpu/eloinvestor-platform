# EloInvestor Next v13.6 - Dashboard Actions QA

## تم إصلاحه
- زر تعديل المشروع داخل لوحة المستخدم صار يفتح نموذج التعديل داخل نفس اللوحة بدل التحويل كإضافة مشروع جديدة.
- بعد حفظ تعديل المشروع يتم تحديث قائمة مشاريعي والرجوع لها داخل الداشبورد.
- الشات الداخلي صار داخل اللوحة ويرسل رسائل فعلية إذا كان `conversation_id` موجود.
- الباقات داخل اللوحة ترسل طلب ترقية إلى `package_upgrade_requests` مع fallback إلى `notifications`.
- التوثيق داخل اللوحة يرسل طلب إلى `verification_requests` بدل أزرار شكلية.
- اهتمامات المستثمر تحفظ في جدول `users` داخل أعمدة الميزانية، المحافظات، والـ JSON preferences.
- الملف الشخصي يدعم تعديل الاسم، الهاتف، واتساب، ونوع الحساب مع fallback لإنشاء صف المستخدم إن لم يكن موجودًا.
- زر ترقية الباقة في السايدبار صار يفتح تبويب الباقات داخل اللوحة بدل صفحة منفصلة.
- تمت إضافة CSS صغير لأزرار التعديل والـ disabled states.

## SQL جديد
شغّل ملف:
`SUPABASE_V13_6_DASHBOARD_ACTIONS.sql`

## فحص
نجح build باستخدام مفاتيح Supabase وهمية:
`NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy npm run build`
