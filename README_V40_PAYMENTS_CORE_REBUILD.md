# EloInvestor v40 — Payments Core Rebuild

هذه النسخة تعيد بناء نظام الدفع كنظام مركزي بدل أن يكون مخصصاً للترويج فقط.

## المطلوب في Supabase
شغّل الملف:

`SUPABASE_V40_PAYMENTS_CORE_REBUILD.sql`

## ما تم تنفيذه

### 1) Payment Core موحد
تم إضافة endpoint عام:

`POST /api/payments/create-session`

يدعم الأنواع:
- `promotion`
- `package`
- `subscription`
- `boost`

وما زال endpoint القديم يعمل للتوافق:

`POST /api/payments/thawani/create-session`

### 2) جدول payments المركزي
كل العمليات تحفظ في جدول واحد:

`payments`

ويحتوي:
- نوع الدفع
- المستخدم
- المشروع
- طلب الترويج
- كود الباقة
- المبلغ
- حالة الدفع
- session id
- webhook status
- provider payload

### 3) تفعيل تلقائي بعد نجاح الدفع
بعد نجاح الدفع يتم تفعيل الخدمة حسب النوع:

- الترويج: تفعيل promotion_request + تمييز المشروع
- Boost 24h: رفع وزن المشروع لمدة 24 ساعة
- الباقات/الاشتراكات: تحديث خطة المستخدم وزيادة رصيد نشر المشاريع

### 4) لوحة الإدارة
داخل تبويب **بوابة الدفع** أصبح يظهر:
- إعدادات Thawani
- إجمالي الإيراد
- عدد العمليات الناجحة والمعلقة
- جدول عمليات الدفع
- النوع، المستخدم، المرجع، المبلغ، الحالة، webhook، session id

### 5) داشبورد المستخدم
تبويب الباقات يفتح الدفع مباشرة للباقات المدفوعة بدل إرسال طلب يدوي للإدارة.

## متغيرات احتياطية
لو لم تضبط المفاتيح من لوحة الإدارة، يمكن استخدام:

```env
THAWANI_SECRET_KEY=
THAWANI_PUBLISHABLE_KEY=
THAWANI_BASE_URL=https://uatcheckout.thawani.om/api/v1
THAWANI_CHECKOUT_URL=https://uatcheckout.thawani.om
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## ملاحظة مهمة
مفاتيح Thawani السرية محفوظة في قاعدة البيانات كما في النسخة السابقة. للإنتاج الأفضل لاحقاً تشفيرها أو إبقاؤها في Environment Variables على Vercel.
