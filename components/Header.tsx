import Link from 'next/link';
import { getDictionary } from '@/lib/data';
import type { DbCountry } from '@/lib/server-data';
import { AuthHeaderActions } from '@/components/AuthHeaderActions';
import { NotificationCenter } from '@/components/NotificationCenter';

export function Header({ country, lang, countries }: { country: string; lang: string; countries: DbCountry[] }) {
  const c = countries.find((item) => item.code === country) || countries.find((item) => item.isDefault) || countries[0];
  const t = getDictionary(lang);
  const isAr = lang === 'ar';
  const oppositeLang = isAr ? 'en' : 'ar';

  return (
    <header className="site-header v16-nav-wrap">
      <div className="v16-nav">
        <Link href={`/${c.code}/${lang}`} className="v16-brand">
          <span>إ</span>
          <b>{isAr ? 'إلو مستثمر' : 'Alo Investor'}</b>
        </Link>

        <nav className="v16-nav-links" aria-label={isAr ? 'القائمة الرئيسية' : 'Main navigation'}>
          <Link href={`/${c.code}/${lang}`}>{t.home}</Link>
          <Link href={`/${c.code}/${lang}/opportunities`}>{t.opportunities}</Link>
          <Link href={`/${c.code}/${lang}/add-project`}>{t.addProject}</Link>
          <Link href={`/${c.code}/${lang}/packages`}>{t.packages}</Link>
          <Link href={`/${c.code}/${lang}/dashboard`}>{isAr ? 'حسابي' : 'Account'}</Link>
        </nav>

        <div className="v16-nav-actions">
          <div className="group relative hidden md:block">
            <button className="v16-btn-ghost">
              <span>{c.flag}</span>
              <span>{isAr ? c.nameAr : c.nameEn}</span>
            </button>
            <div className="invisible absolute end-0 top-full mt-3 w-64 rounded-3xl border border-[#e8ece9] bg-white p-2 opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100">
              {countries.map((item) => (
                <Link key={item.code} href={`/${item.code}/${lang}`} className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold hover:bg-[#e8f7ef]">
                  <span>{isAr ? item.nameAr : item.nameEn}</span>
                  <span className="flex items-center gap-2"><span className="text-xs uppercase text-slate-500">{item.currency}</span>{item.flag}</span>
                </Link>
              ))}
            </div>
          </div>
          <NotificationCenter country={c.code} lang={lang} />
          <Link href={`/${c.code}/${oppositeLang}`} className="v16-btn-ghost uppercase">{oppositeLang}</Link>
          <AuthHeaderActions country={c.code} lang={lang} labels={{ login: t.login, register: t.register }} />
        </div>
      </div>
    </header>
  );
}
