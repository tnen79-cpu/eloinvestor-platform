import { ProjectCard } from '@/components/ProjectCard';
import { categories, getDictionary, projects } from '@/lib/data';

export default async function OpportunitiesPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const t = getDictionary(lang);
  const list = projects.filter((p) => p.country === country);
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-[2rem] bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-black text-slate-950">{t.opportunities}</h1>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <input className="rounded-2xl border border-slate-200 bg-white px-5 py-4 font-bold outline-none focus:border-emerald-600" placeholder={t.searchPlaceholder} />
          <select className="rounded-2xl border border-slate-200 bg-white px-5 py-4 font-bold"><option>{t.allCategories}</option>{categories.map(c => <option key={c.key}>{lang === 'ar' ? c.ar : c.en}</option>)}</select>
          <select className="rounded-2xl border border-slate-200 bg-white px-5 py-4 font-bold"><option>{t.allRegions}</option></select>
          <select className="rounded-2xl border border-slate-200 bg-white px-5 py-4 font-bold"><option>{t.latest}</option></select>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {list.map((project) => <ProjectCard key={project.slug} project={project} lang={lang} />)}
      </div>
    </main>
  );
}
