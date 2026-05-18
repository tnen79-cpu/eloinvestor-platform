'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, UserRound } from 'lucide-react';
import { getFirebaseIdToken } from '@/lib/firebase-client';
import { getCurrentAppUser } from '@/lib/auth-client';
import { useI18n } from '@/components/I18nProvider';

const ACCOUNT_TYPES = [
  { value: 'investor', ar: 'مستثمر', en: 'Investor' },
  { value: 'owner', ar: 'صاحب مشروع', en: 'Project owner' },
  { value: 'both', ar: 'مستثمر وصاحب مشروع', en: 'Investor and project owner' },
];

export function CompleteProfileForm({ country, lang }: { country: string; lang: string }) {
  const isAr = lang === 'ar';
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => searchParams.get('next') || `/${country}/${lang}/dashboard`, [searchParams, country, lang]);
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<'investor' | 'owner' | 'both'>('investor');
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      const user = await getCurrentAppUser(1800);
      if (!mounted) return;
      if (!user) {
        router.replace(`/${country}/${lang}/login?next=${encodeURIComponent(next)}`);
        return;
      }
      const meta = user.user_metadata || {};
      const suggestedName = String(meta.full_name || meta.display_name || meta.name || '').trim();
      if (suggestedName && !/^\+?\d+$/.test(suggestedName) && suggestedName !== 'User') setName(suggestedName);
      setIdentifier(user.email || user.phone || String(meta.phone || user.id || ''));
    }
    load();
    return () => { mounted = false; };
  }, [country, lang, next, router]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setMessage(isAr ? 'اكتب اسمك الحقيقي للمتابعة.' : 'Enter your name to continue.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const token = await getFirebaseIdToken();
      if (!token) throw new Error(isAr ? 'انتهت الجلسة، سجّل الدخول مرة أخرى.' : 'Session expired, please sign in again.');

      const response = await fetch('/api/auth/firebase-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: cleanName,
          account_type: accountType,
          complete_onboarding: true,
          onboarding_completed: true,
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok || json?.ok === false) throw new Error(json?.error || (isAr ? 'تعذر حفظ البيانات.' : 'Could not save profile.'));

      router.replace(next);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (isAr ? 'حدث خطأ أثناء الحفظ.' : 'Something went wrong.'));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      {identifier ? (
        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-center text-sm font-bold text-blue-800" dir="ltr">
          {identifier}
        </div>
      ) : null}

      <div>
        <label className="mb-2 block text-sm font-black text-slate-800">{t('auth', 'full_name', isAr ? 'الاسم الكامل' : 'Full name')}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
          placeholder={isAr ? 'اكتب اسمك كما سيظهر للمستخدمين' : 'Enter the name users will see'}
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-black text-slate-800">{isAr ? 'نوع الحساب' : 'Account type'}</label>
        <div className="grid gap-3 sm:grid-cols-3">
          {ACCOUNT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setAccountType(type.value as 'investor' | 'owner' | 'both')}
              className={`rounded-2xl border px-4 py-4 text-center font-black transition ${accountType === type.value ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-900/10' : 'border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50'}`}
            >
              {accountType === type.value ? <CheckCircle2 className="mx-auto mb-2" size={20} /> : <UserRound className="mx-auto mb-2 text-blue-600" size={20} />}
              {isAr ? type.ar : type.en}
            </button>
          ))}
        </div>
      </div>

      {!!message && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{message}</p>}

      <button disabled={loading || name.trim().length < 2} className="w-full rounded-2xl bg-blue-700 px-6 py-4 font-black text-white shadow-lg shadow-blue-900/10 disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ ومتابعة' : 'Save and continue')}
      </button>
    </form>
  );
}
