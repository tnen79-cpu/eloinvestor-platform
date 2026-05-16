'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function AuthCallbackClient({ country, lang }: { country: string; lang: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState(lang === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing in...');

  const next = useMemo(() => searchParams.get('next') || `/${country}/${lang}/dashboard`, [searchParams, country, lang]);
  const accountType = searchParams.get('account_type') || 'investor';
  const isAr = lang === 'ar';

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const code = searchParams.get('code');
        if (code) {
          const { error } = await supabaseBrowser.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data: userData, error: userError } = await supabaseBrowser.auth.getUser();
        if (userError) throw userError;

        const user = userData.user;
        if (user) {
          const meta = user.user_metadata || {};
          const email = user.email || '';
          const phone = user.phone || String(meta.phone || '');
          const displayName = String(meta.name || meta.full_name || meta.display_name || email || phone || 'مستخدم');

          try {
            await supabaseBrowser.from('users').upsert({
              auth_id: user.id,
              name: displayName,
              email,
              phone,
              account_type: String(meta.account_type || accountType || 'investor'),
              role: 'user',
              plan: 'free',
              subscription_status: 'free',
            }, { onConflict: 'auth_id' });
          } catch (profileError) {
            console.warn('OAuth profile upsert failed:', profileError);
          }
        }

        router.replace(next);
        router.refresh();
      } catch (error: any) {
        console.warn('Auth callback failed:', error);
        if (mounted) setMessage(error?.message || (isAr ? 'تعذر إكمال تسجيل الدخول.' : 'Could not complete login.'));
      }
    }

    run();
    return () => { mounted = false; };
  }, [accountType, isAr, next, router, searchParams]);

  return (
    <main className="fixed inset-0 grid place-items-center bg-slate-950 px-6 text-center text-white" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-md rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-5 h-12 w-12 animate-pulse rounded-full bg-blue-500" />
        <h1 className="text-2xl font-black">{isAr ? 'تسجيل الدخول' : 'Signing in'}</h1>
        <p className="mt-3 font-bold text-white/70">{message}</p>
        <Link href={`/${country}/${lang}/login`} className="mt-6 inline-flex rounded-full bg-white px-5 py-3 font-black text-slate-950">
          {isAr ? 'العودة للدخول' : 'Back to login'}
        </Link>
      </div>
    </main>
  );
}
