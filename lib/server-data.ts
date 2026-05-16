import { supabase } from './supabase';

const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build';
const isPlaceholderSupabase =
  isProductionBuild ||
  !(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('example.supabase.co');
import { countries as fallbackCountries, projects as fallbackProjects } from './data';
import { filterProjects, parseSearchParams, sortProjects, type InvestorSignals, type SearchFilters } from './intelligence';

export type DbLanguage = {
  code: string;
  nameAr: string;
  nameEn: string;
  direction: 'rtl' | 'ltr';
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
};

export type UiTranslations = Record<string, Record<string, string>>;

export type DbCountry = {
  code: string;
  nameAr: string;
  nameEn: string;
  flag: string;
  currency: string;
  symbolAr: string;
  symbolEn: string;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
};


export type UiSlide = {
  id?: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  buttonTextAr: string;
  buttonTextEn: string;
  buttonUrl: string;
  imageUrl: string;
  countryCode: string;
  isActive: boolean;
  slideOrder: number;
};

export type UiAd = {
  id?: string;
  title: string;
  placement: string;
  imageUrl: string;
  linkUrl: string;
  countryCode: string;
  isActive: boolean;
  sortOrder: number;
};

export type UiSector = {
  id?: string;
  key: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  imageUrl: string;
  countryCode: string;
  isActive: boolean;
  sortOrder: number;
  projectCount?: number;
};

export type UiProject = {
  id?: string;
  slug: string;
  country: string;
  titleAr: string;
  titleEn: string;
  cityAr: string;
  cityEn: string;
  governorateAr?: string;
  governorateEn?: string;
  price: number;
  roi: number;
  monthlyProfit: number;
  category: string;
  opportunityType?: string;
  verified: boolean;
  image: string;
  gallery: string[];
  summaryAr: string;
  summaryEn: string;
  status?: string;
  views?: number;
  contacts?: number;
  saves?: number;
  isSponsored?: boolean;
  sponsorWeight?: number;
  ownerId?: string;
  ownerName?: string;
  ownerAvatar?: string;
  ownerRole?: string;
  whatsapp?: string;
  phone?: string;
  mapLat?: number;
  mapLng?: number;
  mapUrl?: string;
  createdAt?: string;
};

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1600&auto=format&fit=crop';

function normalizeCode(code: unknown, fallback = 'om') {
  return String(code || fallback).trim().toLowerCase();
}

function makeFlag(code: string) {
  const clean = code.trim().toUpperCase();
  if (clean.length !== 2) return '🌍';
  return clean.replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function pickNumber(row: Record<string, any>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') {
      const n = Number(value);
      if (!Number.isNaN(n)) return n;
    }
  }
  return fallback;
}

function pickString(row: Record<string, any>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value);
  }
  return fallback;
}

function uniqueImages(images: string[]) {
  return Array.from(new Set(images.filter((url) => typeof url === 'string' && url.trim().startsWith('http'))));
}

function slugify(value: string) {
  // Keep project URLs ASCII-safe. Arabic titles stay in the project title, not the URL.
  const cleaned = value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);

  return cleaned || 'project';
}
function mapCountry(row: Record<string, any>): DbCountry {
  const code = normalizeCode(row.code);
  return {
    code,
    nameAr: pickString(row, ['name_ar', 'nameAr', 'name'], code.toUpperCase()),
    nameEn: pickString(row, ['name_en', 'nameEn', 'name'], code.toUpperCase()),
    flag: pickString(row, ['flag'], makeFlag(code)),
    currency: pickString(row, ['currency_code', 'currency'], 'OMR'),
    symbolAr: pickString(row, ['currency_symbol_ar', 'symbol_ar', 'currency_ar'], pickString(row, ['currency_code'], 'OMR')),
    symbolEn: pickString(row, ['currency_symbol_en', 'symbol_en', 'currency_en'], pickString(row, ['currency_code'], 'OMR')),
    isActive: row.is_active !== false,
    isDefault: row.is_default === true,
    sortOrder: pickNumber(row, ['sort_order', 'order'], 100),
  };
}

