export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Eye,
  FileText,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
  TrendingUp,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react';
import { CompareProjectButton } from '@/components/CompareProjectButton';
import { NdaAcceptanceGate } from '@/components/NdaAcceptanceGate';
import { ProjectDetailsTabs } from '@/components/ProjectDetailsTabs';
import { ProjectMediaGallery } from '@/components/ProjectMediaGallery';
import { ProjectOwnerActions } from '@/components/ProjectOwnerActions';
import { ProjectViewTracker } from '@/components/ProjectViewTracker';
import { RatingButton } from '@/components/RatingButton';
import { ReportButton } from '@/components/ReportButton';
import { SaveProjectButton } from '@/components/SaveProjectButton';
import { ShareProjectButton } from '@/components/ShareProjectButton';
import { getCategoryLabel, getDictionary } from '@/lib/data';
import {
  formatDate,
  formatMoneyForCountry,
  getCountryByCode,
  getProjectBySlug,
  getProjectDocuments,
  getProjectQuestions,
  getProjectRatings,
  getProjects,
  getUserProfileById,
  roleLabel,
  type UiProject,
} from '@/lib/server-data';

function numberEn(value: number | string | undefined | null) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return '0';
  return new Intl.NumberFormat('en-US').format(n);
}

function percentEn(value: number | string | undefined | null) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return '0%';
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n)}%`;
}

function getTitle(project: UiProject, isAr: boolean) {
  return isAr ? project.titleAr : project.titleEn;
}

function hasRealLocation(location: string) {
  const clean = String(location || '').trim().toLowerCase();
  return Boolean(clean && !['oman', 'عمان', 'سلطنة عمان'].includes(clean));
}

function normalizeOpportunityType(value: string | undefined | null, isAr: boolean) {
  const clean = String(value || '').trim().toLowerCase();
  const map: Record<string, { ar: string; en: string; financing: boolean }> = {
    sale: { ar: 'بيع', en: 'Sale', financing: false },
    sell: { ar: 'بيع', en: 'Sale', financing: false },
    for_sale: { ar: 'بيع', en: 'Sale', financing: false },
    partnership: { ar: 'شراكة', en: 'Partnership', financing: false },
    partner: { ar: 'شراكة', en: 'Partnership', financing: false },
    funding: { ar: 'تمويل', en: 'Funding', financing: true },
    finance: { ar: 'تمويل', en: 'Funding', financing: true },
    investment: { ar: 'تمويل', en: 'Investment', financing: true },
    franchise: { ar: 'امتياز تجاري', en: 'Franchise', financing: false },
  };
  const item = map[clean] || (clean.includes('fund') || clean.includes('تمويل') ? map.funding : null);
  return {
    label: item ? (isAr ? item.ar : item.en) : (value || (isAr ? 'غير محدد' : 'Not specified')),
    isFinancing: Boolean(item?.financing),
  };
}

function shortenText(value: string, max = 220) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trim()}…`;
}

