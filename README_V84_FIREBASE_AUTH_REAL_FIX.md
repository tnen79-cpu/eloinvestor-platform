# v84 Firebase Auth Real Fix

هذه النسخة مبنية من النسخة التي رفعتها وفيها إصلاح مباشر لتسجيل الدخول بالهاتف عبر Firebase.

## أهم نقطة
لا يوجد أي استخدام لـ `signInWithOtp` داخل المشروع. إذا ظهر في DevTools طلب إلى `/auth/v1/otp` فهذا يعني أن Vercel لم يبنِ هذه النسخة أو ما زال يستخدم كاش/commit قديم.

## تحقق سريع بعد النشر
افتح صفحة login ويجب أن ترى نص صغير: `Firebase Auth v84`.
إذا لم يظهر، فأنت على كود قديم.

## Vercel ENV
أضف قيم Firebase و Supabase ثم Redeploy بدون cache.
