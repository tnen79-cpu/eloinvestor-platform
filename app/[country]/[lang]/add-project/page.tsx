import { ProtectedAddProject } from '@/components/ProtectedAddProject';

export default async function AddProjectPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <ProtectedAddProject country={country} lang={lang} />
    </main>
  );
}