export default async function ProjectDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ country: string; lang: string; slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { country, lang, slug } = await params;
  const query = searchParams ? await searchParams : {};
  const adminPreview = query?.adminPreview === '1';
  const isAr = lang === 'ar';
  const t = getDictionary(lang);

  const p = await getProjectBySlug(slug, true);
  if (!p) notFound();

  const blocked = ['rejected', 'deleted', 'hidden', 'trash'];
  if (!adminPreview && blocked.includes(String(p.status || '').toLowerCase())) notFound();

  const activeCountry = await getCountryByCode(p.country || country);
  const title = getTitle(p, isAr);
  const summary = isAr ? p.summaryAr : p.summaryEn;
  const opportunity = normalizeOpportunityType(p.opportunityType, isAr);
  const city = isAr ? p.cityAr : p.cityEn;
  const governorate = isAr ? p.governorateAr : p.governorateEn;
  const location = [governorate, city].filter(Boolean).join(' - ');
  const displayLocation = hasRealLocation(location) ? location : '';
  const hasMapCoordinates = Boolean(p.mapLat && p.mapLng);
  const mapUrl = hasMapCoordinates ? `https://www.openstreetmap.org/export/embed.html?bbox=${Number(p.mapLng) - 0.01}%2C${Number(p.mapLat) - 0.01}%2C${Number(p.mapLng) + 0.01}%2C${Number(p.mapLat) + 0.01}&layer=mapnik&marker=${p.mapLat}%2C${p.mapLng}` : '';
  const googleMapUrl = hasMapCoordinates ? `https://www.google.com/maps?q=${p.mapLat},${p.mapLng}` : '';
  const categoryLabel = getCategoryLabel(p.category, lang);
  const gallery = (p.gallery?.length ? p.gallery : [p.image]).filter(Boolean).slice(0, 12);
  const fundingProgress = opportunity.isFinancing ? Math.max(0, Math.min(100, Number(p.roi || 0))) : 0;
  const requiredAmount = formatMoneyForCountry(p.price, activeCountry, lang);
  const monthlyProfit = formatMoneyForCountry(p.monthlyProfit, activeCountry, lang);
  const projectId = p.id || p.slug;

  const [ownerProfile, documents, questions, ratings] = await Promise.all([
    p.ownerId ? getUserProfileById(p.ownerId) : Promise.resolve(null),
    getProjectDocuments(p.id || p.slug),
    getProjectQuestions(p.id || p.slug),
    getProjectRatings(p.id || p.slug),
  ]);

  const ownerDisplayName = ownerProfile?.name || p.ownerName || (isAr ? 'صاحب المشروع' : 'Project owner');
  const ownerProfileId = ownerProfile?.slug || ownerProfile?.authId || ownerProfile?.id || p.ownerId || '';
  const ownerProfileHref = ownerProfileId ? `/${activeCountry.code}/${lang}/profile/${encodeURIComponent(ownerProfileId)}` : '';
  const ownerVerified = ownerProfile?.verificationStatus === 'approved' || (ownerProfile?.trustScore || 0) >= 70 || p.verified;
  const ownerRating = Number(ownerProfile?.averageRating || 0);
  const ownerRatingsCount = Number(ownerProfile?.ratingsCount || 0);

  const similarProjects = (await getProjects(activeCountry.code, false))
    .filter((project) => (project.id || project.slug) !== (p.id || p.slug) && project.category === p.category)
    .slice(0, 4);

  const projectSnapshot = {
    id: projectId,
    slug: p.slug,
    title_ar: p.titleAr,
    title_en: p.titleEn,
    cover_image_url: p.image,
    price: p.price,
    roi: p.roi,
    city,
    governorate,
    country_code: activeCountry.code,
  };

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://eloinvestor.com').replace(/\/$/, '');
  const projectUrl = `${siteUrl}/${activeCountry.code}/${lang}/project/${encodeURIComponent(p.slug || projectId)}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description: shortenText(summary || title, 300),
    image: gallery[0] || p.image || undefined,
    url: projectUrl,
    category: categoryLabel,
    brand: { '@type': 'Brand', name: 'EloInvestor' },
    offers: {
      '@type': 'Offer',
      price: Number(p.price || 0),
      priceCurrency: activeCountry.currency || 'OMR',
      availability: 'https://schema.org/InStock',
      url: projectUrl,
    },
    areaServed: displayLocation || activeCountry.nameEn || activeCountry.nameAr || activeCountry.code,
  };

  const ownerBlock = (
    <div className="project-owner-line">
      <span className="project-owner-avatar">
        {ownerProfile?.avatarUrl || p.ownerAvatar ? <img src={ownerProfile?.avatarUrl || p.ownerAvatar} alt={ownerDisplayName} /> : <UserCircle size={22} />}
      </span>
      <span className="project-owner-text">
        <small>{isAr ? 'صاحب المشروع' : 'Project owner'}</small>
        <b>
          {ownerDisplayName}
          {ownerVerified ? <BadgeCheck className="fb-blue-check" size={17} fill="currentColor" /> : null}
        </b>
        <em>{roleLabel(ownerProfile?.accountType || p.ownerRole || 'owner', lang)}</em>
      </span>
    </div>
  );

  return (
    <main className="project-details-v34" dir={isAr ? 'rtl' : 'ltr'}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ProjectViewTracker projectId={projectId} isSponsored={Boolean(p.isSponsored)} />

      <nav className="project-breadcrumb-v34">
        <Link href={`/${activeCountry.code}/${lang}`}>{t.home}</Link>
        <span>/</span>
        <Link href={`/${activeCountry.code}/${lang}/opportunities`}>{t.opportunities}</Link>
        <span>/</span>
        <span>{isAr ? 'تفاصيل المشروع' : 'Project details'}</span>
      </nav>

      <section className="project-shell-v34">
        <div className="project-main-v34">
          <section className="project-hero-v34">
            <ProjectMediaGallery images={gallery} title={title} lang={lang} />

            <div className="project-title-panel-v34">
              <span className="project-sector-pill-v34">{categoryLabel}</span>
              <h1>{title}</h1>
              <div className="project-meta-line-v34">
                {displayLocation ? <span><MapPin size={15} /> {displayLocation}</span> : null}
                {p.verified ? <span className="verified"><BadgeCheck size={16} fill="currentColor" /> {isAr ? 'موثق' : 'Verified'}</span> : null}
                {p.isSponsored ? <span className="sponsored">{isAr ? 'ممول' : 'Sponsored'}</span> : null}
              </div>

            </div>
          </section>

          <section className="project-metrics-strip-v34">
            <MetricBox icon={Wallet} label={isAr ? 'المبلغ المطلوب' : 'Required amount'} value={requiredAmount} />
            {opportunity.isFinancing ? <MetricBox icon={BarChart3} label={isAr ? 'نسبة التمويل' : 'Funding'} value={percentEn(fundingProgress)} /> : null}
            <MetricBox icon={TrendingUp} label={isAr ? 'العائد المتوقع' : 'Expected ROI'} value={percentEn(p.roi)} />
            <MetricBox icon={BriefcaseBusiness} label={isAr ? 'نوع المشروع' : 'Project type'} value={opportunity.label} />
          </section>

          <ProjectDetailsTabs
            lang={lang}
            summary={summary}
            categoryLabel={categoryLabel}
            location={displayLocation}
            opportunityType={opportunity.label}
            price={requiredAmount}
            roi={percentEn(p.roi)}
            monthlyProfit={monthlyProfit}
            views={numberEn(p.views)}
            contacts={numberEn(p.contacts)}
            verified={p.verified}
            ownerVerified={ownerVerified}
            documents={documents}
            projectId={projectId}
            ownerId={p.ownerId}
            questions={questions}
          />

          <section className="mt-4 grid gap-4">
            <NdaAcceptanceGate projectId={projectId} lang={lang} />
            {ratings.length ? (
              <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="font-black text-slate-950">{isAr ? 'تقييمات المستثمرين' : 'Investor ratings'}</h3>
                <div className="mt-4 grid gap-3">
                  {ratings.slice(0, 4).map((rating) => (
                    <article key={rating.id} className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-amber-400">{'★'.repeat(Math.max(1, Math.min(5, Number(rating.rating || 0))))}<span className="text-slate-300">{'★'.repeat(Math.max(0, 5 - Number(rating.rating || 0)))}</span></div>
                      {rating.comment ? <p className="mt-2 text-sm font-bold text-slate-700">{rating.comment}</p> : null}
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="project-info-cards-v34">
            {(displayLocation || hasMapCoordinates) ? (
              <InfoCard icon={MapPin} title={isAr ? 'الموقع' : 'Location'}>
                {displayLocation ? <strong>{displayLocation}</strong> : null}
                {hasMapCoordinates ? (
                  <a className="project-map-v34 has-map" href={googleMapUrl} target="_blank" rel="noreferrer" aria-label={isAr ? 'فتح الموقع في Google Maps' : 'Open in Google Maps'}>
                    <iframe title={isAr ? 'موقع المشروع' : 'Project location'} src={mapUrl} loading="lazy" />
                    <span className="project-map-open-v34">{isAr ? 'فتح في Google Maps' : 'Open in Google Maps'}</span>
                  </a>
                ) : <div className="project-map-v34"><MapPin size={28} fill="currentColor" /></div>}
              </InfoCard>
            ) : null}
            <InfoCard icon={BriefcaseBusiness} title={isAr ? 'القطاعات المرتبطة' : 'Related sectors'}>
              <div className="project-tags-v34"><span>{categoryLabel}</span><span>{isAr ? 'استثمار' : 'Investment'}</span></div>
            </InfoCard>
            <InfoCard icon={FileText} title={isAr ? 'الوثائق' : 'Documents'}>
              {documents.length ? documents.slice(0, 3).map((doc) => <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer">{doc.title}</a>) : <p>{isAr ? 'لا توجد وثائق عامة.' : 'No public documents.'}</p>}
            </InfoCard>
          </section>

          {similarProjects.length ? (
            <section className="similar-projects-v34">
              <div className="section-head-v34">
                <h2>{isAr ? 'مشاريع مشابهة' : 'Similar projects'}</h2>
                <Link href={`/${activeCountry.code}/${lang}/opportunities`}>{isAr ? 'عرض جميع المشاريع' : 'View all'}</Link>
              </div>
              <div className="similar-grid-v34">
                {similarProjects.map((project) => (
                  <Link key={project.id || project.slug} href={`/${activeCountry.code}/${lang}/project/${project.slug || project.id}`} className="similar-card-v34">
                    <img src={project.image} alt={getTitle(project, isAr)} />
                    <div>
                      <span>{getCategoryLabel(project.category, lang)}</span>
                      <h3>{getTitle(project, isAr)}</h3>
                      <b>{formatMoneyForCountry(project.price, activeCountry, lang)}</b>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="project-sidebar-v34">
          <div className="deal-card-v34">
            <p>{isAr ? 'المبلغ المطلوب' : 'Required amount'}</p>
            <strong>{requiredAmount}</strong>
            {opportunity.isFinancing ? (
              <>
                <small>{isAr ? 'نسبة التمويل الحالية' : 'Current funding progress'}</small>
                <div className="deal-progress-v34"><i style={{ width: `${Math.min(100, fundingProgress)}%` }} /></div>
                <span>{percentEn(fundingProgress)} {isAr ? 'مكتمل' : 'completed'}</span>
              </>
            ) : null}
            <ProjectOwnerActions
              country={activeCountry.code}
              lang={lang}
              projectId={projectId}
              projectTitle={title}
              ownerId={p.ownerId}
              whatsapp={p.whatsapp || p.phone}
              projectSnapshot={projectSnapshot}
              isSponsored={Boolean(p.isSponsored)}
            />
            <div className="project-side-actions-v34">
              <SaveProjectButton country={activeCountry.code} lang={lang} projectId={projectId} project={projectSnapshot} />
              <ShareProjectButton title={title} lang={lang} />
              <CompareProjectButton projectId={projectId} country={activeCountry.code} lang={lang} />
            </div>
          </div>

          <div className="owner-card-v34">
            <h3>{isAr ? 'صاحب المشروع' : 'Project owner'}</h3>
            {ownerProfileHref ? <Link href={ownerProfileHref}>{ownerBlock}</Link> : ownerBlock}
            {ownerRating > 0 ? <div className="owner-rating-v34"><span>{percentEn(ownerRating).replace('%', '')}</span><Star size={15} fill="currentColor" /><small>({numberEn(ownerRatingsCount)})</small></div> : null}
            <div className="owner-stats-v34">
              <span>{numberEn(ownerProfile?.profileViewsCount || 0)}<small>{isAr ? 'مشاهدات' : 'views'}</small></span>
              <span>{numberEn(ownerProfile?.followersCount || 0)}<small>{isAr ? 'متابعين' : 'followers'}</small></span>
            </div>
            {ownerProfileHref ? <Link className="project-outline-btn-v34" href={ownerProfileHref}>{isAr ? 'عرض الملف الشخصي' : 'View profile'}</Link> : null}
          </div>

          <div className="quick-card-v34">
            <h3>{isAr ? 'معلومات سريعة' : 'Quick info'}</h3>
            <p><CalendarDays size={15} /><span>{isAr ? 'تاريخ النشر' : 'Published'}</span><b>{formatDate(p.createdAt, lang)}</b></p>
            {displayLocation ? <p><MapPin size={15} /><span>{isAr ? 'الموقع' : 'Location'}</span><b>{displayLocation}</b></p> : null}
            <p><MessageCircle size={15} /><span>{isAr ? 'طلبات التواصل' : 'Contacts'}</span><b>{numberEn(p.contacts)}</b></p>
            <p><Eye size={15} /><span>{isAr ? 'المشاهدات' : 'Views'}</span><b>{numberEn(p.views)}</b></p>
          </div>

          <RatingButton projectId={projectId} reviewedUserId={p.ownerId} lang={lang} />
          <ReportButton targetType="project" targetId={projectId} projectId={projectId} reportedUserId={p.ownerId} lang={lang} />
        </aside>
      </section>
    </main>
  );
}

function MetricBox({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <div><Icon size={19} /><span>{label}</span><b>{value}</b></div>;
}

function InfoCard({ icon: Icon, title, children }: { icon: any; title: string; children: ReactNode }) {
  return <div className="info-card-v34"><h3><Icon size={18} /> {title}</h3>{children}</div>;
}
