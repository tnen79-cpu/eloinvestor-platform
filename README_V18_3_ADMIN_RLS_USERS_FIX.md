# v18.3 Admin RLS + Users Fix

هذا الإصدار يعالج مشكلتين ظهرتا بعد إضافة صلاحيات الإدارة:

- `infinite recursion detected in policy for relation "users"`
- اختفاء المستخدمين من لوحة الإدارة بسبب RLS

## المطلوب بعد رفع النسخة

شغّل ملف SQL التالي في Supabase:

`SUPABASE_V18_3_ADMIN_RLS_USERS_FIX.sql`

الملف يقوم بـ:

- حذف سياسات users القديمة التي تسبب recursion.
- إنشاء دوال RPC آمنة:
  - `admin_get_my_profile`
  - `admin_list_users`
  - `admin_update_user`
- إعادة بناء RLS على users بدون recursion.
- ترقية البريد `na8061104@gmail.com` إلى super_admin.

## ملاحظات

لو بدك تغيير بريد الـ Super Admin، غيّر آخر update داخل ملف SQL.
