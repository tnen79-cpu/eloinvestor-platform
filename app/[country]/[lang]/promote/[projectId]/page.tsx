export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { ProjectPromotionForm } from '@/components/ProjectPromotionForm';
import { getCountryByCode, getProjectBySlug } from '@/lib/server-data';

export default async function PromoteProjectPage({
  params,
}: {
  params: Promise<{ country: string; lang: string; projectId: string }>;
}) {
  const { country, lang, projectId } = await params;
  const activeCountry = await getCountryByCode(country);
  const project = await getProjectBySlug(projectId, true);
  if (!project) notFound();

  return (
    <main className="promote-page-v34" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <ProjectPromotionForm
        country={activeCountry.code}
        lang={lang}
        projectId={project.id || project.slug}
        projectTitle={lang === 'ar' ? project.titleAr : project.titleEn}
        projectImage={project.image}
        ownerId={project.ownerId}
      />
    </main>
  );
}
