'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserRound, BriefcaseBusiness, WalletCards } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type AccountType = 'investor' | 'owner' | 'both';

export function OnboardingForm({ country, lang }: { country: string; lang: string }) {
  const isAr = lang !== 'en';
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => searchParams.get('next') || `/${country}/${lang}/dashboard`, [searchParams, country, lang]);
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('investor');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    async function init() {
      const { data: userData } = await supabaseBrowser.auth.getUser();
      const user = userData.user;
      if (!user) {
        router.replace(`/${country}/${lang}/login`);
        return;
      }
      const meta = user.user_metadata || {};
      const suggestedName = String(meta.name || meta.full_name || meta.display_name || '').trim();
      const { data: profile } = await supabaseBrowser.from('users').select('name,account_type').eq('auth_id', user.id).maybeSingle();
      if (!mounted) return;
      const currentName = String((profile as any)?.name || suggestedName || '').trim();
      const currentType = String((profile as any)?.account_type || '').trim() as AccountType;
      if (currentName && currentName !== user.email && currentName !== user.phone) setName(currentName);
      if (['investor', 'owner', 'both'].includes(currentType)) setAccountType(currentType);
      setLoading(false);
    }
    init();
    return () => { mounted = false; };
  }, [country, lang, router]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setMessage(isAr ? 'اكتب اسم مستخدم واضح.' : 'Please enter a valid user name.');
      return;
    }
    setSaving(true);
    const { data: userData } = await supabaseBrowser.auth.getUser();
    const user = userData.user;
    if (!user) {
      router.replace(`/${country}/${lang}/login`);
      return;
    }
    const { error } = await supabaseBrowser.from('users').upsert({
      auth_id: user.id,
      name: cleanName,
      email: user.email || '',
      phone: user.phone || '',
      account_type: accountType,
      role: 'user',
      plan: 'free',
      subscription_status: 'free',
    }, { onConflict: 'auth_id' });
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-slate-50 p-6" dir={isAr ? 'rtl' : 'ltr'}><div className="font-black text-slate-700">{isAr ? 'جاري التحميل...' : 'Loading...'}</div></main>;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-b from-white to-slate-50 p-5" dir={isAr ? 'rtl' : 'ltr'}>
      <form onSubmit={saveProfile} className="w-full max-w-xl rounded-[2rem] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><UserRound size={24} /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-950">{isAr ? 'أكمل بيانات حسابك' : 'Complete your account'}</h1>
            <p className="mt-1 text-sm font-bold text-slate-500">{isAr ? 'اختر اسم المستخدم ونوع الحساب للمتابعة.' : 'Choose your user name and account type to continue.'}</p>
          </div>
        </div>
        <label className="mt-6 block text-sm font-black text-slate-700">{isAr ? 'اسم المستخدم' : 'User name'}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" placeholder={isAr ? 'مثال: محمد الشامي' : 'Example: Mohammed Alshami'} required />
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            { id: 'investor', ar: 'مستثمر', en: 'Investor', icon: WalletCards },
            { id: 'owner', ar: 'صاحب مشروع', en: 'Project owner', icon: BriefcaseBusiness },
            { id: 'both', ar: 'الاثنين', en: 'Both', icon: UserRound },
          ].map((item) => {
            const Icon = item.icon;
            const selected = accountType === item.id;
            return <button key={item.id} type="button" onClick={() => setAccountType(item.id as AccountType)} className={`rounded-2xl border p-4 text-start transition ${selected ? 'border-blue-600 bg-blue-50 text-blue-800 ring-4 ring-blue-600/10' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'}`}><Icon size={22} /><b className="mt-3 block">{isAr ? item.ar : item.en}</b></button>;
          })}
        </div>
        {message && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{message}</p>}
        <button disabled={saving} className="mt-6 w-full rounded-2xl bg-blue-700 px-6 py-4 font-black text-white shadow-lg shadow-blue-900/10 disabled:opacity-60">{saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ ومتابعة' : 'Save and continue')}</button>
      </form>
    </main>
  );
}
