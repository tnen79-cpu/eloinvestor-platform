# v87 Firebase Final Fix

هذه النسخة تصلح مشاكل Firebase التي ظهرت بعد v86:

- دخول الإدارة عبر `firebase_uid` بدون كسر أعمدة `auth_id` من نوع UUID.
- إصلاح خطأ اختيار نوع الحساب الذي كان يرجع إلى `investor`.
- صفحة إكمال الحساب الآن تقرأ جلسة Firebase بدل الاعتماد على Supabase session فقط.
- حماية لوحة الإدارة لم تعد ترسل Firebase UID إلى أعمدة UUID داخل PostgREST.
- زر الهيدر/تسجيل الخروج يدعم Firebase + Supabase.
- إضافة المشروع يقرأ مستخدم Firebase بشكل صحيح.

## بعد الرفع

1. شغّل SQL:
   `SUPABASE_V87_FIREBASE_ADMIN_ONBOARDING_FINAL.sql`
2. ارفع النسخة على GitHub.
3. في Vercel اعمل Deploy جديد من آخر commit وليس Redeploy قديم.
4. افتح `/om/ar/login?v=87` للتأكد من الكاش.
