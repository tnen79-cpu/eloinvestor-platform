export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { getCountryByCode, getProjects, formatMoneyForCountry } from '@/lib/server-data';
import { getCategoryLabel, getDictionary } from '@/lib/data';

export default async function ProjectsMapPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const isAr = lang === 'ar';
  const activeCountry = await getCountryByCode(country);
  const t = getDictionary(lang);
  const projects = (await getProjects(activeCountry.code, false, 160)).filter((p) => p.mapLat && p.mapLng);
  const centerLat = projects[0]?.mapLat || 23.5880;
  const centerLng = projects[0]?.mapLng || 58.3829;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${Number(centerLng) - 0.25}%2C${Number(centerLat) - 0.25}%2C${Number(centerLng) + 0.25}%2C${Number(centerLat) + 0.25}&layer=mapnik&marker=${centerLat}%2C${centerLng}`;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8" dir={isAr ? 'rtl' : 'ltr'}>
      <nav className="mb-5 flex gap-2 text-sm font-bold text-slate-500"><Link href={`/${activeCountry.code}/${lang}`}>{t.home}</Link><span>/</span><span>{isAr ? 'خريطة المشاريع' : 'Projects map'}</span></nav>
      <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-sm"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black"><MapPin size={16} /> {isAr ? 'خريطة تفاعلية' : 'Interactive map'}</span><h1 className="mt-4 text-3xl font-black">{isAr ? 'استكشف الفرص حسب الموقع' : 'Explore opportunities by location'}</h1><p className="mt-2 max-w-2xl text-sm font-bold text-white/70">{isAr ? 'تعرض الصفحة المشاريع التي تحتوي على إحداثيات map_lat و map_lng، والضغط على أي كرت يفتح تفاصيل المشروع.' : 'This page shows projects with map_lat and map_lng coordinates; click a card to open details.'}</p></section>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
        <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm"><iframe title="Projects map" src={mapSrc} className="h-[620px] w-full" /></div>
        <aside className="grid max-h-[620px] gap-3 overflow-auto rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm">
          {projects.length ? projects.map((project) => <Link key={project.id || project.slug} href={`/${activeCountry.code}/${lang}/project/${encodeURIComponent(project.id || project.slug)}`} className="rounded-2xl border border-slate-100 p-3 hover:border-blue-200"><div className="flex gap-3"><img src={project.image} alt="" className="h-20 w-24 rounded-xl object-cover" /><div><b className="line-clamp-2">{isAr ? project.titleAr : project.titleEn}</b><p className="mt-1 text-xs font-bold text-slate-500">{isAr ? project.cityAr : project.cityEn} · {getCategoryLabel(project.category, lang)}</p><strong className="mt-1 block text-blue-700">{formatMoneyForCountry(project.price, activeCountry, lang)}</strong></div></div></Link>) : <div className="rounded-2xl bg-slate-50 p-5 text-center font-black text-slate-500">{isAr ? 'لا توجد مشاريع بإحداثيات حالياً.' : 'No projects with coordinates yet.'}</div>}
        </aside>
      </div>
    </main>
  );
}
