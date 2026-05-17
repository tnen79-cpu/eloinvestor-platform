# v83 Firebase Phone + Google Auth

هذه النسخة تشغل تسجيل الدخول بالهاتف وجوجل عبر Firebase، مع بقاء Supabase للبيانات والتخزين.

## 1) شغّل SQL

شغّل:

```sql
SUPABASE_V83_FIREBASE_AUTH.sql
```

## 2) أضف متغيرات Firebase في Vercel

من Firebase Console > Project Settings > General > Web app config أضف:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
```

واحتفظ بمتغيرات Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## 3) فعّل Firebase Authentication

Firebase Console > Authentication > Sign-in method:

- فعّل Phone
- فعّل Google

## 4) أضف الدومين

Firebase Console > Authentication > Settings > Authorized domains:

```text
www.eloinvestor.com
eloinvestor.com
localhost
```

## 5) ملاحظة مهمة

النظام يعمل كـ Bridge:

- Firebase يتحقق من الهاتف/جوجل.
- API يحفظ/يربط المستخدم في جدول `public.users`.
- باقي المنصة تقرأ المستخدم من نفس `auth_id` لكن بقيمة Firebase UID.

