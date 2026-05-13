import { VerificationCenter } from '@/components/VerificationCenter';

export default async function VerificationPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <VerificationCenter country={country} lang={lang} />
    </main>
  );
}
