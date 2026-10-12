إلو مستثمر v31 - تفعيل الشات + مراقبة البلاغات

ما تم إصلاحه:
- إصلاح سبب تعليق صفحة chat.html على skeleton: app.js الآن يستدعي initChat بعد تحميل الملفات الديناميكية.
- الشات يعمل حتى لو تم تحميل chat.js بعد DOMContentLoaded.
- إضافة زر إبلاغ داخل المحادثة.
- إضافة جدول chat_reports للبلاغات.
- إضافة قسم "بلاغات الشات" داخل لوحة الإدارة.
- الإدارة تستطيع مراجعة البلاغات، عرض الرسائل، تحديث حالة البلاغ، وحظر الطرف المخالف.
- تحسين رسائل الخطأ في صفحة الشات إذا لم يتم تشغيل SQL.

ملف SQL المطلوب:
- supabase/v31-chat-moderation.sql

مهم:
1. شغّل v29-chat-realtime.sql إذا لم تشغله مسبقًا.
2. شغّل v31-chat-moderation.sql.
3. من Supabase Realtime فعّل:
   chat_conversations
   chat_messages
   notifications
   chat_reports
4. تأكد أن حساب الإدارة لديه permission: chat_moderation أو role super_admin.