function mapProject(row: Record<string, any>, images: string[] = []): UiProject {
  const country = normalizeCode(row.country_code || row.country || row.countryCode);
  const titleAr = pickString(row, ['title_ar', 'title', 'name_ar', 'project_title'], 'فرصة استثمارية');
  const titleEn = pickString(row, ['title_en', 'titleEn', 'name_en'], titleAr);
  const id = pickString(row, ['id'], '');
  const slug = pickString(row, ['slug'], '') || (id ? id : slugify(titleEn || titleAr));
  const governorate = pickString(row, ['governorate', 'governorate_ar', 'region', 'wilaya'], '');
  const city = pickString(row, ['city', 'city_ar', 'location', 'location_ar'], governorate || '');
  const cover = pickString(row, ['cover_image_url', 'cover_image', 'image_url', 'main_image', 'thumbnail', 'image'], DEFAULT_IMAGE);
  const gallery = uniqueImages([cover, ...images, pickString(row, ['gallery_image_1'], ''), pickString(row, ['gallery_image_2'], '')]);

  return {
    id,
    slug,
    country,
    titleAr,
    titleEn,
    cityAr: city || pickString(row, ['location'], 'عمان'),
    cityEn: pickString(row, ['city_en', 'location_en'], city || 'Oman'),
    governorateAr: governorate,
    governorateEn: pickString(row, ['governorate_en', 'region_en'], governorate),
    price: pickNumber(row, ['price', 'project_price', 'asking_price', 'sale_price', 'investment_amount'], 0),
    roi: pickNumber(row, ['roi', 'profit_percentage', 'expected_profit_percentage', 'expected_profit_percent', 'return_percentage'], 0),
    monthlyProfit: pickNumber(row, ['monthly_profit', 'expected_monthly_profit', 'profit_monthly'], 0),
    category: pickString(row, ['category', 'sector', 'scope'], 'services'),
    opportunityType: pickString(row, ['opportunity_type', 'type'], ''),
    verified: row.is_verified === true || row.verified === true || row.verification_status === 'approved',
    image: gallery[0] || cover || DEFAULT_IMAGE,
    gallery: gallery.length ? gallery : [DEFAULT_IMAGE],
    summaryAr: pickString(row, ['description_ar', 'description', 'summary_ar', 'details'], ''),
    summaryEn: pickString(row, ['description_en', 'summary_en'], pickString(row, ['description'], '')),
    status: pickString(row, ['status'], ''),
    views: pickNumber(row, ['views_count', 'views'], 0),
    contacts: pickNumber(row, ['contacts_count', 'contact_count'], 0),
    saves: pickNumber(row, ['saves_count', 'saved_count'], 0),
    isSponsored: row.is_sponsored === true || row.sponsored === true || row.featured === true,
    sponsorWeight: pickNumber(row, ['sponsor_weight', 'featured_weight', 'ad_weight'], 0),
    ownerId: pickString(row, ['user_id', 'owner_auth_id', 'user_auth_id', 'owner_id', 'created_by'], ''),
    ownerName: pickString(row, ['owner_name', 'user_name', 'seller_name'], ''),
    ownerAvatar: pickString(row, ['owner_avatar', 'avatar_url', 'user_avatar'], ''),
    ownerRole: pickString(row, ['owner_role', 'account_type'], ''),
    whatsapp: pickString(row, ['whatsapp', 'contact_whatsapp', 'phone', 'mobile'], ''),
    phone: pickString(row, ['phone', 'mobile', 'whatsapp'], ''),
    mapLat: pickNumber(row, ['map_lat', 'latitude', 'lat'], 0),
    mapLng: pickNumber(row, ['map_lng', 'longitude', 'lng'], 0),
    mapUrl: pickString(row, ['map_url', 'location_url'], ''),
    createdAt: pickString(row, ['created_at'], ''),
  };
}

async function getProjectImages(projectIds: string[]) {
  if (!projectIds.length) return new Map<string, string[]>();
  try {
    const { data, error } = await supabase
      .from('project_images')
      .select('project_id,image_url,url,path,is_cover,sort_order')
      .in('project_id', projectIds)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    const map = new Map<string, string[]>();
    for (const img of data || []) {
      const projectId = String((img as any).project_id || '');
      const url = pickString(img as any, ['image_url', 'url', 'path'], '');
      if (!projectId || !url) continue;
      const list = map.get(projectId) || [];
      if ((img as any).is_cover) list.unshift(url);
      else list.push(url);
      map.set(projectId, list);
    }
    return map;
  } catch (error) {
    console.warn('Project images unavailable:', error);
    return new Map<string, string[]>();
  }
}


