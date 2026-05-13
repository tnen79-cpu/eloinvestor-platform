import Link from 'next/link';
import { getDictionary } from '@/lib/data';

export function MobileNav({ country, lang }: { country: string; lang: string }) {
  const t = getDictionary(lang);
  return (
    <nav className="bottom-nav">
      <Link href={`/${country}/${lang}`}><strong>⌂</strong><span>{t.home}</span></Link>
      <Link href={`/${country}/${lang}/opportunities`}><strong>▦</strong><span>{t.opportunities}</span></Link>
      <Link className="active" href={`/${country}/${lang}/add-project`}><strong>+</strong><span>{t.addProject}</span></Link>
      <Link href={`/${country}/${lang}/packages`}><strong>★</strong><span>{t.packages}</span></Link>
      <Link href={`/${country}/${lang}/dashboard`}><strong>👤</strong><span>{lang === 'ar' ? 'حسابي' : 'Account'}</span></Link>
    </nav>
  );
}
