# v89 Admin Path Change

تم تغيير مسار لوحة الإدارة بالكامل إلى:

```text
/eloinvestor-admin
```

ومسار الدخول للإدارة:

```text
/eloinvestor-admin/login
```

المسار القديم `/admin` يحوّل تلقائياً إلى صفحة الدخول الجديدة.

## متغير Vercel المطلوب

أضف في Vercel Environment Variables:

```env
ADMIN_PANEL_PASSWORD=ضع_كلمة_مرور_قوية_هنا
```

ثم اعمل Redeploy بدون cache.

## ملاحظات

- دخول الإدارة أصبح مستقل عن تسجيل دخول المستخدمين Firebase/Supabase.
- هذا يحل مشكلة أن Firebase لا يربط Session مع Supabase Auth.
- واجهات المستخدم العادية تبقى كما هي.
