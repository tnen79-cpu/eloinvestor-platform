'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentAppUser } from '@/lib/auth-client';

export default function MyProfileRedirect({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const router = useRouter();
  useEffect(() => {
    let mounted = true;
    params.then(async ({ country, lang }) => {
      const user = await getCurrentAppUser();
      const uid = user?.id;
      if (!mounted) return;
      if (uid) router.replace(`/${country}/${lang}/profile/${encodeURIComponent(uid)}`);
      else router.replace(`/${country}/${lang}/login`);
    });
    return () => { mounted = false; };
  }, [params, router]);

  return <main className="profile-page"><div className="profile-empty">جاري فتح صفحتك العامة... <Link href="/om/ar/login">تسجيل الدخول</Link></div></main>;
}
