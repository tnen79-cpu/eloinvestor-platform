# v90 Firebase Auth Core Clean

هذه النسخة تنظف ربط Firebase مع Supabase بدون تغيير هيكل المنصة:

- Firebase يبقى لتسجيل الدخول بالهاتف/Google.
- Supabase يبقى قاعدة البيانات والأدوار.
- المستخدم الجديد لا يتم اعتباره مستثمر تلقائياً؛ يجب اختيار نوع الحساب.
- حفظ نوع الحساب يكتب `account_type` و `type` للتوافق مع الجداول القديمة.
- لوحة الإدارة تستطيع تحميل المستخدمين عبر API آمن يستخدم `SUPABASE_SERVICE_ROLE_KEY` أو RPC fallback.

## مطلوب في Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
ADMIN_PANEL_PASSWORD=
```

## بعد الرفع

1. شغل `SUPABASE_V90_FIREBASE_AUTH_CORE_CLEAN.sql`.
2. Redeploy بدون Cache.
3. افتح `/om/ar/login?v=90` وتأكد من ظهور `Firebase Auth v90 Core`.
