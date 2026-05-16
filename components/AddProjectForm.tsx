'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, CreditCard, FileText, ImagePlus, Loader2, LockKeyhole, MapPin, Megaphone, Navigation, ShieldCheck, Sparkles, UploadCloud, Wand2, Video, X } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useI18n } from '@/components/I18nProvider';

type FormState = {
  title: string;
  description: string;
  category: string;
  opportunityType: string;
  governorate: string;
  city: string;
  price: string;
  monthlyProfit: string;
  roi: string;
  fundingAmount: string;
  fundingPercent: string;
  partnershipShare: string;
  franchiseFee: string;
  employeesCount: string;
  operatingYears: string;
  paybackMonths: string;
  phoneCountryCode: string;
  phone: string;
  whatsappCountryCode: string;
  whatsapp: string;
  mapLat: string;
  mapLng: string;
};

type ImagePreview = {
  file?: File;
  url: string;
  isCover: boolean;
  id?: string;
  existing?: boolean;
};

type ProjectDocument = {
  file?: File;
  kind: string;
  note: string;
  id?: string;
  name?: string;
  url?: string;
  existing?: boolean;
};

type ProjectVideo = {
  file?: File;
  url: string;
  id?: string;
  existing?: boolean;
  name?: string;
};

type SectorOption = { id?: string; value: string; ar: string; en: string; icon?: string; imageUrl?: string };

const fallbackCategories = [
  { value: 'restaurants', ar: 'مطاعم وكافيهات', en: 'Restaurants & Cafes' },
  { value: 'retail', ar: 'تجارة وتجزئة', en: 'Retail' },
  { value: 'beauty', ar: 'تجميل وعناية', en: 'Beauty' },
  { value: 'services', ar: 'خدمات', en: 'Services' },
  { value: 'technology', ar: 'تقنية وتطبيقات', en: 'Technology' },
  { value: 'real_estate', ar: 'عقارات وضيافة', en: 'Real estate' },
  { value: 'manufacturing', ar: 'صناعة وإنتاج', en: 'Manufacturing' },
];

const opportunityTypes = [
  { value: 'sale', ar: 'بيع مشروع', en: 'Business sale' },
  { value: 'partnership', ar: 'شراكة', en: 'Partnership' },
  { value: 'funding', ar: 'تمويل', en: 'Funding' },
  { value: 'franchise', ar: 'امتياز', en: 'Franchise' },
];


const countryDialCodes = [
  { country: 'om', code: '+968', labelAr: 'عُمان', labelEn: 'Oman' },
  { country: 'ae', code: '+971', labelAr: 'الإمارات', labelEn: 'UAE' },
  { country: 'sa', code: '+966', labelAr: 'السعودية', labelEn: 'Saudi Arabia' },
  { country: 'qa', code: '+974', labelAr: 'قطر', labelEn: 'Qatar' },
  { country: 'kw', code: '+965', labelAr: 'الكويت', labelEn: 'Kuwait' },
  { country: 'bh', code: '+973', labelAr: 'البحرين', labelEn: 'Bahrain' },
  { country: 'ye', code: '+967', labelAr: 'اليمن', labelEn: 'Yemen' },
  { country: 'jo', code: '+962', labelAr: 'الأردن', labelEn: 'Jordan' },
  { country: 'eg', code: '+20', labelAr: 'مصر', labelEn: 'Egypt' },
  { country: 'iq', code: '+964', labelAr: 'العراق', labelEn: 'Iraq' },
  { country: 'sy', code: '+963', labelAr: 'سوريا', labelEn: 'Syria' },
  { country: 'lb', code: '+961', labelAr: 'لبنان', labelEn: 'Lebanon' },
  { country: 'tr', code: '+90', labelAr: 'تركيا', labelEn: 'Turkey' },
  { country: 'us', code: '+1', labelAr: 'أمريكا', labelEn: 'USA' },
];

function getDefaultDialCode(country: string) {
  return countryDialCodes.find((item) => item.country === country.toLowerCase())?.code || '+968';
}

function digitsOnly(value: string) {
  return String(value || '').replace(/\D+/g, '');
}

function decimalOnly(value: string) {
  return String(value || '').replace(/[^0-9.\-]+/g, '').replace(/(?!^)-/g, '').replace(/(\..*)\./g, '$1');
}

function formatPhoneWithCode(code: string, localNumber: string) {
  const cleanCode = String(code || '+968').trim().startsWith('+') ? String(code || '+968').trim() : `+${digitsOnly(code)}`;
  const cleanLocal = digitsOnly(localNumber);
  return cleanLocal ? `${cleanCode}${cleanLocal}` : '';
}

function splitPhoneNumber(value: string, fallbackCode: string) {
  const raw = String(value || '').trim();
  const matched = countryDialCodes
    .slice()
    .sort((a, b) => b.code.length - a.code.length)
    .find((item) => raw.replace(/\s+/g, '').startsWith(item.code));
  const code = matched?.code || fallbackCode;
  const local = digitsOnly(matched ? raw.replace(matched.code, '') : raw);
  return { code, local };
}

const countryLocations: Record<string, { ar: string; en: string; cities: string[] }[]> = {
  om: [
    { ar: 'مسقط', en: 'Muscat', cities: ['مسقط', 'السيب', 'بوشر', 'مطرح', 'العامرات', 'قريات'] },
    { ar: 'ظفار', en: 'Dhofar', cities: ['صلالة', 'طاقة', 'مرباط', 'ثمريت', 'سدح'] },
    { ar: 'شمال الباطنة', en: 'North Al Batinah', cities: ['صحار', 'شناص', 'لوى', 'صحم', 'الخابورة', 'السويق'] },
    { ar: 'جنوب الباطنة', en: 'South Al Batinah', cities: ['الرستاق', 'بركاء', 'المصنعة', 'نخل', 'العوابي'] },
    { ar: 'الداخلية', en: 'Al Dakhiliyah', cities: ['نزوى', 'بهلاء', 'الحمراء', 'أدم', 'إزكي', 'سمائل'] },
    { ar: 'شمال الشرقية', en: 'North Ash Sharqiyah', cities: ['إبراء', 'المضيبي', 'بدية', 'القابل', 'وادي بني خالد'] },
    { ar: 'جنوب الشرقية', en: 'South Ash Sharqiyah', cities: ['صور', 'جعلان بني بو علي', 'جعلان بني بو حسن', 'الكامل والوافي'] },
    { ar: 'الظاهرة', en: 'Ad Dhahirah', cities: ['عبري', 'ينقل', 'ضنك'] },
    { ar: 'البريمي', en: 'Al Buraimi', cities: ['البريمي', 'محضة', 'السنينة'] },
    { ar: 'الوسطى', en: 'Al Wusta', cities: ['هيما', 'الدقم', 'محوت', 'الجازر'] },
    { ar: 'مسندم', en: 'Musandam', cities: ['خصب', 'دبا', 'بخا', 'مدحاء'] },
  ],
  qa: [
    { ar: 'الدوحة', en: 'Doha', cities: ['الدوحة', 'الريان', 'الوكرة', 'لوسيل', 'الخور'] },
    { ar: 'الريان', en: 'Al Rayyan', cities: ['الريان', 'الشحانية', 'معيذر'] },
  ],
  sa: [
    { ar: 'الرياض', en: 'Riyadh', cities: ['الرياض', 'الدرعية', 'الخرج'] },
    { ar: 'مكة المكرمة', en: 'Makkah', cities: ['جدة', 'مكة', 'الطائف'] },
    { ar: 'الشرقية', en: 'Eastern Province', cities: ['الدمام', 'الخبر', 'الظهران', 'الأحساء'] },
  ],
  ae: [
    { ar: 'دبي', en: 'Dubai', cities: ['دبي', 'جبل علي', 'ديرة'] },
    { ar: 'أبوظبي', en: 'Abu Dhabi', cities: ['أبوظبي', 'العين', 'الظفرة'] },
    { ar: 'الشارقة', en: 'Sharjah', cities: ['الشارقة', 'خورفكان', 'كلباء'] },
  ],
};

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
function toNumber(value: string) {
  const cleaned = String(value || '').replace(/,/g, '').trim();
  if (!cleaned) return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}


async function compressImage(file: File, maxSize = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
  if (!blob) return file;
  const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
  return new File([blob], name, { type: 'image/webp' });
}

function moveItem<T>(list: T[], from: number, to: number) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next.map((entry: any, index) => ({ ...entry, isCover: index === 0 ? true : entry.isCover && index === 0 }));
}

