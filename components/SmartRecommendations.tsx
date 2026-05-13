'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LockKeyhole, Sparkles, TrendingUp } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { recommendationLimit, scoreProject } from '@/lib/intelligence';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1200&auto=format&fit=crop';

type Row = Record<string, any>;

function pick(row: Row, keys: string[], fallback = '') {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null && String(row[key]).trim()) return String(row[key]);
  return fallback;
}
function num(row: Row, keys: string[], fallback = 0) {
  for (const key of keys) { const n = Number(row?.[key]); if (Number.isFinite(n)) return n; }
  return fallback;
}

export function SmartRecommendations({ country, lang, embedded = false }: { country: string; lang: string; embedded?: boolean }) {
  const isAr = lang === 'ar';
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Row | null>(null);
  const [projects, setProjects] = useState<Row[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [contacted, setContacted] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data: userData } = await supabaseBrowser.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) { if (mounted) setLoading(false); return; }
      const [profileRes, savedRes, contactedRes, projectRes] = await Promise.all([
        supabaseBrowser.from('users').select('*').eq('auth_id', uid).maybeSingle(),
        supabaseBrowser.from('investor_saved_projects').select('project_id').eq('investor_auth_id', uid),
        supabaseBrowser.from('investor_contacted_projects').select('project_id').eq('investor_auth_id', uid),
        supabaseBrowser.from('projects').select('*').eq('country_code', country).in('status', ['approved', 'active', 'published']).limit(120),
      ]);
      if (!mounted) return;
      setProfile(profileRes.data || null);
      setSaved((savedRes.data || []).map((r: any) => String(r.project_id)));
      setContacted((contactedRes.data || []).map((r: any) => String(r.project_id)));
      setProjects(projectRes.data || []);
      setLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, [country]);

  const recommendations = useMemo(() => {
    const signals = {
      preferredCategories: Array.isArray(profile?.preferred_categories) ? profile?.preferred_categories : [],
      preferredLocation: profile?.preferred_location || '',
      budgetMin: Number(profile?.budget_min || 0),
      budgetMax: Number(profile?.budget_max || 0),
      savedIds: saved,
      contactedIds: contacted,
      plan: profile?.subscription_status || profile?.plan || 'free',
    };
    return projects.map((p) => {
      const mapped: any = {
        id: pick(p, ['id']), slug: pick(p, ['slug', 'id']), country, category: pick(p, ['category', 'sector'], 'services'),
        titleAr: pick(p, ['title_ar', 'title'], 'فرصة استثمارية'), titleEn: pick(p, ['title_en', 'title'], 'Investment opportunity'),
        summaryAr: pick(p, ['description_ar', 'description'], ''), summaryEn: pick(p, ['description_en', 'description'], ''),
        cityAr: pick(p, ['city', 'governorate'], ''), cityEn: pick(p, ['city_en', 'city'], ''), governorateAr: pick(p, ['governorate'], ''), governorateEn: pick(p, ['governorate_en', 'governorate'], ''),
        price: num(p, ['price', 'asking_price'], 0), roi: num(p, ['roi', 'profit_percentage'], 0), views: num(p, ['views_count', 'views'], 0), contacts: num(p, ['contacts_count', 'contacts'], 0),
        verified: p.is_verified === true || p.verified === true || p.verification_status === 'approved', createdAt: pick(p, ['created_at'], ''), image: pick(p, ['cover_image_url', 'image_url', 'image'], DEFAULT_IMAGE),
      };
      return { project: mapped, ...scoreProject(mapped, signals) };
    }).sort((a, b) => b.score - a.score);
  }, [profile, projects, saved, contacted, country]);

  const limit = recommendationLimit(profile?.subscription_status || profile?.plan || 'free');
  const visible = recommendations.slice(0, Math.min(limit, 6));
  const lockedCount = Math.max(0, recommendations.length - visible.length);

  if (loading) return <section className="smart-rec skeleton-card">{isAr ? 'جاري تجهيز فرصك الذكية...' : 'Preparing smart recommendations...'}</section>;
  if (!profile) return null;

  return (
    <section className={`smart-rec ${embedded ? 'smart-rec-embedded' : ''}`}>
      <div className="smart-rec-head">
        <span><Sparkles size={18} /> {isAr ? 'فرص مقترحة لك' : 'Recommended for you'}</span>
        <small>{isAr ? 'ترتيب ذكي حسب اهتماماتك وسلوكك' : 'Ranked by interests and behavior'}</small>
      </div>
      <div className="smart-rec-grid">
        {visible.map(({ project, score, reasons }) => (
          <Link key={project.id} href={`/${country}/${lang}/project/${project.slug || project.id}`} className="smart-rec-card">
            <img src={project.image || DEFAULT_IMAGE} alt="" />
            <div>
              <b>{isAr ? project.titleAr : project.titleEn}</b>
              <span>{project.cityAr || project.cityEn} · {project.roi || 0}% ROI</span>
              <i><TrendingUp size={13} /> {score}/100 · {reasons.slice(0, 2).join(' + ') || 'smart'}</i>
            </div>
          </Link>
        ))}
        {lockedCount > 0 ? <Link href={`/${country}/${lang}/dashboard?tab=packages`} className="smart-rec-locked"><LockKeyhole size={22} /><b>{lockedCount} {isAr ? 'فرصة مقفلة' : 'locked opportunities'}</b><span>{isAr ? 'رقي باقتك لفتح توصيات أكثر.' : 'Upgrade to unlock more recommendations.'}</span></Link> : null}
      </div>
    </section>
  );
}
