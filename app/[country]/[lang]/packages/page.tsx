export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { CheckCircle2, Crown, Sparkles, Zap } from 'lucide-react';
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
};

const fallbackPackages: PackageRow[] = [
  { id: 'starter', name_ar: 'باقة البداية', name_en: 'Starter', description_ar: 'نشر مشروع واحد مع مراجعة أساسية.', description_en: 'List one project with basic review.', price: 10, currency_code: 'OMR', projects_limit: 1, duration_days: 30, target_account_type: 'owner', features: ['نشر مشروع واحد', 'ظهور في صفحة الفرص', 'تواصل محمي'] },
  { id: 'growth', name_ar: 'باقة النمو', name_en: 'Growth', description_ar: 'مشروعين مع ظهور أفضل وإحصائيات.', description_en: 'Two projects with stronger visibility and stats.', price: 18, currency_code: 'OMR', projects_limit: 2, duration_days: 45, target_account_type: 'owner', features: ['نشر مشروعين', 'أولوية في الظهور', 'إحصائيات المشاهدات والتواصل'] },
  { id: 'premium-investor', name_ar: 'مستثمر بريميوم', name_en: 'Premium Investor', description_ar: 'ترشيحات أذكى وفرص محفوظة ومتابعة أسرع.', description_en: 'Smarter matching, saved opportunities, and faster tracking.', price: 8, currency_code: 'OMR', projects_limit: 0, duration_days: 30, target_account_type: 'investor', features: ['ترشيحات حسب الميزانية', 'محفوظات المستثمر', 'متابعة التواصلات'] },
];

async function getPackages() {
  if ((process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('example.supabase.co')) return [];
  try {
    const { data, error } = await supabase
      .from('subscription_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    if (data?.length) return data as PackageRow[];
  } catch (error) {
    console.warn('Packages unavailable:', error);
  }
  return [];
}

export default async function PackagesPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const activeCountry = await getCountryByCode(country);
  const packages = await getPackages();
  const isAr = lang === 'ar';

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[3rem] bg-slate-950 p-7 text-white shadow-2xl shadow-emerald-950/10 md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,.35),transparent_30%),radial-gradient(circle_at_90%_20%,rgba(245,158,11,.22),transparent_25%)]" />
        <div className="relative max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black text-emerald-100 ring-1 ring-white/10"><Crown size={16} /> {isAr ? 'الباقات' : 'Packages'}</p>
          <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">{isAr ? 'اختر الباقة المناسبة لحسابك' : 'Choose the right plan for your account'}</h1>
          <p className="mt-4 max-w-2xl text-lg font-bold leading-8 text-slate-300">{isAr ? 'باقات لصاحب المشروع لنشر الفرص، وباقات للمستثمر للترشيحات والمتابعة.' : 'Owner plans for publishing opportunities, and investor plans for smarter matching and tracking.'}</p>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        {packages.length ? packages.map((pkg, index) => {
          const name = isAr ? pkg.name_ar : (pkg.name_en || pkg.name_ar);
          const desc = isAr ? (pkg.description_ar || '') : (pkg.description_en || pkg.description_ar || '');
          const features = Array.isArray(pkg.features) ? pkg.features : [];
          const isFeatured = index === 1;
          return (
            <article key={pkg.id || name} className={`rounded-[2.5rem] border bg-white p-6 shadow-sm ${isFeatured ? 'border-emerald-200 ring-4 ring-emerald-50' : 'border-slate-200'}`}>
              <div className={`grid h-14 w-14 place-items-center rounded-2xl ${isFeatured ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {isFeatured ? <Sparkles /> : <Zap />}
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-950">{name}</h2>
              <p className="mt-3 min-h-16 text-sm font-bold leading-7 text-slate-600">{desc}</p>
              <div className="mt-5 flex items-end gap-2">
                <strong className="text-4xl font-black text-emerald-800">{Number(pkg.price || 0)}</strong>
                <span className="pb-2 text-sm font-black text-slate-500">{pkg.currency_code || activeCountry.currency}</span>
              </div>
              <div className="mt-5 grid gap-2 text-sm font-bold text-slate-600">
                <p>{isAr ? 'عدد المشاريع:' : 'Projects:'} <span className="font-black text-slate-950">{pkg.projects_limit || 0}</span></p>
                <p>{isAr ? 'المدة:' : 'Duration:'} <span className="font-black text-slate-950">{pkg.duration_days || 30} {isAr ? 'يوم' : 'days'}</span></p>
                <p>{isAr ? 'نوع الحساب:' : 'Account:'} <span className="font-black text-slate-950">{pkg.target_account_type || 'owner'}</span></p>
              </div>
              <div className="mt-5 space-y-2">
                {(features.length ? features : [isAr ? 'تفعيل سريع' : 'Fast activation', isAr ? 'دعم التوثيق' : 'Verification support']).map((feature) => (
                  <p key={feature} className="flex items-center gap-2 text-sm font-bold text-slate-700"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {feature}</p>
                ))}
              </div>
              <Link href={`/${activeCountry.code}/${lang}/dashboard`} className={`mt-6 flex w-full items-center justify-center rounded-2xl px-5 py-4 font-black ${isFeatured ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-900'}`}>
                {isAr ? 'اختيار الباقة' : 'Choose plan'}
              </Link>
            </article>
          );
        }) : <div className="md:col-span-3 rounded-[2.5rem] border border-slate-200 bg-white p-8 text-center font-black text-slate-600">{isAr ? 'لا توجد باقات مفعلة حاليًا. أضف الباقات من لوحة الإدارة.' : 'No active packages. Add packages from admin panel.'}</div>}
      </section>
    </main>
  );
}
