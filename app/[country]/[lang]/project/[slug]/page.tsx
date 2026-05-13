export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BarChart3, CalendarDays, CheckCircle2, Eye, MapPin, MessageCircle, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import { ProjectGallery } from '@/components/ProjectGallery';
import { PublicAdBanners } from '@/components/PublicAdBanners';
import { ContactActions } from '@/components/ContactActions';
import { SaveProjectButton } from '@/components/SaveProjectButton';
import { ReportButton } from '@/components/ReportButton';
import { RatingButton } from '@/components/RatingButton';
import { ProjectViewTracker } from '@/components/ProjectViewTracker';
import { getCategoryLabel, getDictionary } from '@/lib/data';
import { formatDate, formatMoneyForCountry, getCountryByCode, getProjectBySlug, getPlatformAds } from '@/lib/server-data';

export default async function ProjectDetailsPage({ params, searchParams }: { params: Promise<{ country: string; lang: string; slug: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { country, lang, slug } = await params;
  const query = searchParams ? await searchParams : {};
  const adminPreview = query?.adminPreview === '1';
  const t = getDictionary(lang);
  const p = await getProjectBySlug(slug, adminPreview);
  if (!p) notFound();
  const activeCountry = await getCountryByCode(p.country || country);
  const ads = await getPlatformAds(activeCountry.code);
  const isAr = lang === 'ar';
  const title = isAr ? p.titleAr : p.titleEn;
  const summary = isAr ? p.summaryAr : p.summaryEn;
  const city = isAr ? p.cityAr : p.cityEn;
  const governorate = isAr ? p.governorateAr : p.governorateEn;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <ProjectViewTracker projectId={p.id} />
      <PublicAdBanners ads={ads} placements={['project_details_top', 'all_top']} />
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
        <Link href={`/${activeCountry.code}/${lang}`} className="hover:text-emerald-700">{t.home}</Link>
        <span>/</span>
        <Link href={`/${activeCountry.code}/${lang}/opportunities`} className="hover:text-emerald-700">{t.opportunities}</Link>
        <span>/</span>
        <span className="text-slate-900">{title}</span>
      </div>

      <section className="grid gap-8 lg:grid-cols-[1fr_390px]">
        <div className="space-y-8">
          <ProjectGallery images={p.gallery} title={title} />

          <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-wrap gap-3">
              <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">{getCategoryLabel(p.category, lang)}</span>
              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">{activeCountry.flag} {isAr ? activeCountry.nameAr : activeCountry.nameEn}</span>
              {p.verified && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-black text-white"><ShieldCheck size={16} /> {t.verified}</span>}
            </div>
            <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">{title}</h1>
            <p className="mt-5 text-lg leading-9 text-slate-600 whitespace-pre-line">{summary}</p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <Metric icon={Wallet} label={t.price} value={formatMoneyForCountry(p.price, activeCountry, lang)} />
              <Metric icon={TrendingUp} label={t.roi} value={`${p.roi || 0}%`} />
              <Metric icon={BarChart3} label={isAr ? 'الربح الشهري' : 'Monthly Profit'} value={formatMoneyForCountry(p.monthlyProfit, activeCountry, lang)} />
            </div>
          </div>

          <PublicAdBanners ads={ads} placements={['project_details_middle', 'all_middle']} variant="light" />

          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard icon={MapPin} title={t.location} value={[governorate, city].filter(Boolean).join(' · ') || '-'} />
            <InfoCard icon={CalendarDays} title={isAr ? 'تاريخ النشر' : 'Published'} value={formatDate(p.createdAt, lang)} />
            <InfoCard icon={Eye} title={isAr ? 'المشاهدات' : 'Views'} value={String(p.views || 0)} />
            <InfoCard icon={MessageCircle} title={isAr ? 'طلبات التواصل' : 'Contact requests'} value={String(p.contacts || 0)} />
          </div>

          <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black text-slate-950">{isAr ? 'مؤشرات الثقة' : 'Trust indicators'}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[p.verified ? (isAr ? 'مشروع موثق' : 'Verified project') : (isAr ? 'بانتظار التوثيق' : 'Verification pending'), isAr ? 'بيانات مالية واضحة' : 'Clear financials', isAr ? 'تواصل محمي' : 'Protected contact'].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 font-black text-emerald-900"><CheckCircle2 size={18} /> {item}</div>
              ))}
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-28 sm:p-8">
          <p className="text-sm font-black text-slate-500">{isAr ? 'السعر المطلوب' : 'Asking price'}</p>
          <p className="mt-2 text-4xl font-black text-emerald-800">{formatMoneyForCountry(p.price, activeCountry, lang)}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-3xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">{t.roi}</p><p className="mt-1 text-2xl font-black text-slate-950">{p.roi || 0}%</p></div>
            <div className="rounded-3xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">{isAr ? 'شهريًا' : 'Monthly'}</p><p className="mt-1 text-2xl font-black text-slate-950">{formatMoneyForCountry(p.monthlyProfit, activeCountry, lang)}</p></div>
          </div>
          <div className="mt-6 rounded-3xl bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-900">
            {isAr ? 'التواصل محمي: سجّل الدخول لفتح المحادثة أو واتساب، وسيتم حفظ طلب التواصل في حسابك.' : 'Protected contact: sign in to open chat or WhatsApp, and the request will be saved to your account.'}
          </div>
          <div className="mt-5">
            <ContactActions
              country={activeCountry.code}
              lang={lang}
              projectId={p.id || p.slug}
              projectTitle={title}
              ownerId={p.ownerId}
              whatsapp={p.whatsapp || p.phone}
              projectSnapshot={{
                id: p.id || p.slug,
                slug: p.slug,
                title_ar: p.titleAr,
                title_en: p.titleEn,
                cover_image_url: p.image,
                price: p.price,
                roi: p.roi,
                city: city,
                governorate: governorate,
                country_code: activeCountry.code,
              }}
            />
          </div>
          <SaveProjectButton
            country={activeCountry.code}
            lang={lang}
            projectId={p.id || p.slug}
            project={{
              id: p.id || p.slug,
              slug: p.slug,
              title_ar: p.titleAr,
              title_en: p.titleEn,
              cover_image_url: p.image,
              price: p.price,
              roi: p.roi,
              city,
              governorate,
              country_code: activeCountry.code,
            }}
          />
          <RatingButton projectId={p.id || p.slug} reviewedUserId={p.ownerId} lang={lang} />
          <ReportButton targetType="project" targetId={p.id || p.slug} projectId={p.id || p.slug} reportedUserId={p.ownerId} lang={lang} />
          <Link href={`/${activeCountry.code}/${lang}/opportunities`} className="mt-3 block rounded-2xl border border-slate-200 px-6 py-4 text-center font-black text-emerald-900">{t.opportunities}</Link>
        </aside>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <div className="rounded-3xl bg-slate-50 p-5"><Icon className="text-emerald-700" size={24} /><p className="mt-3 text-sm font-bold text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-emerald-800">{value}</p></div>;
}

function InfoCard({ icon: Icon, title, value }: { icon: any; title: string; value: string }) {
  return <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><Icon className="text-emerald-700" size={24} /><p className="mt-4 text-sm font-bold text-slate-500">{title}</p><p className="mt-2 text-xl font-black text-slate-950">{value}</p></div>;
}
