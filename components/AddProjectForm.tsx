'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, CreditCard, ImagePlus, Loader2, LockKeyhole, ShieldCheck, UploadCloud, X } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

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
  phone: string;
  whatsapp: string;
};

type ImagePreview = {
  file: File;
  url: string;
  isCover: boolean;
};

type SectorOption = { value: string; ar: string; en: string; icon?: string; imageUrl?: string };

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
  { value: 'idea', ar: 'فكرة استثمارية', en: 'Investment idea' },
];

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
    /column ['\"]?([^'\"\s]+)['\"]? of relation/i,
    /Could not find the ['\"]([^'\"]+)['\"] column/i,
    /Could not find column ['\"]([^'\"]+)['\"]/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}


function normalizePlan(plan?: string) {
  return String(plan || 'free').toLowerCase().replace(/\s+/g, '_');
}

function canVerifyProjects(plan?: string) {
  return ['growth', 'pro', 'business', 'premium', 'elite', 'owner_pro', 'owner_business'].includes(normalizePlan(plan));
}

async function insertRowWithFallback(table: string, payload: Record<string, unknown>) {
  let current = { ...payload };
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

async function insertProjectWithFallback(payload: Record<string, unknown>) {
  let current = { ...payload };
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

    throw error;
  }

  throw new Error('تعذر حفظ المشروع بعد عدة محاولات توافق مع أعمدة قاعدة البيانات.');
}


async function updateProjectWithFallback(projectId: string, payload: Record<string, unknown>) {
  let current = { ...payload };
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

    throw error;
  }

  throw new Error('تعذر تحديث المشروع بعد عدة محاولات توافق مع أعمدة قاعدة البيانات.');
}

async function uploadProjectImages(files: ImagePreview[], userId: string) {
  const uploaded: { url: string; isCover: boolean; sortOrder: number }[] = [];
  const bucket = process.env.NEXT_PUBLIC_PROJECT_IMAGES_BUCKET || 'project-images';

  for (const [index, image] of files.entries()) {
    const optimizedFile = await compressImage(image.file);
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

export function AddProjectForm({ country, lang, editProjectId: editProjectIdProp, onSaved }: { country: string; lang: string; editProjectId?: string; onSaved?: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editProjectId = editProjectIdProp || searchParams.get('edit') || '';
  const isEditing = Boolean(editProjectId);
  const isAr = lang === 'ar';
  const normalizedCountry = country.toLowerCase();
  const locations = countryLocations[normalizedCountry] || countryLocations.om;
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
    phone: '',
    whatsapp: '',
  });
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingProject, setLoadingProject] = useState(false);
  const [userPlan, setUserPlan] = useState('free');
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [verificationRequested, setVerificationRequested] = useState(false);

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
        const { data, error } = await supabaseBrowser
          .from('platform_sectors')
          .select('key,slug,code,name_ar,name_en,name,icon,emoji,image_url,is_active,sort_order,country_code')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        const mapped = (data || [])
          .filter((row: any) => !row.country_code || String(row.country_code).toLowerCase() === normalizedCountry)
          .map((row: any) => ({
            value: String(row.key || row.slug || row.code || row.name_en || row.name || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '_'),
            ar: String(row.name_ar || row.name || row.name_en || 'قطاع'),
            en: String(row.name_en || row.name || row.name_ar || 'Sector'),
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
        if (!userId) throw new Error(isAr ? 'يجب تسجيل الدخول أولًا.' : 'Please login first.');
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
          phone: String((data as any).phone || ''),
          whatsapp: String((data as any).whatsapp || ''),
        }));
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

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateGovernorate(value: string) {
    const selected = locations.find((item) => item.ar === value || item.en === value);
    setForm((prev) => ({ ...prev, governorate: value, city: selected?.cities[0] || '' }));
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
      const next = prev.filter((_, idx) => idx !== index);
      if (next.length && !next.some((item) => item.isCover)) next[0] = { ...next[0], isCover: true };
      return next;
    });
  }

  function setCover(index: number) {
    setImages((prev) => prev.map((item, idx) => ({ ...item, isCover: idx === index })));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.title.trim() || !form.description.trim()) {
      setError(isAr ? 'اكتب اسم المشروع والوصف.' : 'Please enter project title and description.');
      return;
    }

    setSubmitting(true);

    try {
      const { data: userData, error: userError } = await supabaseBrowser.auth.getUser();
      if (userError || !userData.user) throw new Error(isAr ? 'يجب تسجيل الدخول أولًا.' : 'Please login first.');

      const uploaded = images.length ? await uploadProjectImages(images, userData.user.id) : [];
      const cover = uploaded.find((item) => item.isCover)?.url || uploaded[0]?.url || '';
      const slug = isEditing ? undefined : `${slugify(form.title)}-${Date.now().toString(36)}`;

      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        title_ar: form.title.trim(),
        description: form.description.trim(),
        description_ar: form.description.trim(),
        category: form.category,
        opportunity_type: form.opportunityType,
        country_code: normalizedCountry,
        governorate: form.governorate,
        city: form.city,
        location: [form.city, form.governorate].filter(Boolean).join('، '),
        price: toNumber(form.price),
        monthly_profit: toNumber(form.monthlyProfit),
        expected_monthly_profit: toNumber(form.monthlyProfit),
        roi: toNumber(form.roi),
        profit_percentage: toNumber(form.roi),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        ...(isEditing ? { status: 'pending' } : { status: 'pending' }),
        verification_status: 'pending',
        is_verified: false,
        ...(cover ? { cover_image_url: cover, image_url: cover } : {}),
        ...(slug ? { slug } : {}),
        owner_auth_id: userData.user.id,
        auth_id: userData.user.id,
        user_id: userData.user.id,
        created_by: userData.user.id,
      };

      const { data } = isEditing
        ? await updateProjectWithFallback(editProjectId, payload)
        : await insertProjectWithFallback(payload);
      const projectId = String((data as { id?: string } | null)?.id || editProjectId || '');
      if (projectId && uploaded.length) await insertProjectImages(projectId, uploaded);

      if (projectId && verificationRequested && verificationFile && canVerifyProjects(userPlan)) {
        const verification = await uploadVerificationDocument(verificationFile, userData.user.id, projectId);
        await insertRowWithFallback('verification_requests', {
          user_auth_id: userData.user.id,
          project_id: projectId,
          request_type: 'project',
          status: 'pending',
          title: 'توثيق مشروع من صفحة إضافة المشروع',
          document_name: verificationFile.name,
          document_url: verification.publicUrl,
          file_url: verification.publicUrl,
          file_path: verification.path,
          storage_path: verification.path,
          note: 'طلب توثيق مدفوع مرفق مع إضافة/تعديل المشروع',
        });
      }

      setSuccess(isEditing ? (isAr ? 'تم تحديث المشروع بنجاح وإرساله للمراجعة.' : 'Project updated and sent for review.') : (isAr ? 'تم إرسال المشروع للمراجعة بنجاح.' : 'Project submitted for review successfully.'));
      if (onSaved) {
        setTimeout(onSaved, 700);
      } else {
        setTimeout(() => router.push(`/${normalizedCountry}/${lang}/dashboard`), 900);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (isAr ? 'حدث خطأ أثناء حفظ المشروع.' : 'Failed to save project.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingProject) return <div className="h-96 animate-pulse rounded-[3rem] bg-white shadow-sm" />;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-[3rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <p className="mb-3 inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">{isEditing ? (isAr ? 'تعديل مشروع' : 'Edit opportunity') : (isAr ? 'مشروع جديد' : 'New opportunity')}</p>
          <h1 className="text-3xl font-black text-slate-950 md:text-4xl">{isEditing ? (isAr ? 'تعديل بيانات المشروع' : 'Edit project details') : (isAr ? 'أضف مشروعك للمراجعة' : 'Submit your project for review')}</h1>
          <p className="mt-3 max-w-2xl leading-8 text-slate-600">
            {isEditing ? (isAr ? 'عدّل البيانات المطلوبة ثم احفظ التحديثات.' : 'Update the required fields, then save changes.') : (isAr ? 'املأ البيانات الأساسية وارفع صور المشروع. سيظهر المشروع بعد مراجعة الإدارة.' : 'Fill in the core details and upload project photos. It will go live after admin review.')}
          </p>
        </div>
        <span className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">{normalizedCountry.toUpperCase()}</span>
      </div>

      {error && <div className="rounded-3xl border border-red-100 bg-red-50 px-5 py-4 font-bold text-red-700">{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-3xl border border-emerald-100 bg-emerald-50 px-5 py-4 font-bold text-emerald-800"><CheckCircle2 size={20} /> {success}</div>}

      <section className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'اسم المشروع' : 'Project title'}</span>
          <input value={form.title} onChange={(e) => updateField('title', e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" placeholder={isAr ? 'مثال: مقهى قائم للبيع في مسقط' : 'Example: Operating cafe for sale'} />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'القطاع' : 'Category'}</span>
          <select value={form.category} onChange={(e) => updateField('category', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 font-bold outline-none focus:border-emerald-600">
            {sectorOptions.map((item) => <option key={item.value} value={item.value}>{item.icon ? `${item.icon} ` : ''}{isAr ? item.ar : item.en}</option>)}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'نوع الفرصة' : 'Opportunity type'}</span>
          <select value={form.opportunityType} onChange={(e) => updateField('opportunityType', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 font-bold outline-none focus:border-emerald-600">
            {opportunityTypes.map((item) => <option key={item.value} value={item.value}>{isAr ? item.ar : item.en}</option>)}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'المحافظة / المنطقة' : 'Region'}</span>
          <select value={form.governorate} onChange={(e) => updateGovernorate(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 font-bold outline-none focus:border-emerald-600">
            {locations.map((item) => <option key={item.ar} value={item.ar}>{isAr ? item.ar : item.en}</option>)}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'المدينة / الولاية' : 'City'}</span>
          <select value={form.city} onChange={(e) => updateField('city', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 font-bold outline-none focus:border-emerald-600">
            {activeCities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'وصف المشروع' : 'Project description'}</span>
          <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} className="min-h-40 w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold leading-8 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" placeholder={isAr ? 'اشرح المشروع، موقعه، سبب البيع أو نوع الشراكة، وأهم الأرقام.' : 'Describe the business, location, reason for sale or partnership type, and key numbers.'} />
        </label>
      </section>

      <section className="grid gap-4 rounded-[2rem] bg-slate-50 p-4 md:grid-cols-3">
        <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'السعر المطلوب' : 'Asking price'}</span>
          <input inputMode="numeric" value={form.price} onChange={(e) => updateField('price', e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none" placeholder="8000" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'الربح الشهري' : 'Monthly profit'}</span>
          <input inputMode="numeric" value={form.monthlyProfit} onChange={(e) => updateField('monthlyProfit', e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none" placeholder="700" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'نسبة العائد %' : 'ROI %'}</span>
          <input inputMode="numeric" value={form.roi} onChange={(e) => updateField('roi', e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none" placeholder="25" />
        </label>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'رقم الهاتف' : 'Phone'}</span>
          <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none" placeholder="+968..." />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-black text-slate-700">{isAr ? 'واتساب' : 'WhatsApp'}</span>
          <input value={form.whatsapp} onChange={(e) => updateField('whatsapp', e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none" placeholder="+968..." />
        </label>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">{isAr ? 'صور المشروع' : 'Project images'}</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">{isAr ? 'ارفع حتى 10 صور واختر صورة الغلاف.' : 'Upload up to 10 images and choose a cover.'}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-500">{images.length}/10</span>
        </div>

        <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addImages(e.dataTransfer.files); }} className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-[2rem] border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-6 text-center transition hover:bg-emerald-50">
          <UploadCloud className="text-emerald-700" size={34} />
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
                  <button type="button" onClick={() => setCover(index)} className={`rounded-full px-3 py-2 text-xs font-black shadow ${image.isCover ? 'bg-emerald-700 text-white' : 'bg-white text-slate-700'}`}>
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
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-amber-800 ring-1 ring-amber-100"><ShieldCheck size={17} /> {isAr ? 'عزز بيع مشروعك مع شارة الثقة' : 'Boost your sale with a trust badge'}</p>
            <h2 className="text-2xl font-black text-slate-950">{isAr ? 'المشروع الموثق يعطي المستثمر ثقة أعلى ويظهر بشكل أقوى.' : 'Verified projects earn more investor trust and stronger placement.'}</h2>
            <p className="mt-3 leading-8 text-slate-600">{isAr ? 'التوثيق متاح فقط للباقات المدفوعة. ارفع السجل التجاري أو أوراق المشروع ليتم مراجعتها من الإدارة وربط الشارة بالمشروع بعد الموافقة.' : 'Project verification is available for paid owner plans only. Upload business registration or project documents for admin review.'}</p>
          </div>
          {canVerifyProjects(userPlan) ? (
            <label className="min-w-[280px] cursor-pointer rounded-[1.5rem] border border-emerald-200 bg-white p-4 shadow-sm">
              <span className="mb-2 flex items-center gap-2 font-black text-emerald-800"><ShieldCheck size={18} /> {isAr ? 'طلب شارة مشروع موثق' : 'Request verified badge'}</span>
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

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
        <p className="max-w-xl text-sm font-bold leading-7 text-slate-500">
          {isAr ? 'سيتم إرسال المشروع إلى لوحة الإدارة للمراجعة قبل النشر.' : 'Your project will be submitted to admin review before publishing.'}
        </p>
        <button disabled={submitting} className="inline-flex min-w-44 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-7 py-4 font-black text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? <Loader2 className="animate-spin" size={20} /> : <ImagePlus size={20} />}
          {submitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : isEditing ? (isAr ? 'حفظ التعديلات' : 'Save changes') : (isAr ? 'إرسال للمراجعة' : 'Submit for review')}
        </button>
      </div>
    </form>
  );
}
