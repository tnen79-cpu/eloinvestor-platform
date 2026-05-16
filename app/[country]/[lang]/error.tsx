'use client';

import { useEffect } from 'react';

export default function PlatformError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Platform route error:', error);
  }, [error]);

  return (
    <main className="container page">
      <section className="rounded-[2rem] border border-red-100 bg-white p-8 shadow-sm">
        <span className="pill">تعذر تحميل البيانات</span>
        <h1 className="mt-4 text-3xl font-black text-slate-900">صار خطأ داخل هذه الصفحة</h1>
        <p className="mt-3 max-w-2xl text-slate-600">غالبًا المشكلة من استعلام بيانات أو اتصال مؤقت بـ Supabase. اضغط إعادة المحاولة بدل ما تنهار الصفحة بالكامل.</p>
        <button type="button" onClick={reset} className="btn btn-gold mt-6">إعادة المحاولة</button>
      </section>
    </main>
  );
}
