# EloInvestor v25 Test Ready Platform

هذه نسخة مبنية فعليًا على الملف المرفوع `eloinvestor_next_v23_clean_rebuild(1).zip` مع تركيز على التجربة والفحص قبل الإنتاج.

## أهم التعديلات

1. إزالة الداتا التجريبية من الواجهة العامة
- تم إيقاف fallback المشاريع الوهمية عند فشل الاتصال بقاعدة البيانات.
- الواجهة لن تعرض مشاريع demo/test من `lib/data.ts` عند عدم وجود مشاريع حقيقية في Supabase.

2. نظام القطاعات من لوحة الإدارة
- جدول جديد `platform_sectors`.
- إدارة القطاعات من لوحة الإدارة: الاسم العربي/الإنجليزي، الرمز، الصورة، الدولة، الترتيب، التفعيل.
- القطاعات تظهر في الرئيسية ونموذج إضافة المشروع والبحث المتقدم.

3. عداد المشاهدات
- مكوّن `ProjectViewTracker` يضيف سجلًا في `project_views_log` ويزيد `views_count/views` عند فتح تفاصيل المشروع.
- يمنع العد المتكرر داخل نفس جلسة المتصفح.

4. ترويج المشاريع المدفوع
- إبقاء نظام الحملات `ad_campaigns` وربطه بالمشاريع الممولة.
- زر “روّج مشروعك” في تفاصيل المشروع لأصحاب المشاريع يرسل طلبًا إلى `promotion_requests`.
- لوحة الإدارة فيها الإعلانات والتمويل لإدارة البنرات والحملات.

5. صفحة الباقات
- تم ربط صفحة الباقات بجدول `subscription_packages` بدل بيانات hardcoded.
- إذا لا توجد باقات مفعلة، تظهر رسالة واضحة بدل باقات وهمية.

6. توافق قواعد البيانات القديمة
- ملف SQL آمن: `SUPABASE_V25_TEST_READY_PLATFORM.sql`.
- يستخدم `add column if not exists` و `create table if not exists` لتجنب أخطاء الأعمدة القديمة.

## التشغيل

1. شغّل SQL:
`SUPABASE_V25_TEST_READY_PLATFORM.sql`

2. ضع ملف `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

3. شغّل:
```bash
npm install
npm run dev
```

## ملاحظات فحص
- فحص TypeScript نجح عبر `npx tsc --noEmit`.
- build داخل بيئة الاختبار يتوقف عند مرحلة static page data عند استخدام مفاتيح Supabase وهمية، لذلك اعتمدنا فحص TypeScript. شغّله عندك بمفاتيح Supabase الحقيقية.
