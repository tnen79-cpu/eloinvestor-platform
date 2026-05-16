# v39 - إعدادات بوابة الدفع من لوحة الإدارة

## ما الجديد؟
- إضافة تبويب جديد في لوحة الإدارة باسم **بوابة الدفع**.
- التحكم في Thawani من لوحة الإدارة:
  - تشغيل / إيقاف الدفع.
  - وضع Test أو Live.
  - Publishable Key.
  - Secret Key.
  - API Base URL.
  - Checkout URL.
  - Webhook URL.
- API آمن نسبيًا لحفظ الإعدادات:
  - `/api/admin/payment-gateway-settings`
  - `/api/admin/payment-gateway-settings/test`
- بوابة الدفع تقرأ المفاتيح من قاعدة البيانات أولًا، ثم تستخدم `.env` كاحتياط.
- المفتاح السري لا يظهر بعد الحفظ. إذا تركته فارغًا لا يتم تغييره.

## خطوات التفعيل
1. شغّل SQL:
   `SUPABASE_V39_PAYMENT_GATEWAY_ADMIN_SETTINGS.sql`

2. افتح لوحة الإدارة:
   `/admin`

3. ادخل تبويب **بوابة الدفع**.

4. ضع مفاتيح Thawani.

5. احفظ الإعدادات.

6. أضف Webhook في لوحة Thawani:
   `https://eloinvestor.com/api/payments/thawani/webhook`

## ملاحظة مهمة
يفضل أن تبقى هذه القيم في `.env.local` كنسخة احتياطية:

```env
THAWANI_SECRET_KEY=
THAWANI_PUBLISHABLE_KEY=
THAWANI_BASE_URL=https://uatcheckout.thawani.om/api/v1
THAWANI_CHECKOUT_URL=https://uatcheckout.thawani.om
```

لكن بعد v39 يمكن التحكم بها من لوحة الإدارة بدون تعديل `.env`.
