export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const isAr = lang === 'ar';
  const sections = isAr ? [
    ['البيانات التي نجمعها', 'قد نجمع بيانات الحساب، بيانات التواصل، بيانات المشاريع، ملفات التوثيق، وسجلات الاستخدام اللازمة لتشغيل المنصة.'],
    ['كيف نستخدم البيانات', 'نستخدم البيانات لإنشاء الحساب، عرض المشاريع، تفعيل التواصل، مراجعة التوثيق، تحسين الأمان، وإدارة المدفوعات والباقات.'],
    ['مشاركة البيانات', 'لا نبيع بيانات المستخدمين. قد نشارك بيانات محدودة مع مزودي الخدمة الضروريين مثل الدفع، الرسائل، التخزين، أو الالتزام القانوني.'],
    ['ملفات التوثيق', 'ملفات الهوية أو السجل التجاري تستخدم لأغراض المراجعة والثقة ولا تظهر للعموم.'],
    ['حقوقك', 'يمكنك طلب تعديل أو حذف بياناتك وفق القوانين المطبقة وسياسات المنصة.'],
  ] : [
    ['Data we collect', 'We may collect account data, contact data, project data, verification files, and usage logs required to operate the platform.'],
    ['How we use data', 'We use data to create accounts, show projects, enable contact, review verification, improve security, and manage payments and plans.'],
    ['Data sharing', 'We do not sell user data. Limited data may be shared with necessary providers such as payment, messaging, storage, or legal compliance.'],
    ['Verification files', 'ID or business registry files are used for review and trust purposes and are not shown publicly.'],
    ['Your rights', 'You may request correction or deletion of your data subject to applicable laws and platform policies.'],
  ];
  return <main className="market-page-shell" dir={isAr ? 'rtl' : 'ltr'}><section className="market-section-head"><span>{isAr ? 'قانوني' : 'Legal'}</span><h1>{isAr ? 'سياسة الخصوصية' : 'Privacy policy'}</h1><p>{isAr ? 'ملخص واضح لكيفية تعامل إلو مستثمر مع بيانات المستخدمين.' : 'A clear summary of how EloInvestor handles user data.'}</p></section><section className="grid gap-4">{sections.map(([title, text]) => <article key={title} className="platform-card platform-card-pad"><h2 className="text-xl font-black text-[var(--brand-ink)]">{title}</h2><p className="mt-3 text-sm font-bold leading-7 text-[var(--brand-muted)]">{text}</p></article>)}</section></main>;
}