function mapLanguage(row: Record<string, any>): DbLanguage {
  const code = normalizeCode(row.code, 'ar');
  return {
    code,
    nameAr: pickString(row, ['name_ar', 'nameAr', 'name'], code.toUpperCase()),
    nameEn: pickString(row, ['name_en', 'nameEn', 'name'], code.toUpperCase()),
    direction: row.direction === 'ltr' ? 'ltr' : 'rtl',
    isActive: row.is_active !== false,
    isDefault: row.is_default === true,
    sortOrder: pickNumber(row, ['sort_order', 'order'], code === 'ar' ? 1 : 2),
  };
}

export async function getLanguages(): Promise<DbLanguage[]> {
  const fallback: DbLanguage[] = [
    { code: 'ar', nameAr: 'العربية', nameEn: 'Arabic', direction: 'rtl', isActive: true, isDefault: true, sortOrder: 1 },
    { code: 'en', nameAr: 'الإنجليزية', nameEn: 'English', direction: 'ltr', isActive: true, isDefault: false, sortOrder: 2 },
  ];
  if (isPlaceholderSupabase) return fallback;
  try {
    const { data, error } = await supabase
      .from('platform_languages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    const mapped = (data || []).map(mapLanguage).filter((language) => language.isActive);
    if (mapped.length) return mapped;
  } catch (error) {
    console.warn('Falling back to local languages:', error);
  }
  return fallback;
}


export async function getUiTranslations(lang: string): Promise<UiTranslations> {
  const language = normalizeCode(lang, 'ar');
  if (isPlaceholderSupabase) return {};
  try {
    const { data, error } = await supabase
      .from('platform_translations')
      .select('namespace, translation_key, ar, en, is_active')
      .eq('is_active', true)
      .limit(2000);
    if (error) throw error;
    const result: UiTranslations = {};
    for (const row of data || []) {
      const namespace = pickString(row, ['namespace'], 'common');
      const key = pickString(row, ['translation_key', 'translationKey'], '');
      if (!key) continue;
      result[namespace] ||= {};
      result[namespace][key] = pickString(row, [language], '') || pickString(row, ['ar', 'en'], '');
    }
    return result;
  } catch (error) {
    console.warn('Falling back to local UI translations:', error);
    return {};
  }
}

export async function getCountries(): Promise<DbCountry[]> {
  if (isPlaceholderSupabase) return fallbackCountries.map((country) => ({ code: country.code, nameAr: country.nameAr, nameEn: country.nameEn, flag: country.flag, currency: country.currency, symbolAr: country.symbolAr, symbolEn: country.symbolEn, isActive: true, isDefault: country.code === 'om', sortOrder: country.code === 'om' ? 1 : 100 })) as any;
  try {
    const { data, error } = await supabase
      .from('platform_countries')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    const mapped = (data || []).map(mapCountry).filter((country) => country.isActive);
    if (mapped.length) return mapped;
  } catch (error) {
    console.warn('Falling back to local countries:', error);
  }

  return fallbackCountries.map((country) => ({
    code: country.code,
    nameAr: country.nameAr,
    nameEn: country.nameEn,
    flag: country.flag,
    currency: country.currency,
    symbolAr: country.symbolAr,
    symbolEn: country.symbolEn,
    isActive: true,
    isDefault: country.code === 'om',
    sortOrder: country.code === 'om' ? 1 : 100,
  }));
}

export async function getCountryByCode(code: string): Promise<DbCountry> {
  const list = await getCountries();
  return list.find((country) => country.code === normalizeCode(code)) || list.find((country) => country.isDefault) || list[0];
}

export async function getProjects(countryCode?: string, includeHidden = false, limit = 120): Promise<UiProject[]> {
  if (isPlaceholderSupabase) return [] as any;
  const country = countryCode ? normalizeCode(countryCode) : undefined;
  try {
    let query = supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(limit);
    if (country) query = query.eq('country_code', country);
    if (!includeHidden) query = query.in('status', ['approved', 'active', 'published']).neq('status', 'rejected');
    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    const imageMap = await getProjectImages(rows.map((row: any) => String(row.id || '')).filter(Boolean));
    const mapped = rows.map((row: any) => mapProject(row, imageMap.get(String(row.id)) || [])).filter((project) => includeHidden || ['approved', 'active', 'published'].includes(String(project.status || '').toLowerCase()));
    if (mapped.length) return mapped;
  } catch (error) {
    console.warn('Falling back to local projects:', error);
  }

  // Production-safe: do not show demo/fallback opportunities in the public UI.
  return [];
}


export async function getProjectsAdvanced(countryCode: string | undefined, rawParams: Record<string, string | string[] | undefined>, signals: InvestorSignals = {}) {
  const filters = parseSearchParams(rawParams);
  const list = await getProjects(countryCode, false, 180);
  return sortProjects(filterProjects(list, filters), filters.sort || 'smart', signals);
}

export async function getSponsoredProjects(countryCode?: string): Promise<UiProject[]> {
  const list = await getProjects(countryCode, false, 80);
  return list
    .filter((project) => project.isSponsored || Number(project.sponsorWeight || 0) > 0)
    .sort((a, b) => (Number(b.sponsorWeight || 0) + (b.verified ? 10 : 0)) - (Number(a.sponsorWeight || 0) + (a.verified ? 10 : 0)))
    .slice(0, 8);
}

export async function getProjectBySlug(identifier: string, includeHidden = false): Promise<UiProject | null> {
  const decoded = decodeURIComponent(identifier || '').trim();
  if (!decoded) return null;

  try {
    // Query carefully. If the identifier is a UUID, look up by id first.
    // If it is an old Arabic slug, skip the UUID query to avoid PostgREST 400 errors.
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded);
    const lookupQueue = uuidLike
      ? [
          supabase.from('projects').select('*').eq('id', decoded).maybeSingle(),
          supabase.from('projects').select('*').eq('slug', decoded).maybeSingle(),
        ]
      : [
          supabase.from('projects').select('*').eq('slug', decoded).maybeSingle(),
        ];

    for (const query of lookupQueue) {
      const { data, error } = await query;
      if (error) {
        console.warn('Project lookup query failed:', error.message);
        continue;
      }
      if (data) {
        const imageMap = await getProjectImages([String((data as any).id || '')]);
        const mapped = mapProject(data as any, imageMap.get(String((data as any).id)) || []);
        if (!includeHidden && !['approved', 'active', 'published'].includes(String(mapped.status || '').toLowerCase())) return null;
        return mapped;
      }
    }
  } catch (error) {
    console.warn('Project lookup failed, trying fallback:', error);
  }

  const all = await getProjects(undefined, includeHidden);
  const found = all.find((project) => project.slug === decoded || project.id === decoded) || null;
  if (!found) return null;
  if (!includeHidden && !['approved', 'active', 'published'].includes(String(found.status || '').toLowerCase())) return null;
  return found;
}

