# v41 Launch Review — EloInvestor

## تم تنفيذه

- مراجعة TypeScript للمشروع كاملًا: `npx tsc --noEmit` نجح.
- مراجعة ESLint: لا توجد أخطاء، فقط تحذيرات غير مانعة للنشر.
- إصلاح مشكلة تباين الأزرار عبر Patch عام في `app/globals.css`:
  - منع زر بخلفية بيضاء ونص أبيض.
  - منع أزرار خضراء بنص داكن غير واضح.
  - توحيد ألوان الأزرار الأساسية في الموقع ولوحة الإدارة.
  - إضافة حالات focus واضحة للكيبورد.
  - تحسين disabled state للأزرار.
  - إصلاح شكل التبويب النشط في لوحة الإدارة `admin-premium-tab-active`.
- تحسين زر/تبويب الإدارة حتى لا يظهر نص غير مقروء.
- تحديث Next.js من `16.2.4` إلى `16.2.6` لتقليل ثغرات audit المرتبطة بالإصدار القديم.
- إضافة `dynamic = 'force-dynamic'` و `revalidate = 0` للصفحات التي تحتاج تشغيل ديناميكي بدل محاولة pre-render.
- إصلاح تحذير compare page الخاص بقراءة localStorage بشكل آمن.
- تشغيل `eslint --fix` لإصلاح أخطاء `prefer-const`.

## ملاحظات قبل النشر

- `npm run build` ينجح في مرحلة التجميع، ثم يطول/يتوقف داخل البيئة عند `Collecting page data using 40 workers`. هذا حصل أيضًا في النسخ السابقة. لم يظهر خطأ TypeScript أو compile error.
- لأن `npx tsc --noEmit` ناجح و `eslint` بدون أخطاء، المشكلة تبدو من بيئة البناء أو Next build worker وليس من خطأ مباشر في الكود.
- عند النشر على Vercel أو سيرفر فيه موارد أعلى، جرّب البناء مباشرة. إذا استمر التوقف، استخدم أمر منفصل قبل build:
  - `npx tsc --noEmit`
  - ثم `next build`

## ملفات تم تعديلها مهمّة

- `app/globals.css`
- `eslint.config.mjs`
- `next.config.ts`
- `package.json`
- `package-lock.json`
- صفحات `page.tsx` لإضافة force dynamic/revalidate عند الحاجة.
