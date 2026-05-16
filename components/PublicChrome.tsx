'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { MobileNav } from '@/components/MobileNav';
import { SiteFooter } from '@/components/SiteFooter';
import { I18nProvider } from '@/components/I18nProvider';
import type { DbCountry, DbLanguage, UiTranslations } from '@/lib/server-data';

export function PublicChrome({ country, lang, countries, languages = [], translations = {}, children }: { country: string; lang: string; countries: DbCountry[]; languages?: DbLanguage[]; translations?: UiTranslations; children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isPrivateArea = pathname.includes(`/${country}/${lang}/dashboard`) || pathname.includes(`/${country}/${lang}/messages`) || pathname.includes(`/${country}/${lang}/verification`);

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} className={isPrivateArea ? 'min-h-screen text-slate-950' : 'min-h-screen pb-20 text-slate-950 md:pb-0'}>
      <I18nProvider lang={lang} translations={translations}>
        {!isPrivateArea && <Header country={country} lang={lang} countries={countries} languages={languages} translations={translations} />}
        {children}
        {!isPrivateArea && <SiteFooter country={country} lang={lang} />}
        {!isPrivateArea && <MobileNav country={country} lang={lang} />}
      </I18nProvider>
    </div>
  );
}
