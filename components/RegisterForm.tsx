'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function RegisterForm({ country, lang }: { country: string; lang: string }) {
  const isAr = lang === 'ar';
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('investor');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function ensureProfile(userId: string) {
    try {
      await supabaseBrowser.from('users').upsert({
        auth_id: userId,
        name,
        email,
        account_type: accountType,
        role: 'user',
        plan: 'free',
        subscription_status: 'free',
      }, { onConflict: 'auth_id' });
    } catch (error) {
      console.warn('Profile upsert failed:', error);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const { data, error } = await supabaseBrowser.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/${country}/${lang}/dashboard`,
        data: { name, account_type: accountType, role: 'user' },
      },
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    if (data.user) await ensureProfile(data.user.id);
    setLoading(false);

    if (data.session) {
      router.push(`/${country}/${lang}/dashboard`);
      router.refresh();
      return;
    }

    setMessage(isAr ? 'تم إنشاء الحساب. افحص بريدك لتأكيد الحساب.' : 'Account created. Check your email to confirm it.');
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" placeholder={isAr ? 'الاسم الكامل' : 'Full name'} required />
      <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" placeholder={isAr ? 'البريد الإلكتروني' : 'Email'} type="email" required />
      <input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" placeholder={isAr ? 'كلمة المرور' : 'Password'} type="password" minLength={6} required />
      <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10">
        <option value="investor">{isAr ? 'مستثمر' : 'Investor'}</option>
        <option value="owner">{isAr ? 'صاحب مشروع' : 'Project owner'}</option>
        <option value="both">{isAr ? 'مستثمر وصاحب مشروع' : 'Investor and owner'}</option>
      </select>
      {!!message && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p>}
      <button disabled={loading} className="w-full rounded-2xl bg-emerald-700 px-6 py-4 font-black text-white shadow-lg shadow-emerald-900/10 disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? (isAr ? 'جاري إنشاء الحساب...' : 'Creating account...') : (isAr ? 'إنشاء حساب' : 'Create Account')}
      </button>
      <Link href={`/${country}/${lang}/login`} className="block text-center font-bold text-emerald-700">{isAr ? 'عندي حساب بالفعل' : 'I already have an account'}</Link>
    </form>
  );
}