export function formatMoneyForCountry(amount: number, country: Pick<DbCountry, 'symbolAr' | 'symbolEn'> | undefined, lang: string) {
  const isArabic = lang === 'ar';
  const rawSymbol = isArabic ? (country?.symbolAr || 'ر.ع') : (country?.symbolEn || 'OMR');
  // Until the official Omani Rial sign is broadly supported by fonts/Unicode,
  // keep the platform using a compact rial mark with English numerals.
  const symbol = rawSymbol === 'OMR' || rawSymbol === 'ر.ع' ? (isArabic ? 'ر.ع' : 'OMR') : rawSymbol;
  const value = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount || 0);
  return isArabic ? `${symbol} ${value}` : `${value} ${symbol}`;
}

export function formatDate(value: string | undefined, lang: string) {
  if (!value) return lang === 'ar' ? 'حديثًا' : 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return lang === 'ar' ? 'حديثًا' : 'Recently';
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-OM-u-nu-latn' : 'en-US', { dateStyle: 'medium' }).format(date);
}


export type UiProjectDocument = {
  id: string;
  title: string;
  url: string;
  type?: string;
};

function mapProjectDocument(row: Record<string, any>): UiProjectDocument | null {
  const url = pickString(row, ['public_url', 'document_url', 'file_url', 'url', 'path'], '');
  if (!url) return null;
  return {
    id: pickString(row, ['id'], url),
    title: pickString(row, ['title', 'name', 'file_name', 'filename', 'document_type', 'type'], 'ملف مرفق'),
    url,
    type: pickString(row, ['document_type', 'type', 'mime_type'], ''),
  };
}

export async function getProjectDocuments(projectId?: string): Promise<UiProjectDocument[]> {
  if (!projectId || isPlaceholderSupabase) return [];

  const tables = [
    {
      name: 'project_documents',
      query: () => supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),
    },
    {
      name: 'upload_assets',
      query: () => supabase
        .from('upload_assets')
        .select('*')
        .eq('project_id', projectId)
        .in('bucket', ['project-documents', 'verification-docs'])
        .order('sort_order', { ascending: true }),
    },
  ];

  for (const table of tables) {
    try {
      const { data, error } = await table.query();
      if (error) throw error;
      const docs = (data || []).map((row: any) => mapProjectDocument(row)).filter(Boolean) as UiProjectDocument[];
      if (docs.length) return docs;
    } catch (error) {
      console.warn(`Project documents unavailable from ${table.name}:`, error);
    }
  }

  return [];
}


