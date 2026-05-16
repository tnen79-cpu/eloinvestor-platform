# v34.6 Build Guard

تم تجهيز نسخة متابعة من v34.5 مع تعديل صغير مهم:

- إضافة حماية في `lib/server-data.ts` تمنع استدعاء Supabase أثناء مرحلة `next build`، حتى لا يعلق البناء عند `Collecting page data` في البيئات التي لا تسمح باتصال خارجي مستقر.
- البيانات الحقيقية تبقى تُقرأ وقت التشغيل من Supabase بعد نشر المشروع وتشغيله مع متغيرات البيئة الصحيحة.
- لم يتم حذف أي من ميزات v34.5: تبويب الترويج في لوحة المستخدم، تبويب طلبات الترويج في الإدارة، الأسئلة، الخريطة، الوثائق، وروابط الترويج.

ملاحظات فحص:
- `npm install` نجح محليًا.
- `next build` وصل إلى Compile + TypeScript بنجاح.
- البيئة هنا ما زالت توقف العملية عند Collecting page data بسبب timeout خارجي، لذلك أضفنا Build Guard لتخفيف المشكلة في Vercel/البيئة المحلية.

تشغيل:
1. انسخ `.env.local` وضع:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
2. شغّل SQL الأخير:
   - `SUPABASE_V34_4_PROMOTION_MAP_DOCS_ADMIN.sql`
3. ثم:
   - `npm install`
   - `npm run dev`
   - أو `npm run build`
