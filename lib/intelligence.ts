import type { UiProject } from './server-data';

export type SearchFilters = {
  q?: string;
  sector?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minRoi?: number;
  verifiedOnly?: boolean;
  premiumOnly?: boolean;
  sort?: string;
};

export type InvestorSignals = {
  preferredCategories?: string[];
  preferredLocation?: string;
  budgetMin?: number;
  budgetMax?: number;
  savedIds?: string[];
  contactedIds?: string[];
  plan?: string;
};

function n(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function includes(text: string, needle: string) {
  return text.toLowerCase().includes(needle.toLowerCase());
}

export function normalizePlan(plan?: string) {
  return String(plan || 'free').trim().toLowerCase().replace(/\s+/g, '_');
}

export function recommendationLimit(plan?: string) {
  const p = normalizePlan(plan);
  if (['elite', 'business', 'investor_elite'].includes(p)) return 999;
  if (['pro', 'premium', 'investor_pro'].includes(p)) return 25;
  if (['starter', 'growth', 'investor_starter'].includes(p)) return 8;
  return 3;
}

export function scoreProject(project: UiProject, signals: InvestorSignals = {}) {
  const categories = signals.preferredCategories || [];
  const saved = new Set(signals.savedIds || []);
  const contacted = new Set(signals.contactedIds || []);
  const budgetMin = n(signals.budgetMin);
  const budgetMax = n(signals.budgetMax);
  const price = n(project.price);
  const roi = n(project.roi);
  const views = n(project.views);
  const contacts = n(project.contacts);
  const plan = normalizePlan(signals.plan);

  let score = 35;
  const reasons: string[] = [];

  if (project.verified) { score += 15; reasons.push('verified_boost'); }
  if (categories.length && categories.includes(project.category)) { score += 22; reasons.push('category_match'); }
  if (signals.preferredLocation) {
    const loc = `${project.cityAr} ${project.cityEn} ${project.governorateAr || ''} ${project.governorateEn || ''}`;
    if (includes(loc, signals.preferredLocation)) { score += 16; reasons.push('location_match'); }
  }
  if (budgetMax > 0 && price > 0 && price >= budgetMin && price <= budgetMax) { score += 18; reasons.push('budget_match'); }
  if (roi >= 20) { score += 10; reasons.push('high_roi'); }
  else if (roi >= 10) { score += 6; reasons.push('good_roi'); }

  const ctr = contacts > 0 && views > 0 ? contacts / Math.max(views, 1) : 0;
  score += Math.min(14, Math.round(ctr * 100));
  if (ctr > 0.05) reasons.push('ctr_weighting');

  if (saved.has(String(project.id || project.slug))) { score += 4; reasons.push('behavior_saved'); }
  if (contacted.has(String(project.id || project.slug))) { score -= 8; reasons.push('already_contacted'); }

  if (['pro', 'premium', 'elite', 'business', 'investor_pro', 'investor_elite'].includes(plan)) { score += 5; reasons.push('premium_investor_match'); }

  return { score: Math.max(0, Math.min(100, score)), reasons, ctr };
}

export function filterProjects(projects: UiProject[], filters: SearchFilters) {
  const q = String(filters.q || '').trim().toLowerCase();
  return projects.filter((project) => {
    const text = `${project.titleAr} ${project.titleEn} ${project.summaryAr} ${project.summaryEn}`.toLowerCase();
    if (q && !text.includes(q)) return false;
    if (filters.sector && filters.sector !== 'all' && project.category !== filters.sector) return false;
    if (filters.city && filters.city !== 'all') {
      const cityText = `${project.cityAr} ${project.cityEn} ${project.governorateAr || ''} ${project.governorateEn || ''}`.toLowerCase();
      if (!cityText.includes(String(filters.city).toLowerCase())) return false;
    }
    if (filters.verifiedOnly && !project.verified) return false;
    if (filters.premiumOnly && !(project as any).isSponsored && !(project as any).sponsored) return false;
    if (filters.minRoi && n(project.roi) < filters.minRoi) return false;
    if (filters.minPrice && n(project.price) < filters.minPrice) return false;
    if (filters.maxPrice && n(project.price) > filters.maxPrice) return false;
    return true;
  });
}

export function sortProjects(projects: UiProject[], sort = 'smart', signals: InvestorSignals = {}) {
  const copy = [...projects];
  return copy.sort((a, b) => {
    if (sort === 'price_asc') return n(a.price) - n(b.price);
    if (sort === 'price_desc') return n(b.price) - n(a.price);
    if (sort === 'roi_desc') return n(b.roi) - n(a.roi);
    if (sort === 'views_desc') return n(b.views) - n(a.views);
    if (sort === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    return scoreProject(b, signals).score - scoreProject(a, signals).score;
  });
}

export function parseSearchParams(params: Record<string, string | string[] | undefined>): SearchFilters {
  const val = (key: string) => Array.isArray(params[key]) ? params[key]?.[0] : params[key];
  return {
    q: val('q'),
    sector: val('sector'),
    city: val('city'),
    minPrice: n(val('minPrice'), 0) || undefined,
    maxPrice: n(val('maxPrice'), 0) || undefined,
    minRoi: n(val('minRoi'), 0) || undefined,
    verifiedOnly: val('verified') === '1',
    premiumOnly: val('premium') === '1',
    sort: val('sort') || 'smart',
  };
}