export type UiProjectQuestion = {
  id: string;
  question: string;
  answer: string;
  askerAuthId?: string;
  ownerAuthId?: string;
  createdAt?: string;
  answeredAt?: string;
};

function mapProjectQuestion(row: Record<string, any>): UiProjectQuestion | null {
  const question = pickString(row, ['question', 'body', 'content'], '');
  if (!question) return null;
  return {
    id: pickString(row, ['id'], ''),
    question,
    answer: pickString(row, ['answer', 'reply', 'owner_reply'], ''),
    askerAuthId: pickString(row, ['asker_auth_id', 'user_auth_id', 'created_by'], ''),
    ownerAuthId: pickString(row, ['owner_auth_id'], ''),
    createdAt: pickString(row, ['created_at'], ''),
    answeredAt: pickString(row, ['answered_at', 'updated_at'], ''),
  };
}

export async function getProjectQuestions(projectId?: string): Promise<UiProjectQuestion[]> {
  if (!projectId || isPlaceholderSupabase) return [];
  try {
    const { data, error } = await supabase
      .from('project_questions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => mapProjectQuestion(row)).filter(Boolean) as UiProjectQuestion[];
  } catch (error) {
    console.warn('Project questions unavailable:', error);
    return [];
  }
}


function mapSlide(row: Record<string, any>): UiSlide {
  return {
    id: pickString(row, ['id'], ''),
    titleAr: pickString(row, ['title_ar', 'title'], ''),
    titleEn: pickString(row, ['title_en', 'title'], ''),
    subtitleAr: pickString(row, ['subtitle_ar', 'subtitle'], ''),
    subtitleEn: pickString(row, ['subtitle_en', 'subtitle'], ''),
    buttonTextAr: pickString(row, ['button_text_ar'], ''),
    buttonTextEn: pickString(row, ['button_text_en'], ''),
    buttonUrl: pickString(row, ['button_url'], ''),
    imageUrl: pickString(row, ['image_url', 'media_url'], ''),
    countryCode: normalizeCode(row.country_code),
    isActive: row.is_active !== false,
    slideOrder: pickNumber(row, ['slide_order', 'sort_order'], 100),
  };
}

function mapAd(row: Record<string, any>): UiAd {
  return {
    id: pickString(row, ['id'], ''),
    title: pickString(row, ['title', 'name'], ''),
    placement: pickString(row, ['placement', 'position'], 'home_top'),
    imageUrl: pickString(row, ['image_url', 'banner_url', 'media_url'], ''),
    linkUrl: pickString(row, ['link_url', 'url', 'target_url'], ''),
    countryCode: normalizeCode(row.country_code),
    isActive: row.is_active !== false,
    sortOrder: pickNumber(row, ['sort_order'], 100),
  };
}



export type UiProjectRating = {
  id: string;
  reviewerAuthId?: string;
  reviewedAuthId?: string;
  projectId?: string;
  rating: number;
  comment?: string;
  status?: string;
  createdAt?: string;
};

function mapProjectRating(row: Record<string, any>): UiProjectRating {
  return {
    id: pickString(row, ['id'], ''),
    reviewerAuthId: pickString(row, ['reviewer_auth_id'], ''),
    reviewedAuthId: pickString(row, ['reviewed_auth_id'], ''),
    projectId: pickString(row, ['project_id'], ''),
    rating: pickNumber(row, ['rating'], 0),
    comment: pickString(row, ['comment'], ''),
    status: pickString(row, ['status'], 'published'),
    createdAt: pickString(row, ['created_at'], ''),
  };
}

export async function getProjectRatings(projectId?: string): Promise<UiProjectRating[]> {
  if (!projectId || isPlaceholderSupabase) return [];
  try {
    const { data, error } = await supabase
      .from('deal_ratings')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data || []).map((row: any) => mapProjectRating(row));
  } catch (error) {
    console.warn('Project ratings unavailable:', error);
    return [];
  }
}

