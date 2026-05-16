# V82 Deploy Fix

تم تنظيف النسخة للنشر على Vercel:

- إزالة أي registry داخلي من `package-lock.json`.
- تثبيت `.npmrc` على `https://registry.npmjs.org/`.
- تعديل `vercel.json` لاستخدام `npm install --legacy-peer-deps` بدل `npm ci`.
- إبقاء `package-lock.json` واحد فقط في جذر المشروع.

بعد رفع النسخة إلى GitHub، اعمل Redeploy من Vercel.
