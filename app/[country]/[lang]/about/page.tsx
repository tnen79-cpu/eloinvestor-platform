export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from 'next/link';

export default async function AboutPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const isAr = lang === 'ar';
  const base = `/${country}/${lang}`;
  return (
    <main className="market-page-shell" dir={isAr ? 'rtl' : 'ltr'}>
      <section className="market-section-head">
        <span>{isAr ? 'عن المنصة' : 'About'}</span>
        <h1>{isAr ? 'إلو مستثمر — سوق موثوق للفرص الاستثمارية' : 'EloInvestor — a trusted marketplace for investment opportunities'}</h1>
        <p>{isAr ? 'نربط أصحاب المشاريع الجادين بالمستثمرين عبر تجربة منظمة، توثيق اختياري، تواصل داخلي، وباقات ترويج تساعد المشاريع الجيدة على الظهور.' : 'We connect serious project owners with investors through a structured marketplace, optional verification, internal messaging, and promotion tools.'}</p>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {[
          [isAr ? 'ثقة أعلى' : 'More trust', isAr ? 'توثيق للمشاريع والمستثمرين لرفع المصداقية قبل التواصل.' : 'Verification tools for projects and investors before contact.'],
          [isAr ? 'تواصل منظم' : 'Organized contact', isAr ? 'محادثات وإشعارات داخلية بدل ضياع الطلبات على قنوات كثيرة.' : 'Internal messaging and notifications keep requests organized.'],
          [isAr ? 'بحث وفلترة' : 'Search and filters', isAr ? 'فرز حسب القطاع، المدينة، نوع الفرصة، والميزانية.' : 'Filter by sector, city, opportunity type, and budget.'],
        ].map(([title, text]) => <article key={title} className="platform-card platform-card-pad"><h2 className="text-xl font-black text-[var(--brand-ink)]">{title}</h2><p className="mt-3 text-sm font-bold leading-7 text-[var(--brand-muted)]">{text}</p></article>)}
      </section>
      <section className="mt-6 rounded-[2rem] bg-slate-950 p-6 text-white">
        <h2 className="text-2xl font-black">{isAr ? 'ابدأ الآن' : 'Get started'}</h2>
        <p className="mt-2 text-sm font-bold text-white/70">{isAr ? 'تصفح الفرص أو أضف مشروعك ليصل للمستثمرين المناسبين.' : 'Browse opportunities or list your project for suitable investors.'}</p>
        <div className="mt-5 flex flex-wrap gap-3"><Link className="platform-primary" href={`${base}/opportunities`}>{isAr ? 'تصفح الفرص' : 'Browse opportunities'}</Link><Link className="platform-secondary" href={`${base}/add-project`}>{isAr ? 'أضف مشروعك' : 'List your project'}</Link></div>
      </section>
    </main>
  );
}
