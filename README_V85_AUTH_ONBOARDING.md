# v85 Firebase Auth Onboarding

## الجديد
- أي مستخدم يدخل لأول مرة عبر Google أو رقم الهاتف يتم توجيهه إلى:
  `/[country]/[lang]/complete-profile`
- الاسم إجباري.
- نوع الحساب إجباري: مستثمر / صاحب مشروع / الاثنين.
- بعد الحفظ يتم توجيهه إلى لوحة التحكم.
- التسجيل من صفحة Register يبقى سريعًا، لكن يرسل `complete_onboarding=true` حتى لا يطلب الإكمال مرة ثانية.

## SQL المطلوب
شغّل:
`SUPABASE_V85_AUTH_ONBOARDING.sql`

## ملاحظة
إذا ظهر طلب `/auth/v1/otp` في DevTools فهذا يعني أن Vercel يستخدم نسخة قديمة أو الكاش، وليس هذه النسخة.