function getMissingColumn(message: string) {
  const patterns = [
    /column ['"]?([^'"\s]+)['"]? of relation/i,
    /Could not find the ['"]([^'"]+)['"] column/i,
    /Could not find column ['"]([^'"]+)['"]/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function getNotNullColumn(message: string) {
  const match = message.match(/null value in column ['"]([^'"]+)['"]/i);
  return match?.[1] || null;
}

function fillRequiredProjectColumn(current: Record<string, unknown>, column: string, userId?: string) {
  const title = String(current.title || current.name || current.title_ar || 'مشروع جديد');
  const description = String(current.description || current.description_ar || 'تفاصيل المشروع متاحة عند التواصل مع صاحب المشروع.');
  const map: Record<string, unknown> = {
    title,
    name: title,
    title_ar: title,
    title_en: title,
    description,
    description_ar: description,
    description_en: description,
    category: current.category || current.sector || 'services',
    sector: current.sector || current.category || 'services',
    status: current.status || 'approved',
    moderation_status: current.moderation_status || current.status || 'approved',
    publish_status: current.publish_status || current.status || 'approved',
    approval_status: current.approval_status || 'auto_approved',
    country_code: current.country_code || 'om',
    slug: current.slug || `project-${Date.now().toString(36)}`,
    price: current.price || 0,
    roi: current.roi || 0,
    monthly_profit: current.monthly_profit || 0,
    is_active: current.is_active ?? true,
    is_verified: current.is_verified ?? false,
    verification_status: current.verification_status || 'pending',
    owner_auth_id: userId || current.owner_auth_id || current.user_auth_id || current.auth_id || current.created_by || null,
    user_auth_id: userId || current.user_auth_id || current.owner_auth_id || current.auth_id || current.created_by || null,
    auth_id: userId || current.auth_id || current.user_auth_id || current.owner_auth_id || current.created_by || null,
    user_id: userId || current.user_id || current.user_auth_id || current.owner_auth_id || current.auth_id || null,
    owner_id: userId || current.owner_id || current.user_auth_id || current.owner_auth_id || current.auth_id || null,
    created_by: userId || current.created_by || current.user_auth_id || current.owner_auth_id || current.auth_id || null,
  };

  if (Object.prototype.hasOwnProperty.call(map, column)) {
    current[column] = map[column];
    return true;
  }
  return false;
}


function normalizePlan(plan?: string) {
  return String(plan || 'free').toLowerCase().replace(/\s+/g, '_');
}

function canVerifyProjects(plan?: string) {
  return ['growth', 'pro', 'business', 'premium', 'elite', 'owner_pro', 'owner_business'].includes(normalizePlan(plan));
}

async function insertRowWithFallback(table: string, payload: Record<string, unknown>) {
  const current = { ...payload };
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await supabaseBrowser.from(table).insert(current).select('*').maybeSingle();
    if (!error) return data;
    const message = [error.message, (error as { details?: string }).details, (error as { hint?: string }).hint].filter(Boolean).join(' ');
    const missing = getMissingColumn(message);
    if (missing && Object.prototype.hasOwnProperty.call(current, missing)) {
      delete current[missing];
      continue;
    }
    throw error;
  }
  throw new Error('تعذر حفظ الطلب بسبب توافق أعمدة قاعدة البيانات.');
}

async function uploadVerificationDocument(file: File, userId: string, projectId: string) {
  const bucket = process.env.NEXT_PUBLIC_VERIFICATION_BUCKET || 'verification-docs';
  const ext = file.name.split('.').pop() || 'pdf';
  const safeName = `project-${projectId}-${Date.now()}.${ext}`.replace(/[^a-zA-Z0-9.-]/g, '');
  const path = `${userId}/${safeName}`;
  const { error } = await supabaseBrowser.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(`فشل رفع ملف التوثيق: ${error.message}`);
  const { data } = supabaseBrowser.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

async function insertProjectWithFallback(payload: Record<string, unknown>, userId?: string) {
  const current = { ...payload };
  const removed: string[] = [];

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await supabaseBrowser
      .from('projects')
      .insert(current)
      .select('id, slug')
      .single();

    if (!error) return { data, removed };

    const message = [error.message, (error as { details?: string }).details, (error as { hint?: string }).hint]
      .filter(Boolean)
      .join(' ');
    const missing = getMissingColumn(message);

    if (missing && Object.prototype.hasOwnProperty.call(current, missing)) {
      delete current[missing];
      removed.push(missing);
      continue;
    }

    const notNull = getNotNullColumn(message);
    if (notNull && fillRequiredProjectColumn(current, notNull, userId)) {
      continue;
    }

    throw error;
  }

  throw new Error('تعذر حفظ المشروع بعد عدة محاولات توافق مع أعمدة قاعدة البيانات.');
}


async function updateProjectWithFallback(projectId: string, payload: Record<string, unknown>, userId?: string) {
  const current = { ...payload };
  const removed: string[] = [];

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await supabaseBrowser
      .from('projects')
      .update(current)
      .eq('id', projectId)
      .select('id, slug')
      .single();

    if (!error) return { data, removed };

    const message = [error.message, (error as { details?: string }).details, (error as { hint?: string }).hint]
      .filter(Boolean)
      .join(' ');
    const missing = getMissingColumn(message);

    if (missing && Object.prototype.hasOwnProperty.call(current, missing)) {
      delete current[missing];
      removed.push(missing);
      continue;
    }

    const notNull = getNotNullColumn(message);
    if (notNull && fillRequiredProjectColumn(current, notNull, userId)) {
      continue;
    }

    throw error;
  }

  throw new Error('تعذر تحديث المشروع بعد عدة محاولات توافق مع أعمدة قاعدة البيانات.');
}

async function uploadProjectImages(files: ImagePreview[], userId: string) {
  const uploaded: { url: string; isCover: boolean; sortOrder: number }[] = [];
  files = files.filter((item) => item.file);
  const bucket = process.env.NEXT_PUBLIC_PROJECT_IMAGES_BUCKET || 'project-images';

  for (const [index, image] of files.entries()) {
    const optimizedFile = await compressImage(image.file as File);
    const ext = optimizedFile.name.split('.').pop() || 'webp';
    const safeName = `${Date.now()}-${index}.${ext}`.replace(/[^a-zA-Z0-9.-]/g, '');
    const path = `${userId}/${safeName}`;

    const { error } = await supabaseBrowser.storage
      .from(bucket)
      .upload(path, optimizedFile, { cacheControl: '31536000', upsert: false, contentType: optimizedFile.type || 'image/webp' });

    if (error) throw new Error(`فشل رفع الصورة: ${error.message}`);

    const { data } = supabaseBrowser.storage.from(bucket).getPublicUrl(path);
    uploaded.push({ url: data.publicUrl, isCover: image.isCover, sortOrder: index });
  }

  return uploaded;
}

async function insertProjectImages(projectId: string, images: { url: string; isCover: boolean; sortOrder: number }[]) {
  if (!projectId || !images.length) return;

  const rows = images.map((image) => ({
    project_id: projectId,
    image_url: image.url,
    is_cover: image.isCover,
    sort_order: image.sortOrder,
  }));

  const { error } = await supabaseBrowser.from('project_images').insert(rows);
  if (error) {
    console.warn('project_images insert failed:', error);
  }
}

async function uploadProjectVideos(files: ProjectVideo[], userId: string, projectId: string) {
  const uploaded: { url: string; sortOrder: number; name: string }[] = [];
  const bucket = process.env.NEXT_PUBLIC_PROJECT_VIDEOS_BUCKET || 'project-videos';
  const newFiles = files.filter((item) => item.file);
  for (const [index, item] of newFiles.entries()) {
    const file = item.file as File;
    const ext = file.name.split('.').pop() || 'mp4';
    const safeName = `project-video-${projectId}-${Date.now()}-${index}.${ext}`.replace(/[^a-zA-Z0-9.-]/g, '');
    const path = `${userId}/${projectId}/${safeName}`;
    const { error } = await supabaseBrowser.storage.from(bucket).upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type || 'video/mp4' });
    if (error) throw new Error(`فشل رفع الفيديو: ${error.message}`);
    const { data } = supabaseBrowser.storage.from(bucket).getPublicUrl(path);
    uploaded.push({ url: data.publicUrl, sortOrder: index, name: file.name });
  }
  return uploaded;
}

async function insertProjectVideos(projectId: string, videos: { url: string; sortOrder: number; name: string }[]) {
  if (!projectId || !videos.length) return;
  const rows = videos.map((video) => ({ project_id: projectId, video_url: video.url, file_url: video.url, file_name: video.name, title: video.name, sort_order: video.sortOrder, is_active: true }));
  const { error } = await supabaseBrowser.from('project_videos').insert(rows);
  if (error) console.warn('project_videos insert failed:', error);
}

