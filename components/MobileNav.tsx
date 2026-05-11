import Link from 'next/link';
import { getDictionary } from '@/lib/data';

export function MobileNav({ country, lang }: { country: string; lang: string }) {
  const t = getDictionary(lang);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-4 py-2 shadow-2xl backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 text-center text-[11px] font-black text-slate-600">
        <Link className="rounded-2xl p-2 hover:bg-emerald-50" href={`/${country}/${lang}`}>🏠<span className="block">{t.home}</span></Link>
        <Link className="rounded-2xl p-2 hover:bg-emerald-50" href={`/${country}/${lang}/opportunities`}>🔎<span className="block">{t.opportunities}</span></Link>
        <Link className="rounded-2xl p-2 text-emerald-800 hover:bg-emerald-50" href={`/${country}/${lang}/add-project`}>➕<span className="block">{t.addProject}</span></Link>
        <Link className="rounded-2xl p-2 hover:bg-emerald-50" href={`/${country}/${lang}/login`}>👤<span className="block">{t.login}</span></Link>
      </div>
    </nav>
  );
}
