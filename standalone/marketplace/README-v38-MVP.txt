إلو مستثمر v38 - MVP Essentials

الملفات المضافة/المعدلة:

1) شات بمرفقات
- chat.html: إضافة زر مرفقات + معاينة الملف قبل الإرسال.
- assets/js/chat.js: رفع الملفات إلى bucket باسم chat-attachments وإرسالها داخل chat_messages.
- assets/css/style.css: تصميم المرفقات والصور داخل المحادثة وتحسين تجربة الموبايل.

2) دفع الباقات MVP
- plans.html: تحويل أزرار الشراء إلى نموذج طلب دفع مع رفع إيصال.
- assets/js/plans.js: إنشاء payment_request ورفع الإيصال إلى bucket باسم payment-receipts.
- assets/js/admin.js: قسم المدفوعات صار يعرض طلبات الدفع، يفتح الإيصال، ويقبل/يرفض الطلب.
- supabase/v38-mvp-attachments-payments.sql: الجداول والسياسات والدالة approve_payment_request.

3) صفحة مشروع احترافية
- project-details.html: مؤشرات ثقة، تاريخ نشر، ملاحظة أمان، مشاريع مشابهة، حفظ المشروع.
- assets/js/project-details.js: تحميل مشاريع مشابهة، حفظ المشروع، عرض حالة الثقة.
- assets/css/style.css: تصميم إضافي للصفحة والتجاوب.

4) تحسين الموبايل
- تحسينات للشات، صفحة التفاصيل، لوحة الإدارة والجداول على الشاشات الصغيرة.

5) تنظيف Admin
- قسم المدفوعات أصبح فعّال بدل النص المؤقت.
- أزرار قبول/رفض طلب الدفع من لوحة الإدارة.
- تحسينات CSS للجداول والملاحة بالموبايل.

خطوات التشغيل:
1. ارفع الملفات.
2. شغّل SQL بالترتيب حتى v37 إذا لم تكن مشغلة.
3. شغّل: supabase/v38-mvp-attachments-payments.sql
4. من Supabase Storage تأكد من وجود buckets:
   - chat-attachments
   - payment-receipts
5. من Realtime فعّل الجداول عند الحاجة:
   - chat_messages
   - chat_conversations
   - chat_presence
   - payment_requests

اختبار سريع:
- سجل دخول كمستثمر وصاحب مشروع.
- افتح مشروع واضغط شات داخلي.
- أرسل نص + صورة أو PDF.
- اشترِ باقة من plans.html وارفع إيصال.
- افتح admin-dashboard.html > المدفوعات > قبول وتفعيل.
- تأكد أن رصيد المستخدم زاد والباقه أصبحت active.
