'use client';

import Link from 'next/link';
import { useI18n } from '@/components/I18nProvider';

export function SiteFooter({ country, lang }: { country: string; lang: string }) {
  const isAr = lang === 'ar';
  const base = `/${country}/${lang}`;
  const { t } = useI18n();
  return (
    <footer className="mh-footer" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="mh-footer-grid">
        <div className="mh-footer-brand">
          <Link href={base} className="mh-footer-logo"><span>إ</span><b>{t('common', 'brand')}</b></Link>
          <p>{t('footer', 'description')}</p>
        </div>
        <div>
          <h4>{t('footer', 'platform')}</h4>
          <Link href={`${base}/opportunities`}>{t('footer', 'opportunities')}</Link>
          <Link href={`${base}/add-project`}>{t('footer', 'add_project')}</Link>
          <Link href={`${base}/packages`}>{t('footer', 'packages')}</Link>
          <Link href={`${base}/suggested`}>{t('footer', 'suggested')}</Link>
        </div>
        <div>
          <h4>{t('footer', 'account')}</h4>
          <Link href={`${base}/login`}>{t('common', 'login')}</Link>
          <Link href={`${base}/register`}>{t('common', 'register')}</Link>
          <Link href={`${base}/dashboard`}>{t('common', 'dashboard')}</Link>
          <Link href={`${base}/messages`}>{t('footer', 'messages')}</Link>
        </div>
        <div>
          <h4>{t('footer', 'trust')}</h4>
          <Link href={`${base}/verification`}>{t('footer', 'verification')}</Link>
          <Link href={`${base}/packages`}>{t('footer', 'promote_projects')}</Link>
          <Link href={`${base}/privacy`}>{t('footer', 'privacy')}</Link>
          <Link href={`${base}/terms`}>{t('footer', 'terms')}</Link>
        </div>
      </div>
      <div className="mh-footer-bottom">
        <span>© 2026 {t('footer', 'rights')}</span>
        <div><a href="https://x.com" target="_blank" rel="noreferrer">X</a><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a><a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a><a href="https://wa.me/96800000000" target="_blank" rel="noreferrer">WhatsApp</a></div>
      </div>
    </footer>
  );
}
