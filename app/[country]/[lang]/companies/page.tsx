import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CompaniesPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  redirect(`/${country}/${lang}/opportunities`);
}
