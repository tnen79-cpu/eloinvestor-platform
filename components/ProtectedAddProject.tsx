'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { getCurrentAppUser, firebaseCompatibleUserQuery } from '@/lib/auth-client';
import { AddProjectForm } from '@/components/AddProjectForm';
import { canAddProjects } from '@/lib/account';
import { useI18n } from '@/components/I18nProvider';

export function ProtectedAddProject({ country, lang }: { country: string; lang: string }) {
  const isAr = lang === 'ar';
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const authUser = await getCurrentAppUser(1500);
      if (!mounted) return;
      setIsLoggedIn(Boolean(authUser));

      if (authUser) {
        let accountType = authUser.user_metadata?.account_type || 'investor';
        let role = authUser.user_metadata?.role || 'user';
        try {
          const { data: profile } = await supabaseBrowser
            .from('users')
            .select('role,account_type')
            .or(firebaseCompatibleUserQuery(authUser))
            .maybeSingle();
          accountType = (profile as any)?.account_type || accountType;
          role = (profile as any)?.role || role;
        } catch (error) {
          console.warn('Add-project role lookup failed:', error);
        }
        setAllowed(canAddProjects(accountType, role));
      } else {
        setAllowed(false);
      }
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <div className="h-96 animate-pulse rounded-[3rem] bg-white shadow-sm" />;
  }

  if (!isLoggedIn) {
    return (
      <div className="rounded-[3rem] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-blue-50 text-3xl">🔐</div>
        <h1 className="mt-5 text-3xl font-black text-slate-950">{t('auth', 'login_required_title', isAr ? 'سجّل الدخول لإضافة مشروعك' : 'Login to add your project')}</h1>
        <p className="mx-auto mt-3 max-w-xl leading-8 text-slate-600">{t('auth', 'login_required_desc', isAr ? 'إضافة المشاريع متاحة للحسابات المسجلة فقط حتى نحافظ على جودة الفرص والثقة داخل المنصة.' : 'Project publishing is available to registered accounts only to keep opportunities trusted and high quality.')}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href={`/${country}/${lang}/login`} className="rounded-2xl bg-blue-700 px-7 py-4 font-black text-white">{t('common', 'login', isAr ? 'تسجيل الدخول' : 'Login')}</Link>
          <Link href={`/${country}/${lang}/register`} className="rounded-2xl border border-slate-200 bg-white px-7 py-4 font-black text-blue-800">{t('common', 'register', isAr ? 'إنشاء حساب' : 'Create account')}</Link>
        </div>
      </div>
    );
  }


  if (isLoggedIn && !allowed) {
    return (
      <div className="rounded-[3rem] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-amber-50 text-3xl">👤</div>
        <h1 className="mt-5 text-3xl font-black text-slate-950">{t('auth', 'owner_only_title', isAr ? 'هذا الخيار مخصص لصاحب المشروع' : 'This option is for project owners')}</h1>
        <p className="mx-auto mt-3 max-w-xl leading-8 text-slate-600">{t('auth', 'owner_only_desc', isAr ? 'حساب المستثمر يستطيع تصفح الفرص والتواصل معها. لإضافة مشروع استخدم حساب صاحب مشروع أو حساب الاثنين معًا.' : 'Investor accounts can browse and contact opportunities. To add a project, use a project owner or combined account.')}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href={`/${country}/${lang}/opportunities`} className="rounded-2xl bg-blue-700 px-7 py-4 font-black text-white">{t('common', 'opportunities', isAr ? 'تصفح الفرص' : 'Browse opportunities')}</Link>
          <Link href={`/${country}/${lang}/dashboard`} className="rounded-2xl border border-slate-200 bg-white px-7 py-4 font-black text-blue-800">{t('common', 'dashboard', isAr ? 'لوحة التحكم' : 'Dashboard')}</Link>
        </div>
      </div>
    );
  }

  return <AddProjectForm country={country} lang={lang} />;
}
