import { UserDashboardGate } from '@/components/UserDashboardGate';
import { PublicAdBanners } from '@/components/PublicAdBanners';
import { getCountryByCode, getPlatformAds } from '@/lib/server-data';

export default async function DashboardPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const activeCountry = await getCountryByCode(country);
  const ads = await getPlatformAds(activeCountry.code);
  return (
    <div className="min-h-screen bg-[#f3f8f5]">
      <PublicAdBanners ads={ads} placements={['dashboard_top', 'all_top']} />
      <UserDashboardGate country={country} lang={lang} />
      <PublicAdBanners ads={ads} placements={['dashboard_bottom', 'all_bottom']} variant="light" />
    </div>
  );
}
