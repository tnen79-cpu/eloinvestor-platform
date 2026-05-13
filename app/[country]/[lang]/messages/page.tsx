import { Suspense } from 'react';
import { MessagesCenter } from '@/components/MessagesCenter';

export default async function MessagesPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="rounded-[2rem] bg-white p-8 font-black text-slate-700">Loading messages...</div>}>
        <MessagesCenter country={country} lang={lang} />
      </Suspense>
    </main>
  );
}
