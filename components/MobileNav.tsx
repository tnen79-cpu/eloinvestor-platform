'use client';

import Link from 'next/link';
import { Home, Search, Plus, Play, UserRound } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/components/I18nProvider';

export function MobileNav({ country, lang }: { country: string; lang: string }) {
  const { t } = useI18n();
  const pathname = usePathname() || '';
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav className="bottom-nav" aria-label={lang === 'ar' ? 'تنقل سريع' : 'Quick navigation'}>
      <Link className={active(`/${country}/${lang}`) && pathname.split('/').filter(Boolean).length <= 2 ? 'active' : ''} href={`/${country}/${lang}`}><strong><Home size={20} /></strong><span>{t('common', 'home')}</span></Link>
      <Link className={active(`/${country}/${lang}/opportunities`) ? 'active' : ''} href={`/${country}/${lang}/opportunities`}><strong><Search size={20} /></strong><span>{t('common', 'opportunities')}</span></Link>
      <Link className={`dock-add ${active(`/${country}/${lang}/add-project`) ? 'active' : ''}`} href={`/${country}/${lang}/add-project`}><strong><Plus size={26} /></strong><span>{t('common', 'add_project')}</span></Link>
      <Link className={active(`/${country}/${lang}/reels`) ? 'active' : ''} href={`/${country}/${lang}/reels`}><strong><Play size={20} /></strong><span>{lang === 'ar' ? 'ريلز' : 'Reels'}</span></Link>
      <Link className={active(`/${country}/${lang}/dashboard`) ? 'active' : ''} href={`/${country}/${lang}/dashboard`}><strong><UserRound size={20} /></strong><span>{t('common', 'account')}</span></Link>
    </nav>
  );
}
