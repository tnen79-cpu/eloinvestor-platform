import Link from 'next/link';
import { formatMoney, getCategoryLabel, getDictionary, projects } from '@/lib/data';
import { notFound } from 'next/navigation';

export default async function ProjectDetailsPage({ params }: { params: Promise<{ country: string; lang: string; slug: string }> }) {
  const { country, lang, slug } = await params;
  const t = getDictionary(lang);
  const p = projects.find((item) => item.slug === slug && item.country === country);
  if (!p) notFound();
  const isAr = lang === 'ar';
  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
      <section className="space-y-8">
        <div className="overflow-hidden rounded-[3rem] bg-white p-3 shadow-sm">
          <img src={p.image} alt="" className="h-[460px] w-full rounded-[2.4rem] object-cover" />
        </div>
        <div className="rounded-[3rem] bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">{getCategoryLabel(p.category, lang)}</span>
            {p.verified && <span className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-black text-white">✓ {t.verified}</span>}
          </div>
          <h1 className="text-4xl font-black leading-tight text-slate-950">{isAr ? p.titleAr : p.titleEn}</h1>
          <p className="mt-4 text-lg leading-9 text-slate-600">{isAr ? p.summaryAr : p.summaryEn}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-slate-50 p-5"><p className="text-sm font-bold text-slate-500">{t.price}</p><p className="mt-2 text-2xl font-black text-emerald-800">{formatMoney(p.price, p.country, lang)}</p></div>
            <div className="rounded-3xl bg-slate-50 p-5"><p className="text-sm font-bold text-slate-500">{t.roi}</p><p className="mt-2 text-2xl font-black text-emerald-800">{p.roi}%</p></div>
            <div className="rounded-3xl bg-slate-50 p-5"><p className="text-sm font-bold text-slate-500">{t.location}</p><p className="mt-2 text-xl font-black text-slate-950">{isAr ? p.cityAr : p.cityEn}</p></div>
          </div>
        </div>
      </section>
      <aside className="h-fit rounded-[3rem] bg-white p-8 shadow-sm lg:sticky lg:top-28">
        <h2 className="text-2xl font-black text-slate-950">{t.contact}</h2>
        <p className="mt-3 text-slate-600">{isAr ? 'سجّل الدخول للتواصل مع صاحب المشروع وعرض بيانات التواصل.' : 'Sign in to contact the project owner and view contact details.'}</p>
        <Link href={`/${country}/${lang}/login`} className="mt-6 block rounded-2xl bg-emerald-700 px-6 py-4 text-center font-black text-white">{t.contact}</Link>
        <Link href={`/${country}/${lang}/opportunities`} className="mt-3 block rounded-2xl border border-slate-200 px-6 py-4 text-center font-black text-emerald-900">{t.opportunities}</Link>
      </aside>
    </main>
  );
}
