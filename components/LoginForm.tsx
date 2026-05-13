'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function LoginForm({ country, lang }: { country: string; lang: string }) {
  const isAr = lang === 'ar';
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push(`/${country}/${lang}/dashboard`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" placeholder={isAr ? 'البريد الإلكتروني' : 'Email'} type="email" required />
      <input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" placeholder={isAr ? 'كلمة المرور' : 'Password'} type="password" required />
      {!!message && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{message}</p>}
      <button disabled={loading} className="w-full rounded-2xl bg-emerald-700 px-6 py-4 font-black text-white shadow-lg shadow-emerald-900/10 disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? (isAr ? 'جاري الدخول...' : 'Signing in...') : (isAr ? 'دخول' : 'Login')}
      </button>
      <Link href={`/${country}/${lang}/register`} className="block text-center font-bold text-emerald-700">{isAr ? 'إنشاء حساب جديد' : 'Create new account'}</Link>
    </form>
  );
}
