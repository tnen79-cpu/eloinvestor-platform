'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, LayoutDashboard, PlusCircle, ShieldCheck, UserRound, BadgeCheck, MessageCircle } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { accountTypeLabel, canAddProjects, isAdminRole } from '@/lib/account';
import { useI18n } from '@/components/I18nProvider';

type HeaderUser = {
  id: string;
  email?: string;
  name: string;
  role?: string;
  accountType?: string;
};

function getUserName(user: any) {
  const meta = user?.user_metadata || {};
  return meta.name || meta.full_name || meta.display_name || user?.email?.split('@')[0] || 'حسابي';
}

export function AuthHeaderActions({ country, lang, labels }: { country: string; lang: string; labels: { login: string; register: string } }) {
  const router = useRouter();
  const isAr = lang === 'ar';
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<HeaderUser | null>(null);

  const dashboardHref = useMemo(() => `/${country}/${lang}/dashboard`, [country, lang]);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      setLoading(true);
      const { data } = await supabaseBrowser.auth.getUser();
      const authUser = data?.user;

      if (!mounted) return;
      if (!authUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      let role = authUser.user_metadata?.role || 'user';
      let accountType = authUser.user_metadata?.account_type || 'investor';
      let name = getUserName(authUser);

      try {
        const { data: profile } = await supabaseBrowser
          .from('users')
          .select('name,role,account_type')
          .eq('auth_id', authUser.id)
          .maybeSingle();

        if (profile) {
          name = (profile as any).name || name;
          role = (profile as any).role || role;
          accountType = (profile as any).account_type || accountType;
        }
      } catch (error) {
        console.warn('User profile lookup failed:', error);
      }

      setUser({ id: authUser.id, email: authUser.email || '', name, role, accountType });
      setLoading(false);
    }

    loadUser();

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(() => {
      loadUser();
      router.refresh();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    function close() { setOpen(false); }
    if (open) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  async function logout() {
    await supabaseBrowser.auth.signOut();
    setUser(null);
    setOpen(false);
    router.push(`/${country}/${lang}`);
    router.refresh();
  }

  if (loading) {
    return <div className="hidden h-11 w-32 animate-pulse rounded-full bg-slate-100 sm:block" />;
  }

  if (!user) {
    return (
      <>
        <Link href={`/${country}/${lang}/login`} className="hidden rounded-full px-4 py-3 text-sm font-black text-blue-900 sm:block">{labels.login}</Link>
        <Link href={`/${country}/${lang}/register`} className="hidden rounded-full bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-900/10 sm:block">{labels.register}</Link>
      </>
    );
  }

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-700 text-white"><UserRound size={16} /></span>
        <span className="hidden max-w-28 truncate sm:inline">{user.name}</span>
      </button>

      {open && (
        <div className="auth-user-menu absolute end-0 top-full mt-3 w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 text-sm shadow-2xl">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="font-black text-slate-950">{user.name}</p>
            <p className="mt-1 truncate text-xs font-bold text-slate-500">{user.email}</p>
            <p className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-800">{accountTypeLabel(user.accountType, lang)}</p>
          </div>
          <Link href={dashboardHref} className="auth-user-menu-item flex items-center gap-3 rounded-2xl px-4 py-3 font-bold text-slate-700 hover:bg-blue-50">
            <LayoutDashboard size={17} /> {t('common', 'dashboard', isAr ? 'لوحة التحكم' : 'Dashboard')}
          </Link>
          <Link href={`/${country}/${lang}/profile/${encodeURIComponent(user.id)}`} className="auth-user-menu-item flex items-center gap-3 rounded-2xl px-4 py-3 font-bold text-slate-700 hover:bg-blue-50">
            <UserRound size={17} /> {t('auth', 'public_profile', isAr ? 'صفحتي العامة' : 'Public profile')}
          </Link>
          {canAddProjects(user.accountType, user.role) && (
            <Link href={`/${country}/${lang}/add-project`} className="auth-user-menu-item flex items-center gap-3 rounded-2xl px-4 py-3 font-bold text-slate-700 hover:bg-blue-50">
              <PlusCircle size={17} /> {t('common', 'add_project', isAr ? 'إضافة مشروع' : 'Add Project')}
            </Link>
          )}
          <Link href={`/${country}/${lang}/verification`} className="auth-user-menu-item flex items-center gap-3 rounded-2xl px-4 py-3 font-bold text-slate-700 hover:bg-blue-50">
            <BadgeCheck size={17} /> {t('auth', 'verification', isAr ? 'التوثيق' : 'Verification')}
          </Link>
          <Link href={`/${country}/${lang}/messages`} className="auth-user-menu-item flex items-center gap-3 rounded-2xl px-4 py-3 font-bold text-slate-700 hover:bg-blue-50">
            <MessageCircle size={17} /> {t('auth', 'messages', isAr ? 'المحادثات' : 'Messages')}
          </Link>
          {isAdminRole(user.role) && (
            <Link href="/admin" className="auth-user-menu-item flex items-center gap-3 rounded-2xl px-4 py-3 font-bold text-slate-700 hover:bg-blue-50">
              <ShieldCheck size={17} /> {t('auth', 'admin', isAr ? 'لوحة الإدارة' : 'Admin')}
            </Link>
          )}
          <button onClick={logout} className="auth-user-menu-item danger flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-start font-bold text-red-600 hover:bg-red-50">
            <LogOut size={17} /> {t('auth', 'logout', isAr ? 'تسجيل الخروج' : 'Logout')}
          </button>
        </div>
      )}
    </div>
  );
}