export async function getHomepageSlides(countryCode?: string): Promise<UiSlide[]> {
  if (isPlaceholderSupabase) return [] as any;
  const country = countryCode ? normalizeCode(countryCode) : undefined;
  try {
    let query = supabase
      .from('homepage_slides')
      .select('*')
      .eq('is_active', true)
      .order('slide_order', { ascending: true });
    if (country) query = query.or(`country_code.eq.${country},country_code.is.null,country_code.eq.`);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapSlide).filter((slide) => slide.isActive);
  } catch (error) {
    console.warn('Homepage slides unavailable:', error);
    return [];
  }
}

export async function getPlatformAds(countryCode?: string, placement?: string): Promise<UiAd[]> {
  if (isPlaceholderSupabase) return [] as any;
  const country = countryCode ? normalizeCode(countryCode) : undefined;
  try {
    let query = supabase
      .from('platform_ads')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (country) query = query.or(`country_code.eq.${country},country_code.is.null,country_code.eq.`);
    if (placement) query = query.eq('placement', placement);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapAd).filter((ad) => ad.isActive && ad.imageUrl);
  } catch (error) {
    console.warn('Platform ads unavailable:', error);
    return [];
  }
}


function mapSector(row: Record<string, any>, counts?: Map<string, number>): UiSector {
  const key = pickString(row, ['key', 'slug', 'code'], pickString(row, ['name_en', 'name'], 'sector')).toLowerCase().replace(/[^a-z0-9_\-]+/g, '_');
  return {
    id: pickString(row, ['id'], ''),
    key,
    nameAr: pickString(row, ['name_ar', 'title_ar', 'name'], key),
    nameEn: pickString(row, ['name_en', 'title_en', 'name'], key),
    icon: pickString(row, ['icon', 'emoji', 'symbol'], '◇'),
    imageUrl: pickString(row, ['image_url', 'image', 'icon_url'], ''),
    countryCode: normalizeCode(row.country_code),
    isActive: row.is_active !== false,
    sortOrder: pickNumber(row, ['sort_order', 'order'], 100),
    projectCount: counts?.get(key) || 0,
  };
}

export async function getSectors(countryCode?: string): Promise<UiSector[]> {
  if (isPlaceholderSupabase) return [] as any;
  const country = countryCode ? normalizeCode(countryCode) : undefined;
  try {
    let query = supabase.from('platform_sectors').select('*').eq('is_active', true).order('sort_order', { ascending: true });
    if (country) query = query.or(`country_code.eq.${country},country_code.is.null,country_code.eq.`);
    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    if (!rows.length) return [];
    const projects = await getProjects(country, false, 500);
    const counts = new Map<string, number>();
    for (const project of projects) counts.set(String(project.category || '').toLowerCase(), (counts.get(String(project.category || '').toLowerCase()) || 0) + 1);
    return rows.map((row: any) => mapSector(row, counts)).filter((sector) => sector.isActive);
  } catch (error) {
    console.warn('Platform sectors unavailable:', error);
    return [];
  }
}

export async function getPlatformSetting(key: string, fallback = ''): Promise<string> {
  if (isPlaceholderSupabase) return fallback;
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) throw error;
    return String((data as any)?.value ?? fallback);
  } catch (error) {
    return fallback;
  }
}

export async function isHomepageSliderEnabled(): Promise<boolean> {
  const value = (await getPlatformSetting('homepage_slider_enabled', 'true')).toLowerCase();
  return !['false', '0', 'off', 'disabled'].includes(value);
}


export type UiUserProfile = {
  id: string;
  authId: string;
  slug: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  avatarUrl: string;
  bio: string;
  location: string;
  skills: string[];
  profileViewsCount: number;
  role: string;
  accountType: string;
  plan: string;
  verificationStatus: string;
  averageRating: number;
  ratingsCount: number;
  trustScore: number;
  followersCount: number;
  projectsCount: number;
  createdAt: string;
};

function normalizeAccountType(row: Record<string, any>) {
  const raw = pickString(row, ['account_type', 'type', 'role'], 'investor').toLowerCase();
  if (raw.includes('both') || raw.includes('owner_investor')) return 'both';
  if (raw.includes('owner') || raw.includes('seller')) return 'owner';
  if (raw.includes('admin') || raw.includes('super_admin')) return pickString(row, ['account_type'], 'both') || 'both';
  return 'investor';
}

