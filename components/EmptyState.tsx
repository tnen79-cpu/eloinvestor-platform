import Link from 'next/link';
import { SearchX } from 'lucide-react';

export function EmptyState({ lang, country }: { lang: string; country: string }) {
  const isAr = lang === 'ar';
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><SearchX size={28} /></div>
      <h2 className="text-2xl font-black text-slate-900">{isAr ? 'لا توجد فرص في هذه الدولة بعد' : 'No opportunities yet'}</h2>
      <p className="mx-auto mt-3 max-w-xl leading-8 text-slate-500">{isAr ? 'ابدأ بإضافة أول مشروع لهذه الدولة أو عدّل الفلاتر لاحقًا عند توفر فرص جديدة.' : 'Start by listing the first project for this country or adjust filters once more opportunities are available.'}</p>
      <Link href={`/${country}/${lang}/add-project`} className="mt-7 inline-flex rounded-2xl bg-emerald-700 px-6 py-4 font-black text-white shadow-lg shadow-emerald-900/10">
        {isAr ? 'أضف أول مشروع' : 'Add first project'}
      </Link>
    </div>
  );
}
