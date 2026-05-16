export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { redirect } from 'next/navigation';

export default async function ProjectAliasPage({ params }: { params: Promise<{ country: string; lang: string; slug: string }> }) {
  const { country, lang, slug } = await params;
  redirect(`/${country}/${lang}/project/${encodeURIComponent(slug)}`);
}
