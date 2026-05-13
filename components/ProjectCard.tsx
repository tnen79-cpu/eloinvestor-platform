import Link from 'next/link';
import { SaveProjectButton } from '@/components/SaveProjectButton';
import { ReportButton } from '@/components/ReportButton';
import { getCategoryLabel, getDictionary } from '@/lib/data';
import { formatMoneyForCountry, type DbCountry, type UiProject } from '@/lib/server-data';

export function ProjectCard({ project, lang, country }: { project: UiProject; lang: string; country?: DbCountry }) {
  const t = getDictionary(lang);
  const isAr = lang === 'ar';
  const city = isAr ? project.cityAr : project.cityEn;
  const title = isAr ? project.titleAr : project.titleEn;
  const routeId = encodeURIComponent(project.id || project.slug);
  const href = `/${project.country}/${lang}/project/${routeId}`;
  const score = project.verified ? 'A+' : project.roi && project.roi > 10 ? 'A' : 'B+';

  return (
    <article className="listing-card">
      <Link href={href} className="block">
        <div className="listing-thumb">
          <img src={project.image} alt={title} loading="lazy" />
          {project.verified && <span className="badge">{t.verified}</span>}
          {project.isSponsored && <span className="badge sponsored">👑 {isAr ? 'ممول' : 'Sponsored'}</span>}
          {!!project.roi && <span className="badge hot">🔥 {project.roi}%</span>}
        </div>
      </Link>
      <div className="listing-body">
        <Link href={href}><h3 className="line-clamp-2">{title}</h3></Link>
        <div className="meta">
          <span>📍 {city || (isAr ? 'غير محدد' : 'Not specified')}</span>
          <span>{getCategoryLabel(project.category, lang)}</span>
          <span>👥 {project.contacts || 0} {isAr ? 'مهتم' : 'Leads'}</span>
        </div>
        <div className="price-row">
          <div className="price"><small>{t.price}</small><b>{formatMoneyForCountry(project.price, country, lang)}</b></div>
          <div className="score-chip">{score}</div>
        </div>
        <div className="insights">
          <div className="insight"><span>{isAr ? 'المخاطر' : 'Risk'}</span><b>{isAr ? 'منخفضة' : 'Low'}</b></div>
          <div className="insight"><span>{isAr ? 'الطلب' : 'Demand'}</span><b>{project.contacts ? (isAr ? 'مرتفع' : 'High') : (isAr ? 'جديد' : 'New')}</b></div>
          <div className="insight"><span>{isAr ? 'المشاهدات' : 'Views'}</span><b>{project.views || 0}</b></div>
        </div>
        <div className="card-actions">
          <Link href={href} className="btn btn-green">{t.details}</Link>
        </div>
        <SaveProjectButton projectId={project.id || project.slug} project={{ id: project.id, slug: project.slug, title: title, title_ar: project.titleAr, title_en: project.titleEn, price: project.price, roi: project.roi, city: city, cover_image_url: project.image, category: project.category }} lang={lang} country={project.country} />
        <ReportButton compact targetType="project" targetId={project.id || project.slug} projectId={project.id || project.slug} reportedUserId={project.ownerId} lang={lang} />
      </div>
    </article>
  );
}
