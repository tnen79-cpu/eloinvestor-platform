'use client';

import { PromotionClickLink } from '@/components/PromotionClickLink';
import { CompareProjectButton } from '@/components/CompareProjectButton';
import { SaveProjectButton } from '@/components/SaveProjectButton';
import { ReportButton } from '@/components/ReportButton';
import { getCategoryLabel, getDictionary } from '@/lib/data';
import { useI18n } from '@/components/I18nProvider';
import { formatMoneyForCountry, type DbCountry, type UiProject } from '@/lib/server-data';

export function ProjectCard({ project, lang, country }: { project: UiProject; lang: string; country?: DbCountry }) {
  const legacy = getDictionary(lang);
  const { t } = useI18n();
  const isAr = lang === 'ar';
  const city = isAr ? project.cityAr : project.cityEn;
  const title = isAr ? project.titleAr : project.titleEn;
  const routeId = encodeURIComponent(project.id || project.slug);
  const href = `/${project.country}/${lang}/project/${routeId}`;
  const score = project.verified ? 'A+' : project.roi && project.roi > 10 ? 'A' : 'B+';

  return (
    <article className="listing-card">
      <PromotionClickLink href={href} projectId={project.id || project.slug} enabled={project.isSponsored} className="block">
        <div className="listing-thumb">
          <img src={project.image} alt={title} loading="lazy" />
          {project.verified && <span className="badge">{t('common', 'verified', legacy.verified)}</span>}
          {project.isSponsored && <span className="badge sponsored">👑 {t('common', 'sponsored', isAr ? 'ممول' : 'Sponsored')}</span>}
          {!!project.roi && <span className="badge hot">🔥 {project.roi}%</span>}
        </div>
      </PromotionClickLink>
      <div className="listing-body">
        <PromotionClickLink href={href} projectId={project.id || project.slug} enabled={project.isSponsored}><h3 className="line-clamp-2">{title}</h3></PromotionClickLink>
        <div className="meta">
          <span>📍 {city || t('project', 'not_specified', isAr ? 'غير محدد' : 'Not specified')}</span>
          <span>{getCategoryLabel(project.category, lang)}</span>
          <span>👥 {project.contacts || 0} {t('project', 'interested', isAr ? 'مهتم' : 'Leads')}</span>
        </div>
        <div className="price-row">
          <div className="price"><small>{t('common', 'price', legacy.price)}</small><b>{formatMoneyForCountry(project.price, country, lang)}</b></div>
          <div className="score-chip">{score}</div>
        </div>
        <div className="insights">
          <div className="insight"><span>{t('project', 'risk', isAr ? 'المخاطر' : 'Risk')}</span><b>{t('project', 'low', isAr ? 'منخفضة' : 'Low')}</b></div>
          <div className="insight"><span>{t('project', 'demand', isAr ? 'الطلب' : 'Demand')}</span><b>{project.contacts ? t('project', 'high', isAr ? 'مرتفع' : 'High') : t('project', 'new', isAr ? 'جديد' : 'New')}</b></div>
          <div className="insight"><span>{t('project', 'views', isAr ? 'المشاهدات' : 'Views')}</span><b>{project.views || 0}</b></div>
        </div>
        <div className="card-actions">
          <PromotionClickLink href={href} projectId={project.id || project.slug} enabled={project.isSponsored} className="btn btn-blue">{t('common', 'details', legacy.details)}</PromotionClickLink>
        </div>
        <SaveProjectButton projectId={project.id || project.slug} project={{ id: project.id, slug: project.slug, title: title, title_ar: project.titleAr, title_en: project.titleEn, price: project.price, roi: project.roi, city: city, cover_image_url: project.image, category: project.category }} lang={lang} country={project.country} />
        <CompareProjectButton compact projectId={project.id || project.slug} country={project.country} lang={lang} />
        <ReportButton compact targetType="project" targetId={project.id || project.slug} projectId={project.id || project.slug} reportedUserId={project.ownerId} lang={lang} />
      </div>
    </article>
  );
}
