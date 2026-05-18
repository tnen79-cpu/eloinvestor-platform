# v91 Supabase-only Auth

هذه النسخة ألغت Firebase بالكامل من الكود.

## نظام الدخول الحالي

1. الهاتف هو طريقة الدخول الأساسية عبر Supabase OTP SMS.
2. Google OAuth عبر Supabase.
3. الإيميل وكلمة المرور موجودين كخيار احتياطي عند الحاجة.

## متغيرات البيئة المطلوبة

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PANEL_PASSWORD=
```

## إعداد Supabase Dashboard

فعّل من Authentication > Providers:

- Phone
- Google
- Email اختياري

ثم أضف Redirect URLs:

```txt
https://eloinvestor.com/om/ar/auth/callback
https://eloinvestor.com/om/en/auth/callback
http://localhost:3000/om/ar/auth/callback
http://localhost:3000/om/en/auth/callback
```

## SQL

شغّل الملف:

```txt
SUPABASE_V91_SUPABASE_ONLY_AUTH.sql
```

## ملاحظات

- لا يوجد Firebase package.
- لا يوجد Firebase imports.
- لا يوجد bridge بين Firebase و Supabase.
- مصدر المستخدم الوحيد هو Supabase Auth.
