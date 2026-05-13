# EloInvestor Next v12.4 — HTML Style Match

هذه النسخة تكمل من v12.3 وتحوّل واجهة Next.js لتكون أقرب لنسخة HTML التي تم العمل عليها:

- هيدر داكن بنفس روح نسخة HTML.
- ألوان أخضر داكن + ذهبي.
- الصفحة الرئيسية بتصميم Marketplace فخم.
- صفحة الفرص مع Hero، فلترة سريعة، فلترة جانبية، وكروت سوق.
- ProjectCard صار يشبه كروت نسخة HTML: صورة، badge، score، مؤشرات، أزرار تفاصيل/حفظ.
- Bottom nav للموبايل قريب من نسخة HTML.
- الحفاظ على منطق الأدوار من v12.3: investor / owner / both / admin.

## فحص البناء
تم فحص build باستخدام مفاتيح Supabase وهمية فقط لأن البيئة المحلية لا تحتوي مفاتيح المشروع:

NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy npm run build

النتيجة: build ناجح.
