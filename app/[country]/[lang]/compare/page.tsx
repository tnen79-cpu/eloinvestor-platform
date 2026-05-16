export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { CompareProjectsClient } from './CompareProjectsClient';

export default async function ComparePage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  return <CompareProjectsClient country={country} lang={lang} />;
}
