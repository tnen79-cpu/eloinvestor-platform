export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { UserDashboardGate } from '@/components/UserDashboardGate';

export default async function DashboardPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  return <UserDashboardGate country={country} lang={lang} />;
}
