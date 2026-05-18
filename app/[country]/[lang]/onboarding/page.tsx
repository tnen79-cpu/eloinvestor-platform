import { OnboardingForm } from '@/components/OnboardingForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OnboardingPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  return <OnboardingForm country={country} lang={lang} />;
}
