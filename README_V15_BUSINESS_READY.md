# EloInvestor Next v15 Business Ready

## ما تم تنفيذه
- تشغيل المحفوظات فعليًا عبر `investor_saved_projects` وربط زر الحفظ بكروت الفرص.
- صفحة/تبويب الفرص المقترحة داخل لوحة المستثمر حسب الاهتمامات والميزانية والموقع والتوثيق والتفاعل.
- نظام حدود اقتراحات حسب باقة المستثمر:
  - Free: 3 فرص مقترحة.
  - Growth: 10 فرص.
  - Investor Pro: 25 فرصة.
  - Investor Elite/Premium: غير محدود.
- باقات منفصلة للمستثمر وصاحب المشروع داخل الداشبورد.
- طلبات ترقية باقات تحفظ في `package_upgrade_requests` أو fallback notifications.
- توثيق المشاريع أصبح للباقات المدفوعة فقط.
- إضافة قسم داخل أسفل صفحة إضافة المشروع: **عزز بيع مشروعك مع شارة الثقة**.
- رفع ملف توثيق المشروع من نفس نموذج إضافة/تعديل المشروع عند امتلاك باقة مدفوعة.
- قفل اقتراحات إضافية للمستثمر المجاني مع CTA للترقية.

## مطلوب تشغيله في Supabase
شغّل الملف:
`SUPABASE_V15_BUSINESS_READY.sql`

وتأكد من وجود buckets:
- `project-images`
- `verification-docs`

## فحص البناء
تم فحص البناء بنجاح باستخدام مفاتيح Supabase وهمية:
`NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy npm run build`
