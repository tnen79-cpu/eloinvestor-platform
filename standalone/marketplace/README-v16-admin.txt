إلو مستثمر v16 - لوحة الإدارة والصلاحيات

الجديد:
- لوحة إدارة حقيقية بسايدبار.
- حسابات إدارة admin_staff.
- أدوار: Super Admin، مراجع مشاريع، مراجع توثيق، دعم، محاسب، مدير محتوى.
- صلاحيات لكل قسم.
- إدارة المشاريع: قبول/رفض/إرجاع/حذف/تعديل.
- إدارة المستخدمين: تغيير الباقة ونوع الحساب.
- إدارة الباقات من خلال المستخدمين.
- إشعارات.
- سجل نشاط Admin Logs.

طريقة التفعيل:
1) ارفع الملفات.
2) شغّل supabase/v16-admin-system.sql في Supabase SQL Editor.
3) عيّن أول مدير:
   update public.users set role='admin' where email='YOUR_EMAIL@gmail.com';
4) افتح admin-dashboard.html.

ملاحظة:
لو عندك RLS قديم على users فيه recursion، احذف السياسات القديمة التي تعمل JOIN على users داخل users.
