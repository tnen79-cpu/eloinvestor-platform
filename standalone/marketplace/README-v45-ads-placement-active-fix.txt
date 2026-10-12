v45 Ads Placement Active Fix

تم الإصلاح:
- تفعيل إعلان لوحة المستخدم dashboard_top داخل لوحة المستخدم بعد تحميل الداشبورد الديناميكي.
- إضافة مكان إعلان الرئيسية وسط الصفحة home_middle.
- نقل إعلان project_sidebar إلى جانب صفحة تفاصيل المشروع فعليًا داخل aside.
- نص الزر أصبح اختياريًا ولا يتم حفظ 'اعرف المزيد' تلقائيًا.
- الوصف المختصر أصبح اختياريًا.
- الإعلان لا يظهر إلا إذا كان له placement مطابق و is_active=true وغير منتهي.

شغّل SQL الاختياري:
supabase/v45-ads-placement-optional-fields.sql

أماكن الظهور:
home_top
home_middle
opportunities_top
project_details_mid
project_sidebar
plans_top
dashboard_top