function mapUserProfile(row: Record<string, any>, followersCount = 0, projectsCount = 0): UiUserProfile {
  const authId = pickString(row, ['auth_id', 'authId'], '');
  const id = pickString(row, ['id'], authId);
  const slug = pickString(row, ['profile_slug', 'slug', 'username'], '') || authId || id;
  const email = pickString(row, ['email'], '');
  const name = pickString(row, ['name', 'full_name', 'display_name', 'company_name'], '') || (email ? email.split('@')[0] : 'مستخدم');
  const accountType = normalizeAccountType(row);
  return {
    id,
    authId,
    slug,
    name,
    email,
    phone: pickString(row, ['phone', 'mobile'], ''),
    whatsapp: pickString(row, ['whatsapp', 'phone', 'mobile'], ''),
    avatarUrl: pickString(row, ['avatar_url', 'photo_url', 'image_url'], ''),
    bio: pickString(row, ['bio', 'about', 'description'], ''),
    location: pickString(row, ['location', 'city', 'governorate', 'country'], ''),
    skills: Array.isArray(row.skills) ? row.skills : (Array.isArray(row.preferred_categories) ? row.preferred_categories : []),
    profileViewsCount: pickNumber(row, ['profile_views_count', 'views_count'], 0),
    role: pickString(row, ['role'], accountType),
    accountType,
    plan: pickString(row, ['plan', 'subscription_status', 'package_code'], 'free'),
    verificationStatus: pickString(row, ['verification_status', 'kyc_status'], ''),
    averageRating: pickNumber(row, ['average_rating', 'rating_avg'], 0),
    ratingsCount: pickNumber(row, ['ratings_count', 'reviews_count'], 0),
    trustScore: pickNumber(row, ['trust_score'], 0),
    followersCount,
    projectsCount,
    createdAt: pickString(row, ['created_at'], ''),
  };
}

export function roleLabel(accountType: string, lang = 'ar') {
  const value = String(accountType || '').toLowerCase();
  if (value === 'both') return lang === 'ar' ? 'مستثمر وصاحب مشروع' : 'Investor & project owner';
  if (value === 'owner') return lang === 'ar' ? 'صاحب مشروع' : 'Project owner';
  if (value === 'investor') return lang === 'ar' ? 'مستثمر' : 'Investor';
  if (value.includes('admin')) return lang === 'ar' ? 'إدارة المنصة' : 'Platform admin';
  return lang === 'ar' ? 'مستخدم' : 'User';
}

export async function getUserProfileById(identifier: string): Promise<UiUserProfile | null> {
  if (isPlaceholderSupabase) return null;
  const value = decodeURIComponent(identifier || '').trim();
  if (!value) return null;
  try {
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    const queries: any[] = [];
    if (uuidLike) {
      queries.push(supabase.from('public_user_profiles_view').select('*').eq('auth_id', value).maybeSingle());
      queries.push(supabase.from('public_user_profiles_view').select('*').eq('id', value).maybeSingle());
      queries.push(supabase.from('users').select('*').eq('auth_id', value).maybeSingle());
      queries.push(supabase.from('users').select('*').eq('id', value).maybeSingle());
    }
    queries.push(supabase.from('public_user_profiles_view').select('*').eq('profile_slug', value).maybeSingle());
    queries.push(supabase.from('public_user_profiles_view').select('*').eq('email', value).maybeSingle());
    queries.push(supabase.from('users').select('*').eq('profile_slug', value).maybeSingle());
    queries.push(supabase.from('users').select('*').eq('email', value).maybeSingle());

    for (const query of queries) {
      const { data, error } = await query;
      if (error) continue;
      if (data) {
        const authId = pickString(data as any, ['auth_id'], pickString(data as any, ['id'], ''));
        const [followersCount, projectsCount] = await Promise.all([getUserFollowersCount(authId), getUserProjectsCount(authId)]);
        return mapUserProfile(data as any, followersCount, projectsCount);
      }
    }
  } catch (error) {
    console.warn('User profile lookup failed:', error);
  }
  return null;
}

