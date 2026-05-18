export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { CheckCircle2, Crown, Sparkles, Zap } from 'lucide-react';
import { PackageSubscribeButton } from '@/components/PackageSubscribeButton';
import { getCountryByCode } from '@/lib/server-data';
import { supabase } from '@/lib/supabase';

type PackageRow = {
  id: string;
  name_ar: string;
  name_en?: string;
  description_ar?: string;
  description_en?: string;
  price?: number;
  currency_code?: string;
  projects_limit?: number;
  duration_days?: number;
  features?: string[];
  target_account_type?: string;
  sort_order?: number;
  is_active?: boolean;
};

async function getPackages() {
  if ((process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('example.supabase.co')) return [];
  try {
    const { data, error } = await supabase
      .from('subscription_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data || []) as PackageRow[];
  } catch (error) {
    console.warn('Packages unavailable:', error);
    return [];
  }
}

export default async function PackagesPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const activeCountry = await getCountryByCode(country);
  const packages = await getPackages();
  const isAr = lang === 'ar';

  return (
    <main className="platform-page">
      <section className="platform-hero">
        <span className="platform-eyebrow"><Crown size={16} /> {isAr ? 'باقات المنصة' : 'Platform packages'}</span>
        <h1 className="platform-title">{isAr ? 'باقات مرنة لأصحاب المشاريع والمستثمرين' : 'Flexible plans for owners and investors'}</h1>
        <p className="platform-subtitle">
          {isAr
            ? 'تُقرأ هذه الصفحة مباشرة من الباقات المفعّلة في لوحة الإدارة. أضف أو عدّل أو عطّل أي باقة وسيظهر التحديث هنا.'
            : 'This page reads directly from active admin packages. Add, edit, or disable a plan and it updates here.'}
        </p>
        <div className="platform-hero-actions">
          <Link href={`/${activeCountry.code}/${lang}/dashboard`} className="platform-primary">{isAr ? 'إدارة اشتراكي' : 'Manage subscription'}</Link>
          <Link href={`/${activeCountry.code}/${lang}/add-project`} className="platform-secondary">{isAr ? 'أضف مشروعك' : 'List your project'}</Link>
        </div>
      </section>

      <section className="platform-section platform-grid-3">
        {packages.length ? packages.map((pkg, index) => {
          const name = isAr ? pkg.name_ar : (pkg.name_en || pkg.name_ar);
          const desc = isAr ? (pkg.description_ar || '') : (pkg.description_en || pkg.description_ar || '');
          const features = Array.isArray(pkg.features) ? pkg.features : [];
          const isFeatured = index === 1;
          return (
            <article key={pkg.id || name} className={`platform-card platform-card-pad ${isFeatured ? 'ring-4 ring-blue-50' : ''}`}>
              <div className={`grid h-14 w-14 place-items-center rounded-2xl ${isFeatured ? 'bg-[var(--brand-accent)] text-white' : 'bg-[var(--brand-accent-light)] text-[var(--brand-accent)]'}`}>
                {isFeatured ? <Sparkles /> : <Zap />}
              </div>
              <span className="platform-chip gold mt-5">{pkg.target_account_type || 'owner'}</span>
              <h2 className="mt-4 text-2xl font-black text-[var(--brand-ink)]">{name}</h2>
              <p className="mt-3 min-h-16 text-sm font-bold leading-7 text-[var(--brand-muted)]">{desc || (isAr ? 'باقة مفعّلة من لوحة الإدارة.' : 'Active plan from admin panel.')}</p>
              <div className="mt-5 flex items-end gap-2">
                <strong className="text-4xl font-black text-[var(--brand-accent)]">{Number(pkg.price || 0)}</strong>
                <span className="pb-2 text-sm font-black text-[var(--brand-muted)]">{pkg.currency_code || activeCountry.currency}</span>
              </div>
              <div className="mt-5 grid gap-2 text-sm font-bold text-[var(--brand-muted)]">
                <p>{isAr ? 'عدد المشاريع:' : 'Projects:'} <span className="font-black text-[var(--brand-ink)]">{pkg.projects_limit || 0}</span></p>
                <p>{isAr ? 'المدة:' : 'Duration:'} <span className="font-black text-[var(--brand-ink)]">{pkg.duration_days || 30} {isAr ? 'يوم' : 'days'}</span></p>
              </div>
              <div className="mt-5 space-y-2">
                {(features.length ? features : [isAr ? 'تفعيل من لوحة الإدارة' : 'Admin-managed activation', isAr ? 'دعم التوثيق والترويج' : 'Verification and promotion support']).map((feature) => (
                  <p key={feature} className="flex items-center gap-2 text-sm font-bold text-[var(--brand-ink-2)]"><CheckCircle2 className="h-4 w-4 text-[var(--brand-accent)]" /> {feature}</p>
                ))}
              </div>
              <PackageSubscribeButton planCode={(pkg as any).code || pkg.id || pkg.name_en || pkg.name_ar} fallbackCode={pkg.id || pkg.name_en || pkg.name_ar} country={activeCountry.code} lang={lang} featured={isFeatured} label={isAr ? 'اختيار الباقة والدفع' : 'Choose plan and pay'} />
            </article>
          );
        }) : (
          <div className="platform-card platform-card-pad md:col-span-3 text-center">
            <h2 className="text-2xl font-black text-[var(--brand-ink)]">{isAr ? 'لا توجد باقات مفعّلة' : 'No active packages'}</h2>
            <p className="mt-3 font-bold text-[var(--brand-muted)]">{isAr ? 'أضف الباقات من لوحة الإدارة حتى تظهر هنا.' : 'Add packages from admin panel to show them here.'}</p>
          </div>
        )}
      </section>
    </main>
  );
}
