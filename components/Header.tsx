import Link from 'next/link';
import { countries, getCountry, getDictionary } from '@/lib/data';

export function Header({ country, lang }: { country: string; lang: string }) {
  const c = getCountry(country);
  const t = getDictionary(lang);
  const isAr = lang === 'ar';
  const oppositeLang = isAr ? 'en' : 'ar';

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={`/${country}/${lang}`} className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-700 text-white shadow-lg shadow-emerald-900/10">📈</span>
          <span className="text-2xl font-black tracking-tight text-emerald-950">إلو مستثمر</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-bold text-slate-700 md:flex">
          <Link href={`/${country}/${lang}`}>{t.home}</Link>
          <Link href={`/${country}/${lang}/opportunities`}>{t.opportunities}</Link>
          <Link href={`/${country}/${lang}/add-project`}>{t.addProject}</Link>
        </nav>

        <div className="flex items-center gap-2">
          <div className="group relative">
            <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm">
              <span>{c.flag}</span><span>{isAr ? c.nameAr : c.nameEn}</span><span className="text-xs uppercase text-slate-500">{c.code}</span>
            </button>
            <div className="invisible absolute end-0 top-full mt-3 w-60 rounded-3xl border border-slate-200 bg-white p-2 opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100">
              {countries.map((item) => (
                <Link key={item.code} href={`/${item.code}/${lang}`} className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold hover:bg-emerald-50">
                  <span>{isAr ? item.nameAr : item.nameEn}</span><span>{item.flag}</span>
                </Link>
              ))}
            </div>
          </div>
          <Link href={`/${country}/${oppositeLang}`} className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black uppercase text-emerald-800 shadow-sm">{oppositeLang}</Link>
          <Link href={`/${country}/${lang}/login`} className="hidden rounded-full px-4 py-3 text-sm font-black text-emerald-900 sm:block">{t.login}</Link>
          <Link href={`/${country}/${lang}/register`} className="hidden rounded-full bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/10 sm:block">{t.register}</Link>
        </div>
      </div>
    </header>
  );
}