export async function getUserProjects(ownerId: string, countryCode?: string, limit = 60): Promise<UiProject[]> {
  if (!ownerId || isPlaceholderSupabase) return [];
  try {
    const country = countryCode ? normalizeCode(countryCode) : undefined;
    let query = supabase
      .from('projects')
      .select('*')
      .or(`owner_auth_id.eq.${ownerId},user_auth_id.eq.${ownerId},user_id.eq.${ownerId},created_by.eq.${ownerId},owner_id.eq.${ownerId}`)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (country) query = query.eq('country_code', country);
    const { data, error } = await query;
    if (error) throw error;
    const blockedStatuses = new Set(['rejected', 'deleted', 'hidden', 'trash']);
    const rows = (data || []).filter((row: any) => !blockedStatuses.has(String(row.status || '').toLowerCase()));
    const imageMap = await getProjectImages(rows.map((row: any) => String(row.id || '')).filter(Boolean));
    return rows.map((row: any) => mapProject(row, imageMap.get(String(row.id)) || []));
  } catch (error) {
    console.warn('User projects unavailable:', error);
    return [];
  }
}

async function getUserProjectsCount(ownerId: string): Promise<number> {
  if (!ownerId || isPlaceholderSupabase) return 0;
  try {
    const { count, error } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .or(`owner_auth_id.eq.${ownerId},user_auth_id.eq.${ownerId},user_id.eq.${ownerId},created_by.eq.${ownerId},owner_id.eq.${ownerId}`)
      .not('status', 'in', '(rejected,deleted,hidden,trash)');
    if (error) throw error;
    return count || 0;
  } catch {
    return 0;
  }
}

export async function getUserFollowersCount(profileAuthId: string): Promise<number> {
  if (!profileAuthId || isPlaceholderSupabase) return 0;
  try {
    const { count, error } = await supabase
      .from('user_followers')
      .select('id', { count: 'exact', head: true })
      .eq('following_auth_id', profileAuthId);
    if (error) throw error;
    return count || 0;
  } catch {
    return 0;
  }
}

export type UiUserRating = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewerName: string;
  projectTitle: string;
};

export async function getUserRatings(profileAuthId: string): Promise<UiUserRating[]> {
  if (!profileAuthId || isPlaceholderSupabase) return [];
  const sources = [
    { table: 'deal_ratings', userCol: 'reviewed_auth_id', ratingCol: 'rating', statusCol: 'status' },
    { table: 'ratings', userCol: 'reviewed_user_id', ratingCol: 'rating', statusCol: 'status' },
    { table: 'ratings', userCol: 'reviewed_auth_id', ratingCol: 'rating', statusCol: 'status' },
    { table: 'user_ratings', userCol: 'reviewed_auth_id', ratingCol: 'rating', statusCol: 'status' },
  ];
  for (const src of sources) {
    try {
      const query = supabase.from(src.table).select('*').eq(src.userCol, profileAuthId).order('created_at', { ascending: false }).limit(12);
      const { data, error } = await query;
      if (error) throw error;
      const ratings = (data || []).filter((row: any) => !row.status || ['published', 'approved', 'active'].includes(String(row.status).toLowerCase()));
      if (!ratings.length) continue;
      const reviewerIds = Array.from(new Set(ratings.map((r: any) => String(r.reviewer_auth_id || r.reviewer_user_id || r.user_auth_id || '').trim()).filter(Boolean)));
      const projectIds = Array.from(new Set(ratings.map((r: any) => String(r.project_id || '').trim()).filter(Boolean)));
      const reviewerMap = new Map<string, string>();
      const projectMap = new Map<string, string>();
      if (reviewerIds.length) {
        const { data: users } = await supabase.from('users').select('*').in('auth_id', reviewerIds);
        for (const user of users || []) reviewerMap.set(String((user as any).auth_id || ''), pickString(user as any, ['name', 'full_name', 'email'], 'مستخدم'));
      }
      if (projectIds.length) {
        const { data: projects } = await supabase.from('projects').select('*').in('id', projectIds);
        for (const project of projects || []) projectMap.set(String((project as any).id || ''), pickString(project as any, ['title_ar', 'title', 'project_title'], 'مشروع'));
      }
      return ratings.map((row: any) => ({
        id: String(row.id || ''),
        rating: Math.max(1, Math.min(5, Number(row.rating || row.stars || 0))),
        comment: String(row.comment || row.review || row.body || ''),
        createdAt: String(row.created_at || ''),
        reviewerName: reviewerMap.get(String(row.reviewer_auth_id || row.reviewer_user_id || row.user_auth_id || '')) || pickString(row, ['reviewer_name', 'name'], 'مستخدم'),
        projectTitle: projectMap.get(String(row.project_id || '')) || pickString(row, ['project_title', 'title'], 'مشروع'),
      }));
    } catch (error) {
      console.warn(`User ratings unavailable from ${src.table}:`, error);
    }
  }
  return [];
}