async function getProjectPublishMode() {
  try {
    const { data, error } = await supabaseBrowser
      .from('platform_settings')
      .select('key,value,setting_key,setting_value')
      .or('key.eq.project_publish_mode,setting_key.eq.project_publish_mode')
      .maybeSingle();

    if (error || !data) return 'auto';

    const raw = (data as any)?.setting_value ?? (data as any)?.value ?? 'auto';
    let mode = 'auto';

    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        mode = String(parsed?.mode || parsed?.value || raw).toLowerCase();
      } catch {
        mode = raw.toLowerCase();
      }
    } else if (raw && typeof raw === 'object') {
      mode = String((raw as any).mode || (raw as any).value || 'auto').toLowerCase();
    }

    return ['manual', 'review', 'pending', 'admin'].includes(mode) ? 'manual' : 'auto';
  } catch {
    return 'auto';
  }
}

export function AddProjectForm({ country, lang, editProjectId: editProjectIdProp, onSaved }: { country: string; lang: string; editProjectId?: string; onSaved?: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editProjectId = editProjectIdProp || searchParams.get('edit') || '';
  const isEditing = Boolean(editProjectId);
  const isAr = lang === 'ar';
  const { t } = useI18n();
  const normalizedCountry = country.toLowerCase();
  const locations = countryLocations[normalizedCountry] || countryLocations.om;
  const defaultDialCode = getDefaultDialCode(normalizedCountry);
  const [sectorOptions, setSectorOptions] = useState<SectorOption[]>(fallbackCategories);

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    category: 'services',
    opportunityType: 'sale',
    governorate: locations[0]?.ar || '',
    city: locations[0]?.cities[0] || '',
    price: '',
    monthlyProfit: '',
    roi: '',
    fundingAmount: '',
    fundingPercent: '',
    partnershipShare: '',
    franchiseFee: '',
    employeesCount: '',
    operatingYears: '',
    paybackMonths: '',
    phoneCountryCode: defaultDialCode,
    phone: '',
    whatsappCountryCode: defaultDialCode,
    whatsapp: '',
    mapLat: '',
    mapLng: '',
  });
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdProjectId, setCreatedProjectId] = useState('');
  const [showPromotionUpsell, setShowPromotionUpsell] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);
  const [userPlan, setUserPlan] = useState('free');
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [verificationRequested, setVerificationRequested] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([]);
  const [projectVideos, setProjectVideos] = useState<ProjectVideo[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [removedDocumentIds, setRemovedDocumentIds] = useState<string[]>([]);
  const [removedVideoIds, setRemovedVideoIds] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    async function loadUserPlan() {
      try {
        const { data } = await supabaseBrowser.auth.getUser();
        const userId = data.user?.id;
        if (!userId) return;
        const { data: profile } = await supabaseBrowser.from('users').select('subscription_status,plan').eq('auth_id', userId).maybeSingle();
        if (mounted) setUserPlan(String((profile as any)?.subscription_status || (profile as any)?.plan || 'free'));
      } catch (error) {
        console.warn('Plan lookup skipped:', error);
      }
    }
    void loadUserPlan();
    return () => { mounted = false; };
  }, []);



  useEffect(() => {
    let mounted = true;
    async function loadSectors() {
      try {
        const tables = ['platform_sectors', 'platform_categories', 'project_categories', 'categories'];
        let rows: any[] = [];
        for (const table of tables) {
          const result = await supabaseBrowser
            .from(table)
            .select('id,key,slug,code,name_ar,title_ar,name_en,title_en,name,icon,emoji,image_url,is_active,sort_order,country_code')
            .order('sort_order', { ascending: true });
          if (!result.error && result.data?.length) { rows = result.data as any[]; break; }
        }
        const mapped = (rows || [])
          .filter((row: any) => row.is_active !== false)
          .filter((row: any) => !row.country_code || String(row.country_code).toLowerCase() === normalizedCountry)
          .map((row: any) => ({
            id: String(row.id || ''),
            value: String(row.key || row.slug || row.code || row.id || row.name_en || row.name || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '_'),
            ar: String(row.name_ar || row.title_ar || row.name || row.name_en || 'قطاع'),
            en: String(row.name_en || row.title_en || row.name || row.name_ar || 'Sector'),
            icon: String(row.icon || row.emoji || '◇'),
            imageUrl: String(row.image_url || ''),
          }))
          .filter((item: SectorOption) => item.value);
        if (mounted && mapped.length) {
          setSectorOptions(mapped);
          setForm((prev) => mapped.some((item: SectorOption) => item.value === prev.category) ? prev : { ...prev, category: mapped[0].value });
        }
      } catch (error) {
        console.warn('Sectors fallback:', error);
      }
    }
    void loadSectors();
    return () => { mounted = false; };
  }, [normalizedCountry]);

  useEffect(() => {
    if (!editProjectId) return;
    let mounted = true;
    async function loadProjectForEdit() {
      setLoadingProject(true);
      setError('');
      try {
        const { data: userData } = await supabaseBrowser.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error(t('add_project', 'login_first', isAr ? 'يجب تسجيل الدخول أولًا.' : 'Please login first.'));
        const { data, error } = await supabaseBrowser.from('projects').select('*').eq('id', editProjectId).maybeSingle();
        if (error) throw error;
        if (!data) throw new Error(isAr ? 'المشروع غير موجود.' : 'Project not found.');
        const ownerId = (data as any).owner_auth_id || (data as any).auth_id || (data as any).user_id || (data as any).created_by;
        if (ownerId && ownerId !== userId) throw new Error(isAr ? 'لا تملك صلاحية تعديل هذا المشروع.' : 'You cannot edit this project.');
        if (!mounted) return;
        setForm((prev) => ({
          ...prev,
          title: String((data as any).title_ar || (data as any).title || ''),
          description: String((data as any).description_ar || (data as any).description || ''),
          category: String((data as any).category || 'services'),
          opportunityType: String((data as any).opportunity_type || 'sale'),
          governorate: String((data as any).governorate || prev.governorate),
          city: String((data as any).city || prev.city),
          price: String((data as any).price || ''),
          monthlyProfit: String((data as any).monthly_profit || (data as any).expected_monthly_profit || ''),
          roi: String((data as any).roi || (data as any).profit_percentage || ''),
          fundingAmount: String((data as any).funding_amount || (data as any).required_funding || ''),
          fundingPercent: String((data as any).funding_percent || ''),
          partnershipShare: String((data as any).partnership_share || ''),
          franchiseFee: String((data as any).franchise_fee || ''),
          employeesCount: String((data as any).employees_count || ''),
          operatingYears: String((data as any).operating_years || ''),
          paybackMonths: String((data as any).payback_months || ''),
          phoneCountryCode: splitPhoneNumber(String((data as any).phone || ''), defaultDialCode).code,
          phone: splitPhoneNumber(String((data as any).phone || ''), defaultDialCode).local,
          whatsappCountryCode: splitPhoneNumber(String((data as any).whatsapp || ''), defaultDialCode).code,
          whatsapp: splitPhoneNumber(String((data as any).whatsapp || ''), defaultDialCode).local,
          mapLat: String((data as any).map_lat || (data as any).latitude || ''),
          mapLng: String((data as any).map_lng || (data as any).longitude || ''),
        }));
        const { data: gallery } = await supabaseBrowser.from('project_images').select('id,image_url,url,is_cover,sort_order').eq('project_id', editProjectId).order('sort_order', { ascending: true });
        const existingImages: ImagePreview[] = (gallery || []).map((row: any, index: number) => ({ id: String(row.id || ''), url: String(row.image_url || row.url || ''), isCover: row.is_cover === true || index === 0, existing: true })).filter((item: ImagePreview) => item.url);
        const coverUrl = String((data as any).cover_image_url || (data as any).image_url || '');
        if (!existingImages.length && coverUrl) existingImages.push({ url: coverUrl, isCover: true, existing: true });
        setImages(existingImages);
        const { data: docs } = await supabaseBrowser.from('project_documents').select('id,document_type,file_name,title,file_url,document_url,note,status').eq('project_id', editProjectId).order('created_at', { ascending: false });
        setProjectDocuments((docs || []).map((row: any) => ({ id: String(row.id || ''), kind: String(row.document_type || 'other'), note: String(row.note || ''), name: String(row.file_name || row.title || 'مستند'), url: String(row.file_url || row.document_url || ''), existing: true })));
        const { data: videos } = await supabaseBrowser.from('project_videos').select('id,video_url,file_url,title,file_name,sort_order').eq('project_id', editProjectId).order('sort_order', { ascending: true });
        setProjectVideos((videos || []).map((row: any) => ({ id: String(row.id || ''), url: String(row.video_url || row.file_url || ''), name: String(row.file_name || row.title || 'فيديو'), existing: true })).filter((item: ProjectVideo) => item.url));
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : (isAr ? 'تعذر تحميل المشروع للتعديل.' : 'Failed to load project.'));
      } finally {
        if (mounted) setLoadingProject(false);
      }
    }
    loadProjectForEdit();
    return () => { mounted = false; };
  }, [editProjectId, isAr]);

  const activeCities = useMemo(() => {
    return locations.find((item) => item.ar === form.governorate || item.en === form.governorate)?.cities || locations[0]?.cities || [];
  }, [form.governorate, locations]);

  const draftKey = useMemo(() => `eloinvestor-smart-form:${normalizedCountry}:${lang}:${editProjectId || 'new'}`, [normalizedCountry, lang, editProjectId]);

  const formScore = useMemo(() => {
    const checks = [form.title, form.description, form.category, form.opportunityType, form.city, form.phone || form.whatsapp, images.length ? 'images' : '', form.mapLat && form.mapLng ? 'map' : ''];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form, images.length]);

  const smartHint = useMemo(() => {
    const title = `${form.title} ${form.description}`.toLowerCase();
    if (/مطعم|restaurant|cafe|coffee|كاف/.test(title)) return isAr ? 'اقتراح ذكي: قطاع مطاعم وكافيهات مناسب، وأضف صور الواجهة والمطبخ وقائمة المبيعات.' : 'Smart tip: Restaurants & Cafes fits well. Add storefront, kitchen, and sales photos.';
    if (/صالون|beauty|تجميل|spa/.test(title)) return isAr ? 'اقتراح ذكي: قطاع التجميل مناسب، ويفضل إظهار الأجهزة والديكور وعدد العملاء.' : 'Smart tip: Beauty sector fits well. Show equipment, interior, and customer metrics.';
    if (/تطبيق|app|software|تقني|منصة/.test(title)) return isAr ? 'اقتراح ذكي: قطاع التقنية مناسب، ركّز على عدد المستخدمين والإيرادات الشهرية.' : 'Smart tip: Technology fits well. Highlight users and monthly revenue.';
    return isAr ? 'املأ البيانات المهمة أولاً: العنوان، النوع، المدينة، الرقم، الصور، وموقع المشروع.' : 'Start with the key fields: title, type, city, contact, photos, and location.';
  }, [form.title, form.description, isAr]);

  useEffect(() => {
    if (isEditing || typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm((prev) => ({ ...prev, ...parsed }));
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [draftKey, isEditing]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(draftKey, JSON.stringify(form));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [draftKey, form]);

  function generateSmartDescription() {
    const typeLabel = opportunityTypes.find((item) => item.value === form.opportunityType);
    const sectorLabel = sectorOptions.find((item) => item.value === form.category);
    const projectName = form.title.trim() || (isAr ? 'هذا المشروع' : 'This opportunity');
    const place = [form.city, form.governorate].filter(Boolean).join(isAr ? '، ' : ', ');
    const contactLine = form.phone || form.whatsapp
      ? (isAr ? 'يمكن للمستثمر الجاد طلب تفاصيل إضافية أو ترتيب زيارة بعد التواصل.' : 'Serious investors can request more details or arrange a visit after contact.')
      : '';

    const typeSpecific = (() => {
      if (form.opportunityType === 'sale') {
        return isAr
          ? `المشروع مطروح للبيع مع إمكانية تسليم التفاصيل التشغيلية للمشتري الجاد. ${form.price ? `سعر البيع المطلوب ${form.price}،` : 'يمكن مناقشة السعر بعد الاطلاع على الجدية،'} ويُفضّل توضيح الأصول والمعدات وقاعدة العملاء أثناء التفاوض.`
          : `The business is offered for sale with operational details available to serious buyers. ${form.price ? `Asking price is ${form.price},` : 'The price can be discussed after qualification,'} with assets, equipment, and customer base to be clarified during negotiation.`;
      }
      if (form.opportunityType === 'funding') {
        return isAr
          ? `المشروع يبحث عن تمويل للنمو أو التوسع. ${form.fundingAmount ? `المبلغ المطلوب ${form.fundingAmount}` : 'قيمة التمويل تحدد حسب خطة التوسع'}${form.fundingPercent ? ` مقابل نسبة تمويل ${form.fundingPercent}%` : ''}. سيتم توضيح خطة استخدام التمويل والعائد المتوقع للمستثمر المؤهل.`
          : `The project is seeking funding for growth or expansion. ${form.fundingAmount ? `Requested funding is ${form.fundingAmount}` : 'Funding amount depends on the expansion plan'}${form.fundingPercent ? ` for a ${form.fundingPercent}% share` : ''}. Funding use and expected return can be shared with qualified investors.`;
      }
      if (form.opportunityType === 'partnership') {
        return isAr
          ? `الفرصة مناسبة لمستثمر يرغب بالدخول كشريك في مشروع قائم أو قابل للتوسع. ${form.partnershipShare ? `نسبة الشراكة المطروحة ${form.partnershipShare}%،` : 'نسبة الشراكة قابلة للنقاش،'} مع إمكانية الاتفاق على دور الشريك في الإدارة أو التمويل أو التوسع.`
          : `This is suitable for an investor looking to join as a partner in an existing or scalable business. ${form.partnershipShare ? `Offered share is ${form.partnershipShare}%,` : 'The partnership share is negotiable,'} with roles in management, funding, or expansion to be agreed.`;
      }
      return isAr
        ? `الفرصة مرتبطة بحق امتياز أو نموذج قابل للتكرار. ${form.franchiseFee ? `رسوم الامتياز المطلوبة ${form.franchiseFee}،` : 'رسوم الامتياز قابلة للتوضيح،'} مع إمكانية شرح آلية التشغيل والدعم للمستثمر الجاد.`
        : `This opportunity is linked to a franchise or repeatable business model. ${form.franchiseFee ? `Franchise fee is ${form.franchiseFee},` : 'The franchise fee can be clarified,'} with operating model and support details available to serious investors.`;
    })();

    const performance = [
      form.monthlyProfit ? (isAr ? `صافي الربح الشهري التقريبي: ${form.monthlyProfit}.` : `Estimated monthly net profit: ${form.monthlyProfit}.`) : '',
      form.roi ? (isAr ? `العائد السنوي المتوقع: ${form.roi}%.` : `Expected annual ROI: ${form.roi}%.`) : '',
      form.operatingYears ? (isAr ? `سنوات التشغيل: ${form.operatingYears}.` : `Operating years: ${form.operatingYears}.`) : '',
      form.employeesCount ? (isAr ? `عدد الموظفين: ${form.employeesCount}.` : `Employees: ${form.employeesCount}.`) : '',
      form.paybackMonths ? (isAr ? `مدة الاسترداد المتوقعة: ${form.paybackMonths} شهر.` : `Expected payback period: ${form.paybackMonths} months.`) : '',
    ].filter(Boolean).join(isAr ? '\n' : '\n');

    const parts = isAr
      ? [
          `${projectName} فرصة ${typeLabel?.ar || 'استثمارية'} في قطاع ${sectorLabel?.ar || 'الخدمات'}${place ? ` ضمن ${place}` : ''}.`,
          'يتميز المشروع بوضوح نموذج العمل وقابلية تقييمه من خلال الأرقام التشغيلية والموقع وبيانات التواصل المرفقة.',
          typeSpecific,
          performance,
          form.mapLat && form.mapLng ? 'تم تحديد موقع المشروع على الخريطة لتسهيل تقييم الموقع والزيارة الميدانية.' : 'يمكن إضافة موقع المشروع على الخريطة لزيادة ثقة المستثمرين وتسهيل الزيارة.',
          contactLine,
          'جميع البيانات قابلة للمراجعة والتدقيق، ويمكن مشاركة مستندات إضافية بعد التأكد من جدية المستثمر.',
        ]
      : [
          `${projectName} is a ${typeLabel?.en || 'investment opportunity'} in ${sectorLabel?.en || 'services'}${place ? ` located in ${place}` : ''}.`,
          'The opportunity is presented with a clear business model and can be evaluated through operating figures, location, and attached contact details.',
          typeSpecific,
          performance,
          form.mapLat && form.mapLng ? 'The project location has been set on the map to support location review and site visits.' : 'Adding the map location can increase investor trust and simplify visits.',
          contactLine,
          'All details can be reviewed and verified, and supporting documents can be shared with qualified investors.',
        ];

    updateField('description', parts.filter(Boolean).join('\n\n'));
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    const numericKeys = new Set<keyof FormState>([
      'price',
      'monthlyProfit',
      'roi',
      'fundingAmount',
      'fundingPercent',
      'partnershipShare',
      'franchiseFee',
      'employeesCount',
      'operatingYears',
      'paybackMonths',
      'phone',
      'whatsapp',
    ]);
    const decimalKeys = new Set<keyof FormState>(['mapLat', 'mapLng']);
    const nextValue = numericKeys.has(key)
      ? digitsOnly(String(value))
      : decimalKeys.has(key)
        ? decimalOnly(String(value))
        : value;
    setForm((prev) => ({ ...prev, [key]: nextValue as FormState[K] }));
  }

  function updateGovernorate(value: string) {
    const selected = locations.find((item) => item.ar === value || item.en === value);
    setForm((prev) => ({ ...prev, governorate: value, city: selected?.cities[0] || '' }));
  }

  function useCurrentLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError(t('add_project', 'geolocation_not_supported', isAr ? 'المتصفح لا يدعم تحديد الموقع.' : 'Geolocation is not supported.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          mapLat: position.coords.latitude.toFixed(6),
          mapLng: position.coords.longitude.toFixed(6),
        }));
      },
      () => setError(t('add_project', 'geolocation_failed', isAr ? 'تعذر الوصول للموقع. يمكنك إدخال الإحداثيات يدويًا.' : 'Could not access location. You can enter coordinates manually.'))
    );
  }

  function reorderImage(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    setImages((prev) => moveItem(prev, from, to) as ImagePreview[]);
  }

  function addImages(files: FileList | null) {
    if (!files?.length) return;
    const next = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, Math.max(0, 10 - images.length))
      .map((file, index) => ({ file, url: URL.createObjectURL(file), isCover: images.length === 0 && index === 0 }));

    setImages((prev) => [...prev, ...next]);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const item = prev[index];
      if (item?.id) setRemovedImageIds((ids) => [...ids, item.id as string]);
      const next = prev.filter((_, idx) => idx !== index);
      if (next.length && !next.some((item) => item.isCover)) next[0] = { ...next[0], isCover: true };
      return next;
    });
  }

  function setCover(index: number) {
    setImages((prev) => prev.map((item, idx) => ({ ...item, isCover: idx === index })));
  }


  const stepLabels = isAr
    ? ['المعلومات', 'الأرقام', 'التواصل والموقع', 'الصور', 'المستندات والمراجعة']
    : ['Details', 'Financials', 'Contact & location', 'Images', 'Documents & review'];

  function addProjectDocuments(files: FileList | null, kind = 'other') {
    if (!files?.length) return;
    const next = Array.from(files).slice(0, Math.max(0, 12 - projectDocuments.length)).map((file) => ({ file, kind, note: '', name: file.name }));
    setProjectDocuments((prev) => [...prev, ...next]);
  }

  function removeProjectDocument(index: number) {
    setProjectDocuments((prev) => {
      const item = prev[index];
      if (item?.id) setRemovedDocumentIds((ids) => [...ids, item.id as string]);
      return prev.filter((_, idx) => idx !== index);
    });
  }

  function addProjectVideos(files: FileList | null) {
    if (!files?.length) return;
    const next = Array.from(files).filter((file) => file.type.startsWith('video/')).slice(0, Math.max(0, 5 - projectVideos.length)).map((file) => ({ file, url: URL.createObjectURL(file), name: file.name }));
    setProjectVideos((prev) => [...prev, ...next]);
  }

  function removeProjectVideo(index: number) {
    setProjectVideos((prev) => {
      const item = prev[index];
      if (item?.id) setRemovedVideoIds((ids) => [...ids, item.id as string]);
      return prev.filter((_, idx) => idx !== index);
    });
  }

  async function uploadProjectDocument(file: File, userId: string, projectId: string, index: number) {
    const bucket = process.env.NEXT_PUBLIC_PROJECT_DOCUMENTS_BUCKET || 'project-documents';
    const ext = file.name.split('.').pop() || 'pdf';
    const safeName = `project-doc-${projectId}-${Date.now()}-${index}.${ext}`.replace(/[^a-zA-Z0-9.-]/g, '');
    const path = `${userId}/${projectId}/${safeName}`;
    const { error } = await supabaseBrowser.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw new Error(isAr ? `فشل رفع مستند المشروع: ${error.message}` : `Project document upload failed: ${error.message}`);
    const { data } = supabaseBrowser.storage.from(bucket).getPublicUrl(path);
    return { path, publicUrl: data.publicUrl };
  }

  async function saveProjectDocuments(projectId: string, userId: string) {
    if (!projectId || !projectDocuments.length) return;
    for (const [index, item] of projectDocuments.entries()) {
      if (!item.file) continue;
      const uploaded = await uploadProjectDocument(item.file, userId, projectId, index);
      await insertRowWithFallback('project_documents', {
        project_id: projectId,
        user_auth_id: userId,
        document_type: item.kind,
        title: item.file?.name || item.name || 'مستند',
        file_name: item.file?.name || item.name || 'مستند',
        file_url: uploaded.publicUrl,
        document_url: uploaded.publicUrl,
        file_path: uploaded.path,
        storage_path: uploaded.path,
        note: item.note,
        status: 'pending',
      });
    }
  }



  async function saveProjectViaApi(payload: Record<string, unknown>, projectId?: string) {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error(t('add_project', 'login_first', isAr ? 'يجب تسجيل الدخول أولًا.' : 'Please login first.'));

    const response = await fetch('/api/projects/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ payload, projectId }),
    });

    const result = await response.json().catch(() => null) as { ok?: boolean; error?: string; project?: { id?: string } } | null;
    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || (isAr ? 'حدث خطأ أثناء حفظ المشروع.' : 'Failed to save project.'));
    }
    return { data: result.project || null, removed: [] as string[] };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.title.trim() || !form.description.trim()) {
      setError(t('add_project', 'enter_title_desc', isAr ? 'اكتب اسم المشروع والوصف.' : 'Please enter project title and description.'));
      return;
    }

    setSubmitting(true);

    try {
      const { data: userData, error: userError } = await supabaseBrowser.auth.getUser();
      if (userError || !userData.user) throw new Error(t('add_project', 'login_first', isAr ? 'يجب تسجيل الدخول أولًا.' : 'Please login first.'));

      const uploaded = images.length ? await uploadProjectImages(images, userData.user.id) : [];
      const existingCover = images.find((item) => item.isCover && item.existing)?.url || '';
      const cover = uploaded.find((item) => item.isCover)?.url || uploaded[0]?.url || existingCover || images[0]?.url || '';
      const slug = isEditing ? undefined : `${slugify(form.title)}-${Date.now().toString(36)}`;
      const publishMode = await getProjectPublishMode();
      const nextProjectStatus = publishMode === 'auto' ? 'approved' : 'pending';

      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        name: form.title.trim(),
        title_ar: form.title.trim(),
        title_en: form.title.trim(),
        description: form.description.trim(),
        description_ar: form.description.trim(),
        description_en: form.description.trim(),
        category: form.category,
        sector: form.category,
        category_id: sectorOptions.find((item) => item.value === form.category)?.id || null,
        project_type: form.opportunityType,
        opportunity_type: form.opportunityType,
        country_code: normalizedCountry,
        governorate: form.governorate,
        city: form.city,
        location: [form.city, form.governorate].filter(Boolean).join('، '),
        map_lat: form.mapLat ? Number(form.mapLat) : null,
        map_lng: form.mapLng ? Number(form.mapLng) : null,
        latitude: form.mapLat ? Number(form.mapLat) : null,
        longitude: form.mapLng ? Number(form.mapLng) : null,
        price: toNumber(form.price),
        monthly_profit: toNumber(form.monthlyProfit),
        expected_monthly_profit: toNumber(form.monthlyProfit),
        roi: toNumber(form.roi),
        profit_percentage: toNumber(form.roi),
        funding_amount: toNumber(form.fundingAmount),
        required_funding: toNumber(form.fundingAmount),
        funding_percent: toNumber(form.fundingPercent),
        funding_percentage: toNumber(form.fundingPercent),
        partnership_share: toNumber(form.partnershipShare),
        partnership_percentage: toNumber(form.partnershipShare),
        franchise_fee: toNumber(form.franchiseFee),
        employees_count: toNumber(form.employeesCount),
        operating_years: toNumber(form.operatingYears),
        payback_months: toNumber(form.paybackMonths),
        phone_country_code: form.phoneCountryCode,
        whatsapp_country_code: form.whatsappCountryCode,
        contact_phone: digitsOnly(form.phone),
        contact_whatsapp: digitsOnly(form.whatsapp),
        phone: formatPhoneWithCode(form.phoneCountryCode, form.phone),
        whatsapp: formatPhoneWithCode(form.whatsappCountryCode, form.whatsapp),
        status: nextProjectStatus,
        moderation_status: nextProjectStatus,
        publish_status: nextProjectStatus,
        is_active: nextProjectStatus === 'approved',
        approval_status: nextProjectStatus === 'approved' ? 'auto_approved' : 'pending',
        verification_status: 'pending',
        is_verified: false,
        ...(cover ? { cover_image_url: cover, image_url: cover } : {}),
        ...(slug ? { slug } : {}),
        owner_auth_id: userData.user.id,
        user_auth_id: userData.user.id,
        owner_id: userData.user.id,
        auth_id: userData.user.id,
        user_id: userData.user.id,
        created_by: userData.user.id,
      };

      const { data } = await saveProjectViaApi(payload, isEditing ? editProjectId : undefined);
      const projectId = String((data as { id?: string } | null)?.id || editProjectId || '');
      if (projectId && removedImageIds.length) await supabaseBrowser.from('project_images').delete().in('id', removedImageIds);
      if (projectId && removedDocumentIds.length) await supabaseBrowser.from('project_documents').delete().in('id', removedDocumentIds);
      if (projectId && removedVideoIds.length) await supabaseBrowser.from('project_videos').delete().in('id', removedVideoIds);
      if (projectId && uploaded.length) await insertProjectImages(projectId, uploaded);
      if (projectId && projectDocuments.length) await saveProjectDocuments(projectId, userData.user.id);
      if (projectId && projectVideos.length) {
        const uploadedVideos = await uploadProjectVideos(projectVideos, userData.user.id, projectId);
        if (uploadedVideos.length) await insertProjectVideos(projectId, uploadedVideos);
      }

      if (projectId && (verificationRequested || verificationFile || projectDocuments.length)) {
        const verification = verificationFile
          ? await uploadVerificationDocument(verificationFile, userData.user.id, projectId)
          : null;
        await insertRowWithFallback('verification_requests', {
          user_auth_id: userData.user.id,
          project_id: projectId,
          request_type: 'project',
          type: 'project',
          status: 'pending',
          title: 'توثيق مشروع من صفحة إضافة المشروع',
          project_title: form.title.trim(),
          document_name: verificationFile?.name || (projectDocuments.length ? 'مستندات المشروع' : 'طلب توثيق'),
          document_url: verification?.publicUrl || '',
          file_url: verification?.publicUrl || '',
          file_path: verification?.path || '',
          storage_path: verification?.path || '',
          note: projectDocuments.length
            ? 'طلب توثيق مرفق مع مستندات المشروع في جدول project_documents.'
            : 'طلب توثيق مشروع من السمارت فورم.',
        });
      }

      setSuccess(isEditing ? (t('add_project', 'update_success', isAr ? (nextProjectStatus === 'approved' ? 'تم تحديث المشروع ونشره بنجاح.' : 'تم تحديث المشروع بنجاح وإرساله للمراجعة.') : (nextProjectStatus === 'approved' ? 'Project updated and published.' : 'Project updated and sent for review.'))) : (t('add_project', 'submit_success', isAr ? (nextProjectStatus === 'approved' ? 'تم نشر المشروع بنجاح.' : 'تم إرسال المشروع للمراجعة بنجاح.') : (nextProjectStatus === 'approved' ? 'Project published successfully.' : 'Project submitted for review successfully.'))));
      if (!isEditing && projectId) {
        setCreatedProjectId(projectId);
        setShowPromotionUpsell(true);
      } else if (onSaved) {
        setTimeout(onSaved, 700);
      } else {
        setTimeout(() => router.push(`/${normalizedCountry}/${lang}/dashboard`), 900);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (t('add_project', 'save_error', isAr ? 'حدث خطأ أثناء حفظ المشروع.' : 'Failed to save project.')));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingProject) return <div className="h-96 animate-pulse rounded-[3rem] bg-white shadow-sm" />;

  return (
    <>
    {showPromotionUpsell ? (
      <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl ring-1 ring-slate-100">
          <button type="button" onClick={() => { setShowPromotionUpsell(false); if (onSaved) onSaved(); else router.push(`/${normalizedCountry}/${lang}/dashboard?tab=my-projects`); }} className="float-left rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"><X size={18} /></button>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Megaphone size={30} /></div>
          <h2 className="mt-5 text-2xl font-black text-slate-950">{t('add_project', 'success_title', isAr ? 'تم إضافة مشروعك بنجاح!' : 'Your project was added successfully!')}</h2>
          <p className="mt-3 text-sm font-bold leading-7 text-slate-600">{t('add_project', 'success_desc', isAr ? 'هل تريد أن يصل مشروعك لأكثر مستثمر؟ روّج مشروعك الآن واحصل على ظهور أعلى في الصفحة الرئيسية ونتائج البحث.' : 'Want your project to reach more investors? Promote it now for higher visibility on the home page and search results.')}</p>
          <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm font-black text-blue-800">🚀 {t('add_project', 'success_hint', isAr ? 'الترويج يساعد مشروعك على الحصول على مشاهدات ونقرات وتواصل أكثر.' : 'Promotion helps your project get more views, clicks, and contacts.')}</div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => router.push(`/${normalizedCountry}/${lang}/promote/${encodeURIComponent(createdProjectId)}`)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-4 font-black text-white shadow-sm hover:bg-blue-800"><Megaphone size={18} /> {t('common', 'promote_now', isAr ? 'روّج الآن' : 'Promote now')}</button>
            <button type="button" onClick={() => { setShowPromotionUpsell(false); if (onSaved) onSaved(); else router.push(`/${normalizedCountry}/${lang}/dashboard?tab=my-projects`); }} className="rounded-2xl bg-slate-100 px-5 py-4 font-black text-slate-700 hover:bg-slate-200">{t('common', 'later', isAr ? 'لاحقاً' : 'Later')}</button>
          </div>
        </div>
      </div>
    ) : null}
    <form onSubmit={handleSubmit} className="project-step-form space-y-6 rounded-[1.25rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <p className="mb-3 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-800">{isEditing ? (t('add_project', 'edit_project', isAr ? 'تعديل مشروع' : 'Edit opportunity')) : (t('add_project', 'new_project', isAr ? 'مشروع جديد' : 'New opportunity'))}</p>
          <h1 className="text-3xl font-black text-slate-950 md:text-4xl">{isEditing ? (t('add_project', 'edit_title', isAr ? 'تعديل بيانات المشروع' : 'Edit project details')) : (t('add_project', 'submit_title', isAr ? 'أضف مشروعك للمراجعة' : 'Submit your project for review'))}</h1>
          <p className="mt-3 max-w-2xl leading-8 text-slate-600">
            {isEditing ? (t('add_project', 'edit_desc', isAr ? 'عدّل البيانات المطلوبة ثم احفظ التحديثات.' : 'Update the required fields, then save changes.')) : (t('add_project', 'submit_desc', isAr ? 'املأ البيانات الأساسية وارفع صور المشروع. سيظهر المشروع بعد مراجعة الإدارة.' : 'Fill in the core details and upload project photos. It will go live after admin review.'))}
          </p>
        </div>
        <span className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">{normalizedCountry.toUpperCase()}</span>
      </div>

      {error && <div className="rounded-3xl border border-red-100 bg-red-50 px-5 py-4 font-bold text-red-700">{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-3xl border border-blue-100 bg-blue-50 px-5 py-4 font-bold text-blue-800"><CheckCircle2 size={20} /> {success}</div>}

      <div className="smart-form-status">
        <div>
          <span><Sparkles size={16} /> {isAr ? 'سمارت فورم' : 'Smart form'}</span>
          <b>{smartHint}</b>
        </div>
        <div className="smart-form-score" aria-label={isAr ? 'نسبة اكتمال المشروع' : 'Completion score'}>
          <strong>{formScore}%</strong>
          <small>{isAr ? 'جاهزية' : 'ready'}</small>
        </div>
      </div>

      <div className="project-steps" aria-label={isAr ? 'خطوات إضافة المشروع' : 'Add project steps'}>
        {stepLabels.map((label, index) => {
          const step = index + 1;
          return (
            <button key={label} type="button" onClick={() => setCurrentStep(step)} className={currentStep === step ? 'active' : step < currentStep ? 'done' : ''}>
              <span>{step}</span><b>{label}</b>
            </button>
          );
        })}
      </div>

      {currentStep === 1 && <section className="step-panel grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-black text-slate-700">{t('add_project', 'project_title', isAr ? 'اسم المشروع' : 'Project title')}</span>
          <input value={form.title} onChange={(e) => updateField('title', e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder={t('add_project', 'project_title_placeholder', isAr ? 'مثال: مقهى قائم للبيع في مسقط' : 'Example: Operating cafe for sale')} />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{t('add_project', 'category', isAr ? 'القطاع' : 'Category')}</span>
          <select value={form.category} onChange={(e) => updateField('category', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 font-bold outline-none focus:border-blue-600">
            {sectorOptions.map((item) => <option key={item.value} value={item.value}>{item.icon ? `${item.icon} ` : ''}{isAr ? item.ar : item.en}</option>)}
          </select>
        </label>

        <div className="space-y-2 md:col-span-2">
          <span className="text-sm font-black text-slate-700">{t('add_project', 'opportunity_type', isAr ? 'نوع الفرصة' : 'Opportunity type')}</span>
          <div className="opportunity-type-grid">
            {opportunityTypes.map((item) => (
              <button key={item.value} type="button" onClick={() => updateField('opportunityType', item.value)} className={form.opportunityType === item.value ? 'active' : ''}>
                <b>{isAr ? item.ar : item.en}</b>
                <small>{item.value === 'sale' ? (isAr ? 'بيع كامل أو جزئي' : 'Full or partial sale') : item.value === 'funding' ? (isAr ? 'مبلغ مقابل عائد' : 'Capital for return') : item.value === 'partnership' ? (isAr ? 'حصة وشريك' : 'Equity partner') : (isAr ? 'نموذج امتياز' : 'Franchise model')}</small>
              </button>
            ))}
          </div>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{t('add_project', 'region', isAr ? 'المحافظة / المنطقة' : 'Region')}</span>
          <select value={form.governorate} onChange={(e) => updateGovernorate(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 font-bold outline-none focus:border-blue-600">
            {locations.map((item) => <option key={item.ar} value={item.ar}>{isAr ? item.ar : item.en}</option>)}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{t('add_project', 'city', isAr ? 'المدينة / الولاية' : 'City')}</span>
          <select value={form.city} onChange={(e) => updateField('city', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 font-bold outline-none focus:border-blue-600">
            {activeCities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        </label>



        <label className="space-y-2 md:col-span-2">
          <span className="flex items-center justify-between gap-3 text-sm font-black text-slate-700">
            {isAr ? 'وصف المشروع' : 'Project description'}
            <button type="button" onClick={generateSmartDescription} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white"><Wand2 size={14} /> {isAr ? 'توليد وصف' : 'Generate'}</button>
          </span>
          <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} className="min-h-40 w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold leading-8 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder={isAr ? 'اشرح المشروع، موقعه، سبب البيع أو نوع الشراكة، وأهم الأرقام.' : 'Describe the business, location, reason for sale or partnership type, and key numbers.'} />
        </label>
      </section>}

      {currentStep === 2 && <section className="step-panel grid gap-4 rounded-[1.25rem] bg-slate-50 p-4 md:grid-cols-3">
        {form.opportunityType === 'sale' && <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'سعر البيع' : 'Sale price'}</span>
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.price} onChange={(e) => updateField('price', e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none" placeholder="8000" />
        </label>}
        {form.opportunityType === 'funding' && <>
          <label className="space-y-2">
            <span className="text-sm font-black text-slate-700">{isAr ? 'المبلغ المطلوب' : 'Funding amount'}</span>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.fundingAmount} onChange={(e) => updateField('fundingAmount', e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none" placeholder="5000" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-black text-slate-700">{isAr ? 'نسبة التمويل %' : 'Funding share %'}</span>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.fundingPercent} onChange={(e) => updateField('fundingPercent', e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none" placeholder="30" />
          </label>
        </>}
        {form.opportunityType === 'partnership' && <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'نسبة الشراكة %' : 'Partnership share %'}</span>
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.partnershipShare} onChange={(e) => updateField('partnershipShare', e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none" placeholder="40" />
        </label>}
        {form.opportunityType === 'franchise' && <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'رسوم الامتياز' : 'Franchise fee'}</span>
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.franchiseFee} onChange={(e) => updateField('franchiseFee', e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none" placeholder="3000" />
        </label>}
        <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'الربح الشهري' : 'Monthly profit'}</span>
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.monthlyProfit} onChange={(e) => updateField('monthlyProfit', e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none" placeholder="700" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'نسبة العائد %' : 'ROI %'}</span>
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.roi} onChange={(e) => updateField('roi', e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none" placeholder="25" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'عدد الموظفين' : 'Employees'}</span>
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.employeesCount} onChange={(e) => updateField('employeesCount', e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none" placeholder="4" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'سنوات التشغيل' : 'Operating years'}</span>
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.operatingYears} onChange={(e) => updateField('operatingYears', e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none" placeholder="2" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'مدة الاسترداد بالأشهر' : 'Payback months'}</span>
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.paybackMonths} onChange={(e) => updateField('paybackMonths', e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none" placeholder="18" />
        </label>
      </section>}

      {currentStep === 3 && <section className="step-panel grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 rounded-[1.5rem] bg-blue-50 p-4 text-sm font-bold text-blue-900">
          {isAr ? 'أضف رقم التواصل وموقع المشروع بدقة حتى يستطيع المستثمر التواصل وتقييم الموقع بسرعة.' : 'Add contact numbers and the project location so investors can reach you and evaluate the site quickly.'}
        </div>
        <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'رقم الهاتف' : 'Phone'}</span>
          <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100">
            <select value={form.phoneCountryCode} onChange={(e) => updateField('phoneCountryCode', e.target.value)} className="w-32 border-0 bg-slate-50 px-3 py-4 text-center font-black text-slate-700 outline-none">
              {countryDialCodes.map((item) => <option key={`phone-${item.code}`} value={item.code}>{item.code} {isAr ? item.labelAr : item.labelEn}</option>)}
            </select>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className="min-w-0 flex-1 border-0 px-5 py-4 font-bold outline-none" placeholder="91234567" />
          </div>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'واتساب' : 'WhatsApp'}</span>
          <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100">
            <select value={form.whatsappCountryCode} onChange={(e) => updateField('whatsappCountryCode', e.target.value)} className="w-32 border-0 bg-slate-50 px-3 py-4 text-center font-black text-slate-700 outline-none">
              {countryDialCodes.map((item) => <option key={`wa-${item.code}`} value={item.code}>{item.code} {isAr ? item.labelAr : item.labelEn}</option>)}
            </select>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={form.whatsapp} onChange={(e) => updateField('whatsapp', e.target.value)} className="min-w-0 flex-1 border-0 px-5 py-4 font-bold outline-none" placeholder="91234567" />
          </div>
        </label>
        <div className="project-map-picker md:col-span-2">
          <div className="project-map-picker-head">
            <div>
              <b>{t('add_project', 'location_title', isAr ? 'تحديد موقع المشروع من الخريطة' : 'Select project location on map')}</b>
              <span>{t('add_project', 'location_desc', isAr ? 'استخدم موقعك الحالي أو أدخل الإحداثيات ليظهر الموقع في صفحة المشروع.' : 'Use your current location or enter coordinates to show the project map.')}</span>
            </div>
            <button type="button" onClick={useCurrentLocation}><Navigation size={16} /> {t('add_project', 'use_my_location', isAr ? 'استخدم موقعي' : 'Use my location')}</button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <span>{isAr ? 'خط العرض' : 'Latitude'}</span>
              <input value={form.mapLat} onChange={(e) => updateField('mapLat', e.target.value)} inputMode="decimal" placeholder="23.5880" />
            </label>
            <label>
              <span>{isAr ? 'خط الطول' : 'Longitude'}</span>
              <input value={form.mapLng} onChange={(e) => updateField('mapLng', e.target.value)} inputMode="decimal" placeholder="58.3829" />
            </label>
          </div>
          {form.mapLat && form.mapLng ? (
            <div className="project-map-picker-preview">
              <iframe title={isAr ? 'معاينة موقع المشروع' : 'Project location preview'} src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(form.mapLng) - 0.01}%2C${Number(form.mapLat) - 0.01}%2C${Number(form.mapLng) + 0.01}%2C${Number(form.mapLat) + 0.01}&layer=mapnik&marker=${form.mapLat}%2C${form.mapLng}`} loading="lazy" />
            </div>
          ) : (
            <div className="project-map-picker-empty"><MapPin size={18} /> {isAr ? 'سيظهر موقع المشروع هنا بعد تحديد الإحداثيات.' : 'Map preview will appear after coordinates are set.'}</div>
          )}
        </div>
      </section>}

      {currentStep === 4 && <section className="step-panel space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">{isAr ? 'صور المشروع' : 'Project images'}</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">{isAr ? 'ارفع حتى 10 صور واختر صورة الغلاف.' : 'Upload up to 10 images and choose a cover.'}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-500">{images.length}/10</span>
        </div>

        <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addImages(e.dataTransfer.files); }} className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-[2rem] border-2 border-dashed border-blue-200 bg-blue-50/40 p-6 text-center transition hover:bg-blue-50">
          <UploadCloud className="text-blue-700" size={34} />
          <div className="font-black text-slate-900">{isAr ? 'اضغط لرفع الصور' : 'Click to upload images'}</div>
          <p className="text-sm font-bold text-slate-500">JPG, PNG, WEBP · {isAr ? 'ضغط تلقائي WebP وسحب للإفلات' : 'Auto WebP compression + drag/drop'}</p>
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
        </label>

        {images.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {images.map((image, index) => (
              <div key={image.url} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', String(index))} onDragOver={(e) => e.preventDefault()} onDrop={(e) => reorderImage(Number(e.dataTransfer.getData('text/plain')), index)} className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <img src={image.url} alt="preview" className="h-44 w-full object-cover" />
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                  <button type="button" onClick={() => setCover(index)} className={`rounded-full px-3 py-2 text-xs font-black shadow ${image.isCover ? 'bg-blue-700 text-white' : 'bg-white text-slate-700'}`}>
                    {image.isCover ? (isAr ? 'الغلاف' : 'Cover') : (isAr ? 'اجعلها غلاف' : 'Set cover')}
                  </button>
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500 shadow">#{index + 1}</span>
                  <button type="button" onClick={() => removeImage(index)} className="grid h-9 w-9 place-items-center rounded-full bg-white text-red-600 shadow">
                    <X size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>}

      {currentStep === 5 && <section className="step-panel space-y-5">
        <div className="project-documents-panel">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-800"><FileText size={17} /> {isAr ? 'مستندات داعمة للمشروع' : 'Supporting documents'}</p>
            <h2 className="text-2xl font-black text-slate-950">{isAr ? 'ارفع أوراق المشروع لزيادة الثقة' : 'Upload project documents to increase trust'}</h2>
            <p className="mt-2 leading-7 text-slate-600">{isAr ? 'يمكنك رفع دراسة جدوى، كشف مبيعات، سجل تجاري، عقد إيجار، فواتير، صور ترخيص أو أي ملف يساعد الإدارة والمستثمر على فهم المشروع.' : 'Upload feasibility study, sales statements, registration, lease, invoices, licenses, or any supporting file.'}</p>
          </div>
          <div className="doc-upload-grid">
            {[
              ['feasibility', isAr ? 'دراسة جدوى' : 'Feasibility study'],
              ['sales_statement', isAr ? 'كشف مبيعات' : 'Sales statement'],
              ['registration', isAr ? 'سجل/ترخيص' : 'Registration/license'],
              ['other', isAr ? 'ملف آخر' : 'Other file'],
            ].map(([kind, label]) => (
              <label key={kind} className="doc-upload-card">
                <UploadCloud size={22} />
                <b>{label}</b>
                <small>{isAr ? 'PDF أو صورة' : 'PDF or image'}</small>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" className="hidden" onChange={(e) => addProjectDocuments(e.target.files, kind)} />
              </label>
            ))}
          </div>
          {projectDocuments.length > 0 && (
            <div className="project-doc-list">
              {projectDocuments.map((doc, index) => (
                <div key={`${doc.id || doc.file?.name || doc.name}-${index}`} className="project-doc-row">
                  <FileText size={18} />
                  <div><b>{doc.file?.name || doc.name || 'مستند'}</b><small>{doc.kind}{doc.existing ? ' · محفوظ' : ''}</small></div>
                  <button type="button" onClick={() => removeProjectDocument(index)}><X size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div><p className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700"><Video size={17} /> {isAr ? 'فيديو المشروع' : 'Project video'}</p><p className="text-sm font-bold text-slate-500">{isAr ? 'اختياري: ارفع فيديو قصير ليظهر في صفحة الريلز.' : 'Optional: upload short videos for the reels page.'}</p></div>
            <label className="cursor-pointer rounded-full bg-blue-600 px-5 py-3 text-sm font-black text-white"><input type="file" accept="video/*" multiple className="hidden" onChange={(e) => addProjectVideos(e.target.files)} />{isAr ? 'رفع فيديو' : 'Upload video'}</label>
          </div>
          {projectVideos.length > 0 && <div className="mt-4 grid gap-3 md:grid-cols-3">{projectVideos.map((video, index) => <div key={`${video.id || video.url}-${index}`} className="rounded-2xl bg-slate-50 p-3"><video src={video.url} className="h-40 w-full rounded-xl bg-black object-cover" controls muted /><div className="mt-2 flex items-center justify-between gap-2"><b className="truncate text-sm">{video.name || (isAr ? 'فيديو' : 'Video')}</b><button type="button" onClick={() => removeProjectVideo(index)} className="rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">{isAr ? 'حذف' : 'Remove'}</button></div></div>)}</div>}
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-blue-50 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-amber-800 ring-1 ring-amber-100"><ShieldCheck size={17} /> {isAr ? 'عزز بيع مشروعك مع شارة الثقة' : 'Boost your sale with a trust badge'}</p>
            <h2 className="text-2xl font-black text-slate-950">{isAr ? 'المشروع الموثق يعطي المستثمر ثقة أعلى ويظهر بشكل أقوى.' : 'Verified projects earn more investor trust and stronger placement.'}</h2>
            <p className="mt-3 leading-8 text-slate-600">{isAr ? 'التوثيق متاح فقط للباقات المدفوعة. ارفع السجل التجاري أو أوراق المشروع ليتم مراجعتها من الإدارة وربط الشارة بالمشروع بعد الموافقة.' : 'Project verification is available for paid owner plans only. Upload business registration or project documents for admin review.'}</p>
          </div>
          {canVerifyProjects(userPlan) ? (
            <label className="min-w-[280px] cursor-pointer rounded-[1.5rem] border border-blue-200 bg-white p-4 shadow-sm">
              <span className="mb-2 flex items-center gap-2 font-black text-blue-800"><ShieldCheck size={18} /> {isAr ? 'طلب شارة مشروع موثق' : 'Request verified badge'}</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="w-full rounded-xl border border-slate-200 p-3 text-sm font-bold" onChange={(e) => { setVerificationFile(e.target.files?.[0] || null); setVerificationRequested(Boolean(e.target.files?.[0])); }} />
              {verificationFile && <small className="mt-2 block font-bold text-slate-600">{verificationFile.name}</small>}
            </label>
          ) : (
            <div className="min-w-[280px] rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 font-black text-slate-900"><LockKeyhole size={18} /> {isAr ? 'متاح للباقات المدفوعة فقط' : 'Paid plans only'}</div>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500">{isAr ? 'رقي باقة صاحب المشروع لتفعيل توثيق المشاريع من نفس صفحة الإضافة.' : 'Upgrade owner plan to verify projects from this form.'}</p>
              <a href={`/${normalizedCountry}/${lang}/dashboard`} className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"><CreditCard size={16} /> {isAr ? 'افتح الباقات' : 'Open packages'}</a>
            </div>
          )}
        </div>
      </section>
      </section>}

      <div className="step-actions flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
        <p className="max-w-xl text-sm font-bold leading-7 text-slate-500">
          {isAr ? 'سيتم إرسال المشروع إلى لوحة الإدارة للمراجعة قبل النشر.' : 'Your project will be submitted to admin review before publishing.'}
        </p>
        <div className="step-nav-buttons">
          <button type="button" disabled={currentStep === 1} onClick={() => setCurrentStep((step) => Math.max(1, step - 1))}>{isAr ? 'السابق' : 'Back'}</button>
          {currentStep < stepLabels.length && <button type="button" onClick={() => setCurrentStep((step) => Math.min(stepLabels.length, step + 1))}>{isAr ? 'التالي' : 'Next'}</button>}
        </div>
        <button disabled={submitting || currentStep < stepLabels.length} className="inline-flex min-w-44 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-7 py-4 font-black text-white shadow-lg shadow-blue-900/10 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? <Loader2 className="animate-spin" size={20} /> : <ImagePlus size={20} />}
          {submitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : isEditing ? (isAr ? 'حفظ التعديلات' : 'Save changes') : (isAr ? 'إرسال للمراجعة' : 'Submit for review')}
        </button>
      </div>
    </form>
    </>
  );
}
