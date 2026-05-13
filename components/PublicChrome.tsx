'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { MobileNav } from '@/components/MobileNav';
import { NotificationCenter } from '@/components/NotificationCenter';
import { MobileActionDock } from '@/components/MobileActionDock';
import type { DbCountry } from '@/lib/server-data';

export function PublicChrome({ country, lang, countries, children }: { country: string; lang: string; countries: DbCountry[]; children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isPrivateArea = pathname.includes(`/${country}/${lang}/dashboard`) || pathname.includes(`/${country}/${lang}/messages`) || pathname.includes(`/${country}/${lang}/verification`);

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} className={isPrivateArea ? 'min-h-screen text-slate-950' : 'min-h-screen pb-20 text-slate-950 md:pb-0'}>
      {!isPrivateArea && <Header country={country} lang={lang} countries={countries} />}
      {children}
      <NotificationCenter country={country} lang={lang} compact />
      {!isPrivateArea && <MobileNav country={country} lang={lang} />}
      {!isPrivateArea && <MobileActionDock country={country} lang={lang} />}
    </div>
  );
}
