# EloInvestor v30 Clean Design Rebuild

هذه نسخة إعادة بناء نظيفة للتصميم:

- تم استبدال ملف `app/globals.css` بالكامل بهوية واحدة جديدة.
- تم حذف بيانات المشاريع الوهمية من `lib/data.ts`.
- الصفحة الرئيسية تعرض بيانات قاعدة البيانات فقط، أو حالة فارغة عند عدم وجود مشاريع.
- صفحة الفرص أُعيد بناؤها بتصميم Marketplace واضح وفلاتر بسيطة.
- لوحة المستخدم مدعومة بتصميم Dashboard نظيف، مع قسم ترويج المشاريع.
- تم استبدال صور الـ fallback الخارجية بصورة SVG داخلية حتى لا تظهر مشاريع أو صور وهمية.

## التشغيل

```bash
npm install
npm run build
npm run dev
```

> في حال ظهور ETIMEDOUT من npm، المشكلة اتصال/registry. جرّب الأمر داخل شبكة مستقرة أو استخدم:

```bash
npm config set registry https://registry.npmjs.org/
npm install --prefer-online
```
