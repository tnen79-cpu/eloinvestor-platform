import { Suspense } from 'react';
import { AuthCallbackClient } from '@/components/AuthCallbackClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = Promise<{ country: string; lang: string }>;

export default async function AuthCallbackPage({ params }: { params: Params }) {
  const { country, lang } = await params;
  return (
    <Suspense fallback={<main className="fixed inset-0 grid place-items-center bg-slate-950 text-white">Loading...</main>}>
      <AuthCallbackClient country={country} lang={lang} />
    </Suspense>
  );
}
