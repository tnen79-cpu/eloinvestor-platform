'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Global app error:', error);
  }, [error]);

  return (
    <main className="container page">
      <section className="rounded-[2rem] border border-red-100 bg-white p-8 shadow-sm">
        <span className="pill">خطأ غير متوقع</span>
        <h1 className="mt-4 text-3xl font-black text-slate-900">تعذر تحميل الصفحة</h1>
        <p className="mt-3 max-w-2xl text-slate-600">حدث خطأ مؤقت أثناء جلب البيانات أو عرض الصفحة. جرّب إعادة التحميل، وإذا تكرر الخطأ راجع سجلات النظام.</p>
        <button type="button" onClick={reset} className="btn btn-gold mt-6">إعادة المحاولة</button>
      </section>
    </main>
  );
}
