'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, ShieldCheck } from 'lucide-react';

export default function AdminPasswordLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) throw new Error(json?.error || 'فشل دخول الإدارة');
      router.replace('/eloinvestor-admin');
      router.refresh();
    } catch (error: any) {
      setMessage(error?.message || 'فشل دخول الإدارة');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white" dir="rtl">
      <div className="mx-auto grid min-h-[calc(100vh-40px)] max-w-5xl place-items-center">
        <form onSubmit={submit} className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-6 text-slate-950 shadow-2xl">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-blue-700 text-white shadow-lg shadow-blue-900/20">
            <ShieldCheck size={30} />
          </div>
          <h1 className="mt-5 text-center text-3xl font-black">دخول الإدارة</h1>
          <p className="mt-2 text-center text-sm font-bold text-slate-500">مسار إدارة مستقل عن تسجيل دخول المستخدمين</p>
          <label className="mt-6 block text-sm font-black text-slate-700">كلمة مرور لوحة الإدارة</label>
          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <LockKeyhole size={18} className="text-slate-400" />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="ADMIN_PANEL_PASSWORD"
              className="w-full bg-transparent text-base font-bold outline-none"
              autoFocus
            />
          </div>
          {message ? <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">{message}</p> : null}
          <button disabled={loading || !password} className="mt-5 w-full rounded-2xl bg-blue-700 px-5 py-4 font-black text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-800 disabled:opacity-50">
            {loading ? 'جاري الدخول...' : 'دخول لوحة الإدارة'}
          </button>
          <p className="mt-4 text-center text-xs font-bold text-slate-400">الرابط الجديد: /eloinvestor-admin</p>
        </form>
      </div>
    </main>
  );
}
