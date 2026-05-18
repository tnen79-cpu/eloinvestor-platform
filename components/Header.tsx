'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Video, X } from 'lucide-react';
import { getDictionary } from '@/lib/data';
import type { DbCountry, DbLanguage, UiTranslations } from '@/lib/server-data';
import { AuthHeaderActions } from '@/components/AuthHeaderActions';
import { NotificationCenter } from '@/components/NotificationCenter';

export function Header({ country, lang, countries, languages = [], translations = {} }: { country: string; lang: string; countries: DbCountry[]; languages?: DbLanguage[]; translations?: UiTranslations }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const c = countries.find((item) => item.code === country) || countries.find((item) => item.isDefault) || countries[0];
  const t = getDictionary(lang);
  const tr = (namespace: string, key: string, fallback: string) => translations?.[namespace]?.[key] || fallback;
  const isAr = lang === 'ar';
  const activeLanguages = languages.length ? languages : [
    { code: 'ar', nameAr: 'العربية', nameEn: 'Arabic', direction: 'rtl', isActive: true, isDefault: true, sortOrder: 1 },
    { code: 'en', nameAr: 'الإنجليزية', nameEn: 'English', direction: 'ltr', isActive: true, isDefault: false, sortOrder: 2 },
  ];
  const oppositeLang = activeLanguages.find((item) => item.code !== lang)?.code || (isAr ? 'en' : 'ar');
  const pathname = usePathname() || `/${c.code}/${lang}`;

  function localizedHref(nextCountry = c.code, nextLang = lang) {
    const parts = pathname.split('/').filter(Boolean);
    const rest = parts.length >= 2 ? parts.slice(2) : [];
    return `/${nextCountry}/${nextLang}${rest.length ? `/${rest.join('/')}` : ''}`;
  }

  return (
    <header className="mh-header" dir={isAr ? 'rtl' : 'ltr'}>
      <Link href={`/${c.code}/${lang}`} className="mh-logo">
        <span>إ</span>
        <b>{isAr ? 'إلو مستثمر' : 'Alo Investor'}</b>
      </Link>


      <button type="button" className="mh-mobile-menu-btn" onClick={() => setMobileOpen(true)} aria-label={isAr ? 'فتح القائمة' : 'Open menu'}>
        <Menu size={22} />
      </button>

      <div className="mh-header-actions">
        <NotificationCenter country={c.code} lang={lang} compact />
        <div className="mh-country-menu">
          <button type="button">{c.flag} <span>{c.currency}</span></button>
          <div>
            {countries.map((item) => (
              <Link key={item.code} href={localizedHref(item.code, lang)}>
                <span>{isAr ? item.nameAr : item.nameEn}</span><b>{item.flag} {item.currency}</b>
              </Link>
            ))}
          </div>
        </div>
        <div className="mh-country-menu">
          <button type="button" className="mh-lang">{lang}</button>
          <div>
            {activeLanguages.map((item) => (
              <Link key={item.code} href={localizedHref(c.code, item.code)}>
                <span>{isAr ? item.nameAr : item.nameEn}</span><b>{item.code.toUpperCase()}</b>
              </Link>
            ))}
          </div>
        </div>
        <Link href={`/${c.code}/${lang}/reels`} className="mh-reels-btn" title={isAr ? 'ريلز المشاريع' : 'Project reels'}><Video size={15} /><span>{isAr ? 'ريلز' : 'Reels'}</span></Link>
        <AuthHeaderActions country={c.code} lang={lang} labels={{ login: tr('common', 'login', t.login), register: tr('common', 'register', t.register) }} />
        <Link href={`/${c.code}/${lang}/add-project`} className="mh-add-btn">{`+ ${tr('common', 'add_listing', isAr ? 'أضف إعلانك' : 'Add listing')}`}</Link>
      </div>


      {mobileOpen ? (
        <div className="mh-mobile-drawer-layer" role="dialog" aria-modal="true">
          <button type="button" className="mh-mobile-drawer-backdrop" aria-label={isAr ? 'إغلاق القائمة' : 'Close menu'} onClick={() => setMobileOpen(false)} />
          <aside className="mh-mobile-drawer">
            <div className="mh-mobile-drawer-head">
              <Link href={`/${c.code}/${lang}`} className="mh-logo" onClick={() => setMobileOpen(false)}>
                <span>إ</span>
                <b>{isAr ? 'إلو مستثمر' : 'Alo Investor'}</b>
              </Link>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label={isAr ? 'إغلاق' : 'Close'}><X size={20} /></button>
            </div>
            <nav className="mh-mobile-drawer-nav">
              <Link href={`/${c.code}/${lang}`} onClick={() => setMobileOpen(false)}>{tr('common', 'home', isAr ? 'الرئيسية' : 'Home')}</Link>
              <Link href={`/${c.code}/${lang}/opportunities`} onClick={() => setMobileOpen(false)}>{tr('common', 'opportunities', isAr ? 'الفرص' : 'Opportunities')}</Link>
              <Link href={`/${c.code}/${lang}/reels`} onClick={() => setMobileOpen(false)}>{isAr ? 'ريلز المشاريع' : 'Project reels'}</Link>
              <Link href={`/${c.code}/${lang}/packages`} onClick={() => setMobileOpen(false)}>{tr('common', 'packages', isAr ? 'الباقات' : 'Packages')}</Link>
              <Link href={`/${c.code}/${lang}/dashboard`} onClick={() => setMobileOpen(false)}>{isAr ? 'لوحة التحكم' : 'Dashboard'}</Link>
              <Link href={`/${c.code}/${lang}/dashboard?tab=notifications`} onClick={() => setMobileOpen(false)}>{isAr ? 'الإشعارات' : 'Notifications'}</Link>
              <Link href={`/${c.code}/${lang}/add-project`} className="primary" onClick={() => setMobileOpen(false)}>{`+ ${tr('common', 'add_listing', isAr ? 'أضف مشروعك' : 'Add project')}`}</Link>
            </nav>
            <div className="mh-mobile-drawer-tools">
              <Link href={localizedHref(c.code, oppositeLang)} onClick={() => setMobileOpen(false)}>{oppositeLang.toUpperCase()}</Link>
              {countries.slice(0, 4).map((item) => (
                <Link key={item.code} href={localizedHref(item.code, lang)} onClick={() => setMobileOpen(false)}>{item.flag} {item.currency}</Link>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </header>
  );
}
