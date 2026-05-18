export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TermsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const isAr = lang === 'ar';
  const sections = isAr ? [
    ['طبيعة الخدمة', 'إلو مستثمر منصة ربط وعرض فرص استثمارية وليست مستشاراً مالياً أو وسيطاً قانونياً. يجب على المستخدمين إجراء العناية الواجبة قبل أي اتفاق.'],
    ['مسؤولية المستخدم', 'يتعهد المستخدم بتقديم بيانات صحيحة وعدم نشر فرص مضللة أو محتوى مخالف أو استخدام المنصة للتواصل الاحتيالي.'],
    ['التوثيق والثقة', 'شارة التوثيق تعني أن المنصة راجعت مستندات أساسية ولا تمثل ضماناً للعائد أو نجاح المشروع.'],
    ['المدفوعات والباقات', 'الباقات والترويج خدمات رقمية تبدأ عند التفعيل، وقد تختلف سياسة الاسترداد حسب حالة الخدمة والقوانين المطبقة.'],
    ['إزالة المحتوى', 'يحق للمنصة إخفاء أو حذف أي مشروع أو حساب يخالف الشروط أو يضر بثقة المستخدمين.'],
  ] : [
    ['Service nature', 'EloInvestor is a marketplace and connection platform, not a financial advisor or legal broker. Users must perform due diligence before any agreement.'],
    ['User responsibility', 'Users must provide accurate information and avoid misleading opportunities, prohibited content, or fraudulent contact.'],
    ['Verification and trust', 'A verified badge means basic documents were reviewed; it is not a guarantee of returns or project success.'],
    ['Payments and plans', 'Plans and promotion are digital services that begin when activated; refunds may depend on service status and applicable law.'],
    ['Content removal', 'The platform may hide or remove projects or accounts that violate terms or harm user trust.'],
  ];
  return <main className="market-page-shell" dir={isAr ? 'rtl' : 'ltr'}><section className="market-section-head"><span>{isAr ? 'قانوني' : 'Legal'}</span><h1>{isAr ? 'شروط الاستخدام' : 'Terms of use'}</h1><p>{isAr ? 'باستخدامك للمنصة فأنت توافق على هذه الشروط الأساسية.' : 'By using the platform, you agree to these core terms.'}</p></section><section className="grid gap-4">{sections.map(([title, text]) => <article key={title} className="platform-card platform-card-pad"><h2 className="text-xl font-black text-[var(--brand-ink)]">{title}</h2><p className="mt-3 text-sm font-bold leading-7 text-[var(--brand-muted)]">{text}</p></article>)}</section></main>;
}
