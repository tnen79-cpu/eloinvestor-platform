import Link from 'next/link';
import { formatMoney, getCategoryLabel, getDictionary } from '@/lib/data';

type Project = {
  slug: string; country: string; titleAr: string; titleEn: string; cityAr: string; cityEn: string; price: number; roi: number; category: string; verified: boolean; image: string;
};

export function ProjectCard({ project, lang }: { project: Project; lang: string }) {
  const t = getDictionary(lang);
  const isAr = lang === 'ar';
  return (
    <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-900/10">
      <div className="relative h-56 overflow-hidden">
        <img src={project.image} alt="" className="h-full w-full object-cover transition duration-700 hover:scale-105" />
        {project.verified && <span className="absolute start-4 top-4 rounded-full bg-emerald-600 px-3 py-2 text-xs font-black text-white">✓ {t.verified}</span>}
        <span className="absolute end-4 top-4 rounded-full bg-white/90 px-3 py-2 text-xs font-black text-emerald-900 backdrop-blur">{project.roi}% {t.roi}</span>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="text-sm font-bold text-slate-500">📍 {isAr ? project.cityAr : project.cityEn} · {getCategoryLabel(project.category, lang)}</p>
          <h3 className="mt-2 line-clamp-2 text-xl font-black text-slate-950">{isAr ? project.titleAr : project.titleEn}</h3>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-slate-500">{t.price}</p>
            <p className="text-2xl font-black text-emerald-800">{formatMoney(project.price, project.country, lang)}</p>
          </div>
          <Link href={`/${project.country}/${lang}/project/${project.slug}`} className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white">{t.details}</Link>
        </div>
      </div>
    </article>
  );
}
