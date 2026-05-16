'use client';

import { useEffect } from 'react';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Admin route error:', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-red-100 bg-white p-8 shadow-sm">
        <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-black text-red-700">Admin Error</span>
        <h1 className="mt-4 text-3xl font-black text-slate-900">تعذر تحميل لوحة الإدارة</h1>
        <p className="mt-3 text-slate-600">تم عزل الخطأ داخل لوحة الإدارة حتى لا ينهار الموقع بالكامل. جرّب مرة أخرى أو راجع صلاحيات Supabase.</p>
        <button type="button" onClick={reset} className="mt-6 rounded-full bg-slate-900 px-5 py-3 font-black text-white">إعادة المحاولة</button>
      </section>
    </main>
  );
}
