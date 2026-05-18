'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Crown,
  Edit3,
  Eye,
  FileCheck2,
  Globe2,
  Layers3,
  Loader2,
  LockKeyhole,
  Megaphone,
  MessageCircle,
  PackageCheck,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  XCircle,
  Star,
  Flag,
  ShieldAlert,
  FileText,
  CreditCard,
  Languages,
  Menu,
  X,
  Home,
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { getCurrentAppUser, firebaseCompatibleUserQuery } from '@/lib/auth-client';
import { getFirebaseIdToken } from '@/lib/firebase-client';
import { AnalyticsBars } from '@/components/AnalyticsBars';
import { isAdminRole } from '@/lib/account';
import { flattenDefaultTranslations } from '@/lib/i18n';

type Tab = 'overview' | 'publish_settings' | 'projects' | 'sectors' | 'verifications' | 'packages' | 'upgrades' | 'recommendations' | 'notifications' | 'users' | 'admins' | 'promotions' | 'ads' | 'countries' | 'slides' | 'analytics' | 'reports' | 'ratings' | 'logs' | 'seo' | 'payment' | 'languages';
type NoticeType = 'info' | 'success' | 'error';

type Notice = { type: NoticeType; text: string } | null;

type AdminUser = { id: string; email: string; name: string; role: string; permissions?: Record<string, boolean> | null; isSuper?: boolean };

type AdminInvite = {
  id?: string;
  email: string;
  name?: string | null;
  role: string;
  permissions?: Record<string, boolean> | null;
  status?: string | null;
  created_at?: string | null;
};

type PlatformLanguageRow = {
  id?: string;
  code: string;
  nameAr: string;
  nameEn: string;
  direction: 'rtl' | 'ltr';
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
};

type TranslationRow = {
  id?: string;
  translationKey: string;
  namespace: string;
  ar: string;
  en: string;
  notes?: string | null;
  isActive: boolean;
  updatedAt?: string | null;
};

const emptyLanguage: PlatformLanguageRow = { code: 'ar', nameAr: '', nameEn: '', direction: 'rtl', isDefault: false, isActive: true, sortOrder: 100 };
const emptyTranslation: TranslationRow = { translationKey: '', namespace: 'common', ar: '', en: '', notes: '', isActive: true };

const ADMIN_PERMISSION_OPTIONS = [
  { key: 'projects', label: 'إدارة المشاريع' },
  { key: 'verifications', label: 'إدارة التوثيق' },
  { key: 'packages', label: 'إدارة الباقات والترقيات' },
  { key: 'recommendations', label: 'إدارة التوصيات' },
  { key: 'notifications', label: 'إرسال الإشعارات' },
  { key: 'users', label: 'إدارة المستخدمين' },
  { key: 'content', label: 'إدارة الدول والسلايدر' },
  { key: 'analytics', label: 'مشاهدة التحليلات' },
];

const DEFAULT_ADMIN_PERMISSIONS = ADMIN_PERMISSION_OPTIONS.reduce((acc, item) => ({ ...acc, [item.key]: true }), {} as Record<string, boolean>);
const LIMITED_ADMIN_PERMISSIONS = ADMIN_PERMISSION_OPTIONS.reduce((acc, item) => ({ ...acc, [item.key]: ['projects', 'verifications', 'notifications', 'analytics'].includes(item.key) }), {} as Record<string, boolean>);
const emptyAdminForm = { email: '', name: '', role: 'admin', permissions: LIMITED_ADMIN_PERMISSIONS };

function isEffectiveAdminUser(user: any) {
  const status = String(user?.admin_status || '').toLowerCase();
  if (['revoked', 'suspended', 'inactive'].includes(status)) return false;
  const role = String(user?.admin_role || user?.role || '').toLowerCase();
  return user?.is_admin === true || ['admin', 'super_admin', 'verification_admin', 'content_admin', 'finance_admin', 'support_admin'].includes(role);
}


type AdminProject = {
  id: string;
  slug: string;
  title: string;
  description: string;
  countryCode: string;
  city: string;
  category: string;
  price: number;
  status: string;
  verified: boolean;
  verificationStatus: string;
  coverImage: string;
  ownerId: string;
  views: number;
  contacts: number;
  saves: number;
  createdAt: string;
  raw?: Record<string, any>;
  [key: string]: any;
};

type CountryRow = {
  id?: string;
  code: string;
  nameAr: string;
  nameEn: string;
  flag: string;
  currencyCode: string;
  symbolAr: string;
  symbolEn: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
};

type SlideRow = {
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

type AdRow = {
  id?: string;
  title: string;
  placement: string;
  imageUrl: string;
  linkUrl: string;
  countryCode: string;
  isActive: boolean;
  sortOrder: number;
};


type SectorRow = {
  id?: string;
  key: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  imageUrl: string;
  countryCode: string;
  isActive: boolean;
  sortOrder: number;
};

type CampaignRow = {
  id?: string;
  title: string;
  advertiserUserId?: string;
  entityType: string;
  entityId: string;
  placement: string;
  countryCode: string;
  impressions: number;
  clicks: number;
  budget: number;
  spent: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

type PromotionRequestRow = { id: string; project_id?: string | null; user_auth_id?: string | null; plan_code?: string | null; plan_name?: string | null; placement?: string | null; duration_days?: number | null; price?: number | null; amount?: number | null; status: string; note?: string | null; admin_note?: string | null; starts_at?: string | null; ends_at?: string | null; created_at?: string | null; promotion_views?: number | null; promotion_clicks?: number | null; promotion_contacts?: number | null; views?: number | null; clicks?: number | null; contacts?: number | null; impressions?: number | null };

type AdminNoteModal = null | {
  title: string;
  message?: string;
  initial?: string;
  confirmLabel?: string;
  onConfirm: (note: string) => void | Promise<void>;
};

type UserEditModal = null | { user: any; form: Record<string, any> };
type ProjectEditModal = null | { project: AdminProject; form: Record<string, any>; gallery: any[]; newImageUrl: string };

type PackageRow = {
  id?: string;
  code: string;
  nameAr: string;
  nameEn: string;
  packageType: string;
  price: number;
  currency: string;
  recommendationLimit: number;
  projectLimit: number;
  verificationIncluded: boolean;
  featuredIncluded: boolean;
  isActive: boolean;
  sortOrder: number;
};

type UpgradeRequest = {
  id: string;
  user_auth_id: string;
  package_code?: string | null;
  package_type?: string | null;
  status: string;
  payment_reference?: string | null;
  admin_note?: string | null;
  created_at?: string | null;
};

type VerificationRow = {
  id: string;
  user_auth_id: string;
  request_type?: string | null;
  type?: string | null;
  project_id?: string | null;
  project_title?: string | null;
  status: string;
  document_url?: string | null;
  admin_note?: string | null;
  created_at?: string | null;
};

type NotificationRow = {
  id?: string;
  user_auth_id?: string | null;
  title: string;
  body: string;
  type: string;
  is_read?: boolean;
  created_at?: string;
};

type ReportRow = {
  id: string;
  reporter_auth_id?: string | null;
  target_type: string;
  target_id?: string | null;
  project_id?: string | null;
  reported_user_auth_id?: string | null;
  reason?: string | null;
  description?: string | null;
  status: string;
  admin_note?: string | null;
  created_at?: string | null;
};

type RatingRow = {
  id: string;
  reviewer_auth_id?: string | null;
  reviewed_auth_id?: string | null;
  project_id?: string | null;
  rating: number;
  comment?: string | null;
  status: string;
  created_at?: string | null;
};



type PaymentRow = {
  id: string;
  provider?: string | null;
  payment_type?: string | null;
  purpose?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  user_auth_id?: string | null;
  project_id?: string | null;
  promotion_request_id?: string | null;
  plan_code?: string | null;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  provider_session_id?: string | null;
  webhook_status?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
  verified_at?: string | null;
};

type PaymentGatewaySettings = {
  provider: string;
  is_enabled: boolean;
  mode: 'test' | 'live';
  base_url: string;
  checkout_url: string;
  publishable_key: string;
  secret_key: string;
  webhook_url: string;
  has_secret_key?: boolean;
  updated_at?: string | null;
};

type ActivityLogRow = {
  id: string;
  admin_auth_id?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  details?: Record<string, any> | null;
  created_at?: string | null;
};

const emptyCountry: CountryRow = {
  code: '', nameAr: '', nameEn: '', flag: '', currencyCode: '', symbolAr: '', symbolEn: '', isDefault: false, isActive: true, sortOrder: 100,
};

const emptySlide: SlideRow = {
  titleAr: '', titleEn: '', subtitleAr: '', subtitleEn: '', buttonTextAr: '', buttonTextEn: '', buttonUrl: '', imageUrl: '', countryCode: 'om', isActive: true, slideOrder: 100,
};

const emptyPackage: PackageRow = {
  code: '', nameAr: '', nameEn: '', packageType: 'investor', price: 0, currency: 'OMR', recommendationLimit: 3, projectLimit: 1, verificationIncluded: false, featuredIncluded: false, isActive: true, sortOrder: 100,
};

const emptyAd: AdRow = {
  title: '', placement: 'home_top', imageUrl: '', linkUrl: '', countryCode: 'om', isActive: true, sortOrder: 100,
};

const emptySector: SectorRow = {
  key: '', nameAr: '', nameEn: '', icon: '◇', imageUrl: '', countryCode: 'om', isActive: true, sortOrder: 100,
};

const emptyCampaign: CampaignRow = {
  title: '', advertiserUserId: '', entityType: 'project', entityId: '', placement: 'home_sponsored', countryCode: 'om',
  impressions: 0, clicks: 0, budget: 0, spent: 0, startsAt: '', endsAt: '', isActive: true,
};

const emptyPaymentSettings: PaymentGatewaySettings = {
  provider: 'thawani',
  is_enabled: true,
  mode: 'test',
  base_url: 'https://uatcheckout.thawani.om/api/v1',
  checkout_url: 'https://uatcheckout.thawani.om',
  publishable_key: '',
  secret_key: '',
  webhook_url: '',
};

function normalizeCode(code: string) {
  return String(code || '').trim().toLowerCase();
}

function makeFlag(code: string) {
  const clean = normalizeCode(code).toUpperCase();
  if (clean.length !== 2) return '🌍';
  return clean.replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function pickString(row: Record<string, any>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value);
  }
  return fallback;
}

function pickNumber(row: Record<string, any>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return fallback;
}

function toProject(row: Record<string, any>): AdminProject {
  const title = pickString(row, ['title_ar', 'title', 'project_title', 'name_ar'], 'مشروع بدون عنوان');
  return {
    id: pickString(row, ['id']),
    slug: pickString(row, ['slug', 'id']),
    title,
    description: pickString(row, ['description_ar', 'description', 'summary_ar'], ''),
    countryCode: normalizeCode(pickString(row, ['country_code', 'country'], 'om')),
    city: pickString(row, ['city', 'location', 'governorate', 'region'], ''),
    category: pickString(row, ['category', 'sector'], 'services'),
    price: pickNumber(row, ['price', 'project_price', 'asking_price'], 0),
    status: pickString(row, ['status'], 'pending'),
    verified: row.is_verified === true || row.verified === true || row.verification_status === 'approved',
    verificationStatus: pickString(row, ['verification_status'], row.is_verified ? 'approved' : 'none'),
    coverImage: pickString(row, ['cover_image', 'cover_image_url', 'image_url', 'thumbnail'], ''),
    ownerId: pickString(row, ['owner_auth_id', 'user_auth_id', 'auth_id', 'user_id', 'created_by'], ''),
    views: pickNumber(row, ['views_count', 'views'], 0),
    contacts: pickNumber(row, ['contacts_count', 'contact_count'], 0),
    saves: pickNumber(row, ['saves_count', 'saved_count'], 0),
    createdAt: pickString(row, ['created_at'], ''),
    raw: row,
    opportunityType: pickString(row, ['opportunity_type', 'project_type', 'type', 'listing_type'], ''),
    descriptionAr: pickString(row, ['description_ar', 'description'], ''),
    descriptionEn: pickString(row, ['description_en'], ''),
    roi: pickNumber(row, ['roi', 'expected_roi', 'profit_percentage'], 0),
    fundingAmount: pickNumber(row, ['funding_amount', 'required_funding', 'investment_amount'], 0),
    partnershipPercent: pickNumber(row, ['partnership_percent', 'partnership_percentage', 'equity_percentage'], 0),
    franchiseFee: pickNumber(row, ['franchise_fee'], 0),
    monthlyProfit: pickNumber(row, ['monthly_profit', 'net_monthly_profit'], 0),
    employeesCount: pickNumber(row, ['employees_count', 'employees'], 0),
    yearsOperating: pickNumber(row, ['years_operating', 'operating_years'], 0),
    paybackPeriod: pickString(row, ['payback_period', 'return_period'], ''),
    mapLat: row.map_lat ?? row.lat ?? null,
    mapLng: row.map_lng ?? row.lng ?? null,
    contactPhone: pickString(row, ['contact_phone', 'phone'], ''),
    contactWhatsapp: pickString(row, ['contact_whatsapp', 'whatsapp'], ''),
    phoneCountryCode: pickString(row, ['phone_country_code'], '+968'),
    whatsappCountryCode: pickString(row, ['whatsapp_country_code'], '+968'),
  };
}

function toCountry(row: Record<string, any>): CountryRow {
  const code = normalizeCode(pickString(row, ['code'], 'om'));
  return {
    id: pickString(row, ['id'], ''),
    code,
    nameAr: pickString(row, ['name_ar', 'nameAr'], code.toUpperCase()),
    nameEn: pickString(row, ['name_en', 'nameEn'], code.toUpperCase()),
    flag: pickString(row, ['flag'], makeFlag(code)),
    currencyCode: pickString(row, ['currency_code', 'currency'], 'OMR'),
    symbolAr: pickString(row, ['currency_symbol_ar', 'currency_ar', 'symbol_ar'], 'OMR'),
    symbolEn: pickString(row, ['currency_symbol_en', 'currency_en', 'symbol_en'], 'OMR'),
    isDefault: row.is_default === true,
    isActive: row.is_active !== false,
    sortOrder: pickNumber(row, ['sort_order'], 100),
  };
}

function toSlide(row: Record<string, any>): SlideRow {
  return {
    id: pickString(row, ['id'], ''),
    titleAr: pickString(row, ['title_ar'], ''),
    titleEn: pickString(row, ['title_en'], ''),
    subtitleAr: pickString(row, ['subtitle_ar'], ''),
    subtitleEn: pickString(row, ['subtitle_en'], ''),
    buttonTextAr: pickString(row, ['button_text_ar'], ''),
    buttonTextEn: pickString(row, ['button_text_en'], ''),
    buttonUrl: pickString(row, ['button_url'], ''),
    imageUrl: pickString(row, ['image_url'], ''),
    countryCode: normalizeCode(pickString(row, ['country_code'], 'om')),
    isActive: row.is_active !== false,
    slideOrder: pickNumber(row, ['slide_order', 'sort_order'], 100),
  };
}


function toAd(row: Record<string, any>): AdRow {
  return {
    id: pickString(row, ['id'], ''),
    title: pickString(row, ['title', 'name', 'description'], ''),
    placement: pickString(row, ['placement', 'position', 'page'], 'home_top'),
    imageUrl: pickString(row, ['image_url', 'banner_url', 'media_url'], ''),
    linkUrl: pickString(row, ['link_url', 'url', 'target_url'], ''),
    countryCode: normalizeCode(pickString(row, ['country_code'], 'om')),
    isActive: row.is_active !== false,
    sortOrder: pickNumber(row, ['sort_order'], 100),
  };
}


function toSector(row: Record<string, any>): SectorRow {
  return {
    id: pickString(row, ['id'], ''),
    key: pickString(row, ['key', 'slug', 'code'], '').toLowerCase(),
    nameAr: pickString(row, ['name_ar', 'title_ar', 'name'], ''),
    nameEn: pickString(row, ['name_en', 'title_en', 'name'], ''),
    icon: pickString(row, ['icon', 'emoji', 'symbol'], '◇'),
    imageUrl: pickString(row, ['image_url', 'image', 'icon_url'], ''),
    countryCode: normalizeCode(pickString(row, ['country_code'], 'om')),
    isActive: row.is_active !== false,
    sortOrder: pickNumber(row, ['sort_order', 'order'], 100),
  };
}

function toCampaign(row: Record<string, any>): CampaignRow {
  return {
    id: pickString(row, ['id'], ''),
    title: pickString(row, ['title'], ''),
    advertiserUserId: pickString(row, ['advertiser_user_id'], ''),
    entityType: pickString(row, ['entity_type'], 'project'),
    entityId: pickString(row, ['entity_id'], ''),
    placement: pickString(row, ['placement'], 'home_sponsored'),
    countryCode: normalizeCode(pickString(row, ['country_code'], 'om')),
    impressions: pickNumber(row, ['impressions'], 0),
    clicks: pickNumber(row, ['clicks'], 0),
    budget: pickNumber(row, ['budget'], 0),
    spent: pickNumber(row, ['spent'], 0),
    startsAt: pickString(row, ['starts_at'], ''),
    endsAt: pickString(row, ['ends_at'], ''),
    isActive: row.is_active !== false,
  };
}

function toPackage(row: Record<string, any>): PackageRow {
  return {
    id: pickString(row, ['id'], ''),
    code: pickString(row, ['code'], ''),
    nameAr: pickString(row, ['name_ar', 'name'], ''),
    nameEn: pickString(row, ['name_en'], ''),
    packageType: pickString(row, ['package_type', 'type'], 'investor'),
    price: pickNumber(row, ['price'], 0),
    currency: pickString(row, ['currency'], 'OMR'),
    recommendationLimit: pickNumber(row, ['recommendation_limit', 'recommendations_limit'], 3),
    projectLimit: pickNumber(row, ['project_limit', 'projects_limit'], 1),
    verificationIncluded: row.verification_included === true || row.can_verify_project === true,
    featuredIncluded: row.featured_included === true || row.can_feature_project === true,
    isActive: row.is_active !== false,
    sortOrder: pickNumber(row, ['sort_order'], 100),
  };
}

function money(value: number) {
  return new Intl.NumberFormat('ar-OM').format(value || 0);
}

function statusMeta(status: string) {
  const s = String(status || 'pending').toLowerCase();
  if (['approved', 'active', 'published'].includes(s)) return { label: 'منشور', cls: 'bg-blue-50 text-blue-700 ring-blue-100', icon: CheckCircle2 };
  if (['rejected', 'declined'].includes(s)) return { label: 'مرفوض', cls: 'bg-rose-50 text-rose-700 ring-rose-100', icon: XCircle };
  if (['revision', 'needs_revision', 'needs-revision'].includes(s)) return { label: 'يحتاج تعديل', cls: 'bg-orange-50 text-orange-700 ring-orange-100', icon: Edit3 };
  return { label: 'قيد المراجعة', cls: 'bg-amber-50 text-amber-700 ring-amber-100', icon: Clock3 };
}


function exportRowsCsv(filename: string, rows: Record<string, any>[]) {
  if (typeof window === 'undefined') return;
  const safeRows = rows || [];
  const headerSet = new Set<string>();
  safeRows.forEach((row) => Object.keys(row || {}).forEach((key) => headerSet.add(key)));
  const headers = Array.from(headerSet);
  const escape = (value: any) => `"${String(value ?? '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
  const csv = [headers.join(','), ...safeRows.map((row) => headers.map((key) => escape((row as any)[key])).join(','))].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function AdminStat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" /></div>
      <p className="mt-4 text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function asCount(result: any) {
  return typeof result?.count === 'number' ? result.count : 0;
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [slides, setSlides] = useState<SlideRow[]>([]);
  const [ads, setAds] = useState<AdRow[]>([]);
  const [sectors, setSectors] = useState<SectorRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [promotionRequests, setPromotionRequests] = useState<PromotionRequestRow[]>([]);
  const [sliderEnabled, setSliderEnabled] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [adminInvites, setAdminInvites] = useState<AdminInvite[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [upgrades, setUpgrades] = useState<UpgradeRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);
  const [analytics, setAnalytics] = useState({ saves: 0, contacted: 0, conversations: 0, messages: 0, views: 0 });
  const [projectPublishMode, setProjectPublishMode] = useState<'auto' | 'manual'>('manual');
  const [adminLang, setAdminLang] = useState<'ar' | 'en'>('ar');
  const [adminMobileMenuOpen, setAdminMobileMenuOpen] = useState(false);

  const [query, setQuery] = useState('');
  const [projectStatus, setProjectStatus] = useState('all');
  const [countryForm, setCountryForm] = useState<CountryRow>(emptyCountry);
  const [slideForm, setSlideForm] = useState<SlideRow>(emptySlide);
  const [packageForm, setPackageForm] = useState<PackageRow>(emptyPackage);
  const [adForm, setAdForm] = useState<AdRow>(emptyAd);
  const [sectorForm, setSectorForm] = useState<SectorRow>(emptySector);
  const [campaignForm, setCampaignForm] = useState<CampaignRow>(emptyCampaign);
  const [adminNoteModal, setAdminNoteModal] = useState<AdminNoteModal>(null);
  const [userEditModal, setUserEditModal] = useState<UserEditModal>(null);
  const [projectEditModal, setProjectEditModal] = useState<ProjectEditModal>(null);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', body: '', type: 'system', targetRole: 'all' });
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [userQuery, setUserQuery] = useState('');
  const [verificationStatusFilter, setVerificationStatusFilter] = useState('all');
  const [upgradeStatusFilter, setUpgradeStatusFilter] = useState('all');
  const [reportStatusFilter, setReportStatusFilter] = useState('open');
  const [ratingStatusFilter, setRatingStatusFilter] = useState('all');
  const [paymentSettings, setPaymentSettings] = useState<PaymentGatewaySettings>(emptyPaymentSettings);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [languages, setLanguages] = useState<PlatformLanguageRow[]>([]);
  const [translations, setTranslations] = useState<TranslationRow[]>([]);
  const [languageForm, setLanguageForm] = useState<PlatformLanguageRow>(emptyLanguage);
  const [translationForm, setTranslationForm] = useState<TranslationRow>(emptyTranslation);
  const [translationQuery, setTranslationQuery] = useState('');
  const [paymentSettingsLoading, setPaymentSettingsLoading] = useState(false);
  const [paymentSettingsMessage, setPaymentSettingsMessage] = useState('');

  async function checkAdmin() {
    // المسار الجديد للإدارة مستقل عن تسجيل دخول المستخدمين.
    // هذا يحل مشكلة Firebase/Supabase session ويجعل دخول الإدارة عبر كلمة مرور خاصة.
    try {
      const response = await fetch('/api/admin-session', { cache: 'no-store' });
      const json = await response.json().catch(() => ({}));
      if (response.ok && json?.authenticated === true) {
        setAccessDenied(false);
        setAdmin({
          id: 'admin-session',
          email: 'admin@eloinvestor.local',
          name: 'Admin',
          role: 'super_admin',
          permissions: { all: true },
          isSuper: true,
        });
        return true;
      }
    } catch (error) {
      console.warn('Admin password session check skipped:', error);
    }

    const user = await getCurrentAppUser();
    if (!user) {
      setAccessDenied(true);
      setLoading(false);
      return false;
    }

    let profile: any = null;

    // Firebase admin check MUST use a server API with service role.
    // Client-side Supabase queries may be blocked by RLS and Firebase UID is not a UUID.
    try {
      const firebaseToken = await getFirebaseIdToken();
      if (firebaseToken) {
        const response = await fetch('/api/auth/firebase-admin-check', {
          method: 'POST',
          headers: { Authorization: `Bearer ${firebaseToken}` },
          cache: 'no-store',
        });
        const json = await response.json().catch(() => ({}));
        if (response.ok && json?.allowed && json?.profile) profile = json.profile;
      }
    } catch (error) {
      console.warn('Firebase admin check skipped:', error);
    }

    // If the user is not admin, still sync/create normal profile without overwriting admin roles.
    if (!profile) {
      try {
        const firebaseToken = await getFirebaseIdToken();
        if (firebaseToken) {
          const response = await fetch('/api/auth/firebase-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${firebaseToken}` },
            body: JSON.stringify({ login_source: 'admin_check' }),
          });
          const json = await response.json().catch(() => ({}));
          if (response.ok && json?.profile) profile = json.profile;
        }
      } catch (error) {
        console.warn('Firebase profile lookup skipped:', error);
      }
    }

    if (!profile) {
      const rpcProfile = await supabaseBrowser.rpc('admin_get_my_profile');
      if (!rpcProfile.error && Array.isArray(rpcProfile.data) && rpcProfile.data[0]) {
        profile = rpcProfile.data[0];
      }
    }

    if (!profile) {
      const directProfile = await supabaseBrowser
        .from('users')
        .select('*')
        .or(firebaseCompatibleUserQuery(user))
        .maybeSingle();
      if (!directProfile.error) profile = directProfile.data;
    }

    const role = String(profile?.admin_role || profile?.role || user.user_metadata?.admin_role || user.user_metadata?.role || '').toLowerCase();
    const status = String(profile?.admin_status || 'active').toLowerCase();
    const allowed = (profile?.is_admin === true || isAdminRole(role)) && status !== 'suspended' && status !== 'revoked';
    if (!allowed) {
      setAccessDenied(true);
      setLoading(false);
      return false;
    }
    setAccessDenied(false);
    setAdmin({
      id: user.id,
      email: user.email || profile?.email || '',
      name: String(profile?.name || profile?.full_name || user.user_metadata?.name || user.email || 'Admin'),
      role,
      permissions: profile?.admin_permissions || {},
      isSuper: role === 'super_admin' || profile?.admin_permissions?.all === true,
    });
    return true;
  }

  async function safeCount(table: string) {
    const { count, error } = await supabaseBrowser.from(table).select('id', { count: 'exact', head: true });
    if (error) return 0;
    return count || 0;
  }

  async function logAction(action: string, targetType: string, targetId: string, details: Record<string, any> = {}) {
    try {
      await supabaseBrowser.from('admin_action_logs').insert({
        admin_auth_id: admin?.id || null,
        action,
        target_type: targetType,
        target_id: targetId || null,
        details,
      });
    } catch (err) {
      console.warn('Admin log skipped:', err);
    }
  }

  async function notifyUser(userAuthId: string | null | undefined, title: string, body: string, type = 'system') {
    if (!userAuthId) return;
    try {
      await supabaseBrowser.from('notifications').insert({
        user_auth_id: userAuthId,
        title,
        body,
        type,
        is_read: false,
      });
    } catch (err) {
      console.warn('Notification skipped:', err);
    }
  }


  async function getAccessToken() {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token || '';
  }

  async function loadPaymentSettings() {
    setPaymentSettingsLoading(true);
    setPaymentSettingsMessage('');
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/admin/payment-gateway-settings?provider=thawani', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'تعذر تحميل إعدادات الدفع');
      setPaymentSettings({ ...emptyPaymentSettings, ...(payload.settings || {}) });
    } catch (error) {
      setPaymentSettingsMessage(error instanceof Error ? error.message : 'تعذر تحميل إعدادات الدفع');
    } finally {
      setPaymentSettingsLoading(false);
    }
  }

  async function savePaymentSettings(event?: React.FormEvent) {
    event?.preventDefault();
    setSaving(true);
    setPaymentSettingsMessage('');
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/admin/payment-gateway-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ provider: 'thawani', settings: paymentSettings }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'تعذر حفظ إعدادات الدفع');
      setPaymentSettings({ ...emptyPaymentSettings, ...(payload.settings || {}), secret_key: '' });
      setPaymentSettingsMessage('تم حفظ إعدادات بوابة الدفع بنجاح.');
      await logAction('save_payment_gateway_settings', 'payment_gateway_settings', 'thawani', { mode: paymentSettings.mode, is_enabled: paymentSettings.is_enabled });
    } catch (error) {
      setPaymentSettingsMessage(error instanceof Error ? error.message : 'تعذر حفظ إعدادات الدفع');
    } finally {
      setSaving(false);
    }
  }

  async function testPaymentSettings() {
    setPaymentSettingsLoading(true);
    setPaymentSettingsMessage('');
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/admin/payment-gateway-settings/test?provider=thawani', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'فشل اختبار الاتصال');
      setPaymentSettingsMessage(payload.message || 'الاتصال مع ثواني ناجح.');
    } catch (error) {
      setPaymentSettingsMessage(error instanceof Error ? error.message : 'فشل اختبار الاتصال');
    } finally {
      setPaymentSettingsLoading(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    setNotice(null);
    const ok = await checkAdmin();
    if (!ok) return;

    const [projectResult, countriesResult, slidesResult, adsResult, sectorsResult, campaignsResult, promotionRequestsResult, paymentsResult, languagesResult, translationsResult, sliderSettingResult, publishModeSettingResult, usersResult, packagesResult, verificationResult, upgradesResult, notificationsResult, adminInvitesResult, reportsResult, ratingsResult, logsResult, savesCount, contactedCount, conversationsCount, messagesCount, viewsCount] = await Promise.allSettled([
      supabaseBrowser.from('projects').select('*').order('created_at', { ascending: false }).limit(500),
      supabaseBrowser.from('platform_countries').select('*').order('sort_order', { ascending: true }),
      supabaseBrowser.from('homepage_slides').select('*').order('slide_order', { ascending: true }),
      supabaseBrowser.from('platform_ads').select('*').order('sort_order', { ascending: true }),
      supabaseBrowser.from('platform_sectors').select('*').order('sort_order', { ascending: true }),
      supabaseBrowser.from('ad_campaigns').select('*').order('created_at', { ascending: false }).limit(300),
      supabaseBrowser.from('promotion_requests').select('*').order('created_at', { ascending: false }).limit(300),
      supabaseBrowser.from('payments').select('*').order('created_at', { ascending: false }).limit(500),
      supabaseBrowser.from('platform_languages').select('*').order('sort_order', { ascending: true }),
      supabaseBrowser.from('platform_translations').select('*').order('namespace', { ascending: true }).order('translation_key', { ascending: true }).limit(1000),
      supabaseBrowser.from('platform_settings').select('value').eq('key', 'homepage_slider_enabled').maybeSingle(),
      supabaseBrowser.from('platform_settings').select('value').eq('key', 'project_publish_mode').maybeSingle(),
      supabaseBrowser.rpc('admin_list_users', { search_text: null, result_limit: 500 }),
      supabaseBrowser.from('subscription_packages').select('*').order('sort_order', { ascending: true }),
      supabaseBrowser.from('verification_requests').select('*').order('created_at', { ascending: false }).limit(300),
      supabaseBrowser.from('subscription_requests').select('*').order('created_at', { ascending: false }).limit(300),
      supabaseBrowser.from('notifications').select('*').order('created_at', { ascending: false }).limit(150),
      supabaseBrowser.from('admin_invites').select('*').order('created_at', { ascending: false }).limit(200),
      supabaseBrowser.from('reports').select('*').order('created_at', { ascending: false }).limit(500),
      supabaseBrowser.from('deal_ratings').select('*').order('created_at', { ascending: false }).limit(500),
      supabaseBrowser.from('admin_action_logs').select('*').order('created_at', { ascending: false }).limit(500),
      safeCount('investor_saved_projects'),
      safeCount('investor_contacted_projects'),
      safeCount('conversations'),
      safeCount('messages'),
      safeCount('project_views_log'),
    ]);

    if (projectResult.status === 'fulfilled' && !projectResult.value.error) setProjects((projectResult.value.data || []).map(toProject));
    if (countriesResult.status === 'fulfilled' && !countriesResult.value.error) setCountries((countriesResult.value.data || []).map(toCountry));
    if (slidesResult.status === 'fulfilled' && !slidesResult.value.error) setSlides((slidesResult.value.data || []).map(toSlide));
    if (adsResult.status === 'fulfilled' && !adsResult.value.error) setAds((adsResult.value.data || []).map(toAd));
    if (sectorsResult.status === 'fulfilled' && !sectorsResult.value.error) setSectors((sectorsResult.value.data || []).map(toSector));
    if (campaignsResult.status === 'fulfilled' && !campaignsResult.value.error) setCampaigns((campaignsResult.value.data || []).map(toCampaign));
    if (promotionRequestsResult.status === 'fulfilled' && !promotionRequestsResult.value.error) setPromotionRequests((promotionRequestsResult.value.data || []) as any);
    if (paymentsResult.status === 'fulfilled' && !paymentsResult.value.error) setPayments((paymentsResult.value.data || []) as any);
    if (languagesResult.status === 'fulfilled' && !languagesResult.value.error) setLanguages((languagesResult.value.data || []).map(toLanguage));
    if (translationsResult.status === 'fulfilled' && !translationsResult.value.error) setTranslations((translationsResult.value.data || []).map(toTranslation));
    if (sliderSettingResult.status === 'fulfilled' && !sliderSettingResult.value.error) {
      const raw = String((sliderSettingResult.value.data as any)?.value ?? 'true').toLowerCase();
      setSliderEnabled(!['false', '0', 'off', 'disabled'].includes(raw));
    }
    if (publishModeSettingResult.status === 'fulfilled' && !publishModeSettingResult.value.error) {
      const raw = String((publishModeSettingResult.value.data as any)?.value ?? 'manual').toLowerCase();
      setProjectPublishMode(['auto', 'automatic', 'approved', 'published'].includes(raw) ? 'auto' : 'manual');
    }
    if (usersResult.status === 'fulfilled' && !usersResult.value.error) {
      setUsers(usersResult.value.data || []);
    } else {
      const rpcUsers = await supabaseBrowser.rpc('admin_get_users');
      if (!rpcUsers.error) setUsers(rpcUsers.data || []);
      else setNotice({ type: 'error', text: `لم يتم تحميل المستخدمين: ${rpcUsers.error.message}` });
    }
    if (packagesResult.status === 'fulfilled' && !packagesResult.value.error) setPackages((packagesResult.value.data || []).map(toPackage));
    if (verificationResult.status === 'fulfilled' && !verificationResult.value.error) setVerifications((verificationResult.value.data || []) as any);
    if (upgradesResult.status === 'fulfilled' && !upgradesResult.value.error) setUpgrades((upgradesResult.value.data || []) as any);
    if (notificationsResult.status === 'fulfilled' && !notificationsResult.value.error) setNotifications((notificationsResult.value.data || []) as any);
    if (adminInvitesResult.status === 'fulfilled' && !adminInvitesResult.value.error) setAdminInvites((adminInvitesResult.value.data || []) as any);
    if (reportsResult.status === 'fulfilled' && !reportsResult.value.error) setReports((reportsResult.value.data || []) as any);
    if (ratingsResult.status === 'fulfilled' && !ratingsResult.value.error) setRatings((ratingsResult.value.data || []) as any);
    if (logsResult.status === 'fulfilled' && !logsResult.value.error) setActivityLogs((logsResult.value.data || []) as any);
    setAnalytics({
      saves: savesCount.status === 'fulfilled' ? Number(savesCount.value || 0) : 0,
      contacted: contactedCount.status === 'fulfilled' ? Number(contactedCount.value || 0) : 0,
      conversations: conversationsCount.status === 'fulfilled' ? Number(conversationsCount.value || 0) : 0,
      messages: messagesCount.status === 'fulfilled' ? Number(messagesCount.value || 0) : 0,
      views: viewsCount.status === 'fulfilled' ? Number(viewsCount.value || 0) : 0,
    });
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  useEffect(() => { if (tab === 'payment') loadPaymentSettings(); }, [tab]);

  const stats = useMemo(() => {
    const pendingVerifications = verifications.filter((v) => String(v.status || 'pending') === 'pending').length;
    const pendingUpgrades = upgrades.filter((u) => String(u.status || 'pending') === 'pending').length;
    const premiumUsers = users.filter((u) => ['pro', 'elite', 'business', 'premium'].includes(String(u.subscription_status || u.plan || '').toLowerCase())).length;
    const adminUsers = users.filter(isEffectiveAdminUser).length;
    return {
      projects: projects.length,
      pendingProjects: projects.filter((p) => !['approved', 'active', 'published'].includes(String(p.status).toLowerCase())).length,
      users: users.length,
      premiumUsers,
      adminUsers,
      verifications: pendingVerifications,
      upgrades: pendingUpgrades,
      packages: packages.filter((p) => p.isActive).length,
      reports: reports.filter((r) => ['open', 'pending', 'reviewing'].includes(String(r.status || 'open').toLowerCase())).length,
      ratings: ratings.length,
      logs: activityLogs.length,
      revenue: payments.filter((p) => String(p.status || '').toLowerCase() === 'paid').reduce((sum, p) => sum + Number(p.amount || 0), 0),
    };
  }, [projects, users, verifications, upgrades, packages, reports, ratings, activityLogs, payments]);

  const isSuperAdmin = useMemo(() => admin?.isSuper === true || String(admin?.role || '').toLowerCase() === 'super_admin', [admin]);

  const adminAccounts = useMemo(() => users.filter(isEffectiveAdminUser), [users]);

  const userByAuth = useMemo(() => {
    const map = new Map<string, any>();
    users.forEach((u) => {
      [u.auth_id, u.id, u.email].filter(Boolean).forEach((key) => map.set(String(key), u));
    });
    return map;
  }, [users]);

  const projectById = useMemo(() => {
    const map = new Map<string, AdminProject>();
    projects.forEach((project) => map.set(String(project.id), project));
    return map;
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchStatus = projectStatus === 'all' || project.status === projectStatus;
      const q = query.trim().toLowerCase();
      const matchQuery = !q || [project.title, project.city, project.category, project.countryCode, project.ownerId].join(' ').toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [projects, projectStatus, query]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => [user.name, user.full_name, user.email, user.phone, user.role, user.account_type, user.subscription_status, user.plan].join(' ').toLowerCase().includes(q));
  }, [users, userQuery]);

  const filteredVerifications = useMemo(() => {
    if (verificationStatusFilter === 'all') return verifications;
    return verifications.filter((item) => String(item.status || 'pending').toLowerCase() === verificationStatusFilter);
  }, [verifications, verificationStatusFilter]);

  const filteredUpgrades = useMemo(() => {
    if (upgradeStatusFilter === 'all') return upgrades;
    return upgrades.filter((item) => String(item.status || 'pending').toLowerCase() === upgradeStatusFilter);
  }, [upgrades, upgradeStatusFilter]);

  const filteredReports = useMemo(() => {
    if (reportStatusFilter === 'all') return reports;
    return reports.filter((item) => String(item.status || 'open').toLowerCase() === reportStatusFilter);
  }, [reports, reportStatusFilter]);

  const filteredRatings = useMemo(() => {
    if (ratingStatusFilter === 'all') return ratings;
    return ratings.filter((item) => String(item.status || 'published').toLowerCase() === ratingStatusFilter);
  }, [ratings, ratingStatusFilter]);


  const filteredTranslations = useMemo(() => {
    const q = translationQuery.trim().toLowerCase();
    if (!q) return translations;
    return translations.filter((item) => [item.translationKey, item.namespace, item.ar, item.en].join(' ').toLowerCase().includes(q));
  }, [translations, translationQuery]);


  async function saveLanguage(event: React.FormEvent) {
    event.preventDefault();
    if (!languageForm.code || !languageForm.nameAr) return setNotice({ type: 'error', text: 'أدخل كود اللغة والاسم العربي.' });
    setSaving(true);
    const payload = {
      ...(languageForm.id ? { id: languageForm.id } : {}),
      code: languageForm.code.trim().toLowerCase(),
      name: languageForm.nameAr || languageForm.nameEn || languageForm.code.trim().toUpperCase(),
      name_ar: languageForm.nameAr,
      name_en: languageForm.nameEn || languageForm.nameAr,
      direction: languageForm.direction || 'rtl',
      is_default: languageForm.isDefault,
      is_active: languageForm.isActive,
      sort_order: Number(languageForm.sortOrder || 100),
    };
    const { error } = await supabaseBrowser.from('platform_languages').upsert(payload, { onConflict: 'code' });
    setSaving(false);
    if (error) return setNotice({ type: 'error', text: error.message });
    await logAction('save_language', 'platform_language', payload.code, payload);
    setLanguageForm(emptyLanguage);
    setNotice({ type: 'success', text: 'تم حفظ اللغة.' });
    await loadAll();
  }

  async function saveTranslation(event: React.FormEvent) {
    event.preventDefault();
    if (!translationForm.translationKey || !translationForm.namespace) return setNotice({ type: 'error', text: 'أدخل مفتاح الترجمة والقسم.' });
    setSaving(true);
    const payload = {
      ...(translationForm.id ? { id: translationForm.id } : {}),
      translation_key: translationForm.translationKey.trim(),
      namespace: translationForm.namespace.trim() || 'common',
      ar: translationForm.ar,
      en: translationForm.en,
      notes: translationForm.notes || null,
      is_active: translationForm.isActive,
    };
    const { error } = await supabaseBrowser.from('platform_translations').upsert(payload, { onConflict: 'namespace,translation_key' });
    setSaving(false);
    if (error) return setNotice({ type: 'error', text: error.message });
    await logAction('save_translation', 'platform_translation', `${payload.namespace}.${payload.translation_key}`, payload);
    setTranslationForm(emptyTranslation);
    setNotice({ type: 'success', text: 'تم حفظ الترجمة.' });
    await loadAll();
  }

  async function toggleLanguage(language: PlatformLanguageRow) {
    setSaving(true);
    const { error } = await supabaseBrowser.from('platform_languages').update({ is_active: !language.isActive }).eq('code', language.code);
    setSaving(false);
    if (error) return setNotice({ type: 'error', text: error.message });
    await logAction('toggle_language', 'platform_language', language.code, { is_active: !language.isActive });
    await loadAll();
  }

  async function autoTranslateCurrent() {
    const ar = translationForm.ar.trim();
    const en = translationForm.en.trim();
    if (!ar && !en) return setNotice({ type: 'error', text: 'أدخل النص العربي أو الإنجليزي أولًا.' });
    setSaving(true);
    try {
      if (ar && !en) {
        const response = await fetch('/api/admin/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: ar, source: 'ar', target: 'en' }),
        });
        const json = await response.json();
        setTranslationForm((f) => ({ ...f, en: json.translatedText || `[Needs translation] ${ar}` }));
      } else if (en && !ar) {
        const response = await fetch('/api/admin/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: en, source: 'en', target: 'ar' }),
        });
        const json = await response.json();
        setTranslationForm((f) => ({ ...f, ar: json.translatedText || `[بحاجة ترجمة] ${en}` }));
      }
      setNotice({ type: 'success', text: 'تم تجهيز الترجمة عبر مزود الترجمة أو fallback المحلي. راجع النص ثم اضغط حفظ.' });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'فشل الترجمة التلقائية.' });
    } finally {
      setSaving(false);
    }
  }


  async function seedDefaultTranslations() {
    setSaving(true);
    const rows = flattenDefaultTranslations();
    const { error } = await supabaseBrowser
      .from('platform_translations')
      .upsert(rows, { onConflict: 'namespace,translation_key' });
    setSaving(false);
    if (error) return setNotice({ type: 'error', text: error.message });
    await logAction('seed_default_translations', 'platform_translations', 'defaults', { count: rows.length });
    setNotice({ type: 'success', text: `تمت مزامنة ${rows.length} نص افتراضي.` });
    await loadAll();
  }

  async function importTranslationsJson(file: File | null) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, Record<string, any>>;
      const rows: any[] = [];
      Object.entries(parsed).forEach(([namespace, bucket]) => {
        Object.entries(bucket || {}).forEach(([translationKey, value]) => {
          if (typeof value === 'string') {
            rows.push({ namespace, translation_key: translationKey, ar: value, en: '', is_active: true });
          } else {
            rows.push({
              namespace,
              translation_key: translationKey,
              ar: value?.ar || '',
              en: value?.en || '',
              notes: value?.notes || null,
              is_active: value?.active ?? value?.is_active ?? true,
            });
          }
        });
      });
      if (!rows.length) return setNotice({ type: 'error', text: 'ملف JSON لا يحتوي ترجمات صالحة.' });
      setSaving(true);
      const { error } = await supabaseBrowser.from('platform_translations').upsert(rows, { onConflict: 'namespace,translation_key' });
      setSaving(false);
      if (error) return setNotice({ type: 'error', text: error.message });
      await logAction('import_translations_json', 'platform_translations', 'json', { count: rows.length, filename: file.name });
      setNotice({ type: 'success', text: `تم استيراد ${rows.length} ترجمة.` });
      await loadAll();
    } catch (error) {
      setSaving(false);
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'فشل استيراد ملف JSON.' });
    }
  }

  async function updateProject(id: string, patch: Record<string, any>) {
    setSaving(true);
    setNotice(null);
    const safePatch = { ...patch };
    if (String(safePatch.status || '').toLowerCase() === 'rejected') safePatch.is_active = false;
    if (['approved', 'active', 'published'].includes(String(safePatch.status || '').toLowerCase())) safePatch.is_active = true;
    const { error } = await supabaseBrowser.from('projects').update(safePatch).eq('id', id);
    setSaving(false);
    if (error) return setNotice({ type: 'error', text: error.message });
    const project = projects.find((item) => item.id === id);
    await logAction('update_project', 'project', id, safePatch);
    if (project?.ownerId && patch.status) {
      await notifyUser(project.ownerId, 'تحديث حالة مشروعك', `تم تغيير حالة مشروعك: ${project.title}`, 'project');
    }
    setNotice({ type: 'success', text: 'تم تحديث المشروع.' });
    await loadAll();
  }

  async function deleteProject(id: string) {
    if (!confirm('هل تريد حذف المشروع نهائيًا؟')) return;
    setSaving(true);
    const { error } = await supabaseBrowser.from('projects').delete().eq('id', id);
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else {
      await logAction('delete_project', 'project', id);
      setNotice({ type: 'success', text: 'تم حذف المشروع.' });
      setProjects((items) => items.filter((item) => item.id !== id));
    }
  }

  async function updateUser(user: any, patch: Record<string, any>) {
    const id = String(user.auth_id || user.id || '');
    const email = String(user.email || '');
    if (!id && !email) return;
    setSaving(true);
    const rpc = await supabaseBrowser.rpc('admin_update_user', {
      target_auth_id: id || null,
      target_email: email || null,
      patch,
    });
    let error: any = rpc.error;
    if (error) {
      const direct = await supabaseBrowser.from('users').update(patch).or(`auth_id.eq.${id},id.eq.${id},email.eq.${email}`);
      error = direct.error;
    }
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else {
      await logAction('update_user', 'user', id || email, patch);
      await notifyUser(id, 'تحديث على حسابك', 'تم تحديث صلاحيات أو بيانات حسابك من الإدارة.', 'account');
      setNotice({ type: 'success', text: 'تم تحديث المستخدم.' });
      await loadAll();
    }
  }

  async function savePackage(event: React.FormEvent) {
    event.preventDefault();
    if (!packageForm.code || !packageForm.nameAr) return setNotice({ type: 'error', text: 'أدخل كود واسم الباقة.' });
    setSaving(true);
    const payload = {
      ...(packageForm.id ? { id: packageForm.id } : {}),
      code: packageForm.code.trim().toLowerCase(),
      name_ar: packageForm.nameAr,
      name_en: packageForm.nameEn || packageForm.nameAr,
      package_type: packageForm.packageType,
      price: Number(packageForm.price || 0),
      currency: packageForm.currency || 'OMR',
      recommendation_limit: Number(packageForm.recommendationLimit || 0),
      project_limit: Number(packageForm.projectLimit || 0),
      verification_included: packageForm.verificationIncluded,
      featured_included: packageForm.featuredIncluded,
      is_active: packageForm.isActive,
      sort_order: Number(packageForm.sortOrder || 100),
    };
    const { error } = await supabaseBrowser.from('subscription_packages').upsert(payload, { onConflict: 'code' });
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else {
      await logAction(packageForm.id ? 'update_package' : 'create_package', 'package', packageForm.code, payload);
      setPackageForm(emptyPackage);
      setNotice({ type: 'success', text: 'تم حفظ الباقة.' });
      await loadAll();
    }
  }

  async function deletePackage(pkg: PackageRow) {
    if (!pkg.code || !confirm('حذف/تعطيل الباقة؟')) return;
    setSaving(true);
    const { error } = await supabaseBrowser.from('subscription_packages').update({ is_active: false }).eq('code', pkg.code);
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else {
      await logAction('disable_package', 'package', pkg.code);
      setNotice({ type: 'success', text: 'تم تعطيل الباقة.' });
      await loadAll();
    }
  }

  function openAdminNote(title: string, message: string, initial: string, onConfirm: (note: string) => void | Promise<void>, confirmLabel = 'حفظ') {
    setAdminNoteModal({ title, message, initial, onConfirm, confirmLabel });
  }

  async function updateVerification(item: VerificationRow, nextStatus: string, note = '') {
    setSaving(true);
    const { error } = await supabaseBrowser.from('verification_requests').update({ status: nextStatus, admin_note: note, reviewed_at: new Date().toISOString() }).eq('id', item.id);
    if (!error && nextStatus === 'approved') {
      if ((item.request_type || item.type) === 'project' && item.project_id) await supabaseBrowser.from('projects').update({ is_verified: true, verification_status: 'approved' }).eq('id', item.project_id);
      if ((item.request_type || item.type) === 'investor' && item.user_auth_id) await supabaseBrowser.from('users').update({ is_verified: true, verification_status: 'approved' }).or(`auth_id.eq.${item.user_auth_id},id.eq.${item.user_auth_id}`);
    }
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else {
      await logAction('review_verification', 'verification_request', item.id, { status: nextStatus, admin_note: note });
      await notifyUser(item.user_auth_id, nextStatus === 'approved' ? 'تم قبول طلب التوثيق' : nextStatus === 'rejected' ? 'تم رفض طلب التوثيق' : 'طلب التوثيق يحتاج تعديل', note || 'راجع حالة طلب التوثيق من لوحة التحكم.', 'verification');
      setNotice({ type: 'success', text: 'تم تحديث طلب التوثيق.' });
      await loadAll();
    }
  }

  function reviewVerification(item: VerificationRow, nextStatus: string) {
    openAdminNote('ملاحظة طلب التوثيق', 'اكتب ملاحظة تظهر للمستخدم بدل نافذة المتصفح.', item.admin_note || '', (note) => updateVerification(item, nextStatus, note), nextStatus === 'approved' ? 'قبول' : nextStatus === 'rejected' ? 'رفض' : 'طلب تعديل');
  }

  async function updateUpgrade(item: UpgradeRequest, nextStatus: string, note = '') {
    setSaving(true);
    const { error } = await supabaseBrowser.from('subscription_requests').update({ status: nextStatus, admin_note: note, reviewed_at: new Date().toISOString() }).eq('id', item.id);
    if (!error && nextStatus === 'approved') {
      await supabaseBrowser.from('users').update({ subscription_status: item.package_code || 'pro', plan: item.package_code || 'pro', package_type: item.package_type || 'investor' }).or(`auth_id.eq.${item.user_auth_id},id.eq.${item.user_auth_id}`);
    }
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else {
      await logAction('review_upgrade_request', 'subscription_request', item.id, { status: nextStatus, package_code: item.package_code, admin_note: note });
      await notifyUser(item.user_auth_id, nextStatus === 'approved' ? 'تم تفعيل الباقة' : 'تم تحديث طلب الترقية', note || `حالة طلب الترقية: ${nextStatus}`, 'package');
      setNotice({ type: 'success', text: 'تم تحديث طلب الترقية.' });
      await loadAll();
    }
  }

  function reviewUpgrade(item: UpgradeRequest, nextStatus: string) {
    openAdminNote('ملاحظة طلب الترقية', 'اكتب ملاحظة تظهر للمستخدم بدل نافذة المتصفح.', item.admin_note || '', (note) => updateUpgrade(item, nextStatus, note), nextStatus === 'approved' ? 'قبول وتفعيل' : 'رفض');
  }


  async function updateReport(item: ReportRow, nextStatus: string, note = '') {
    setSaving(true);
    const { error } = await supabaseBrowser.from('reports').update({ status: nextStatus, admin_note: note, reviewed_at: new Date().toISOString(), reviewed_by: admin?.id || null }).eq('id', item.id);
    if (!error && nextStatus === 'hidden' && item.target_type === 'project' && (item.project_id || item.target_id)) {
      await supabaseBrowser.from('projects').update({ status: 'hidden', is_active: false }).eq('id', item.project_id || item.target_id);
    }
    if (!error && nextStatus === 'suspended' && item.reported_user_auth_id) {
      await supabaseBrowser.from('users').update({ status: 'suspended', is_blocked: true }).or(`auth_id.eq.${item.reported_user_auth_id},id.eq.${item.reported_user_auth_id}`);
    }
    setSaving(false);
    if (error) return setNotice({ type: 'error', text: error.message });
    await logAction('review_report', 'report', item.id, { status: nextStatus, admin_note: note });
    await notifyUser(item.reporter_auth_id, 'تمت مراجعة البلاغ', note || 'تم تحديث حالة البلاغ الذي أرسلته.', 'report');
    setNotice({ type: 'success', text: 'تم تحديث البلاغ.' });
    await loadAll();
  }

  function reviewReport(item: ReportRow, nextStatus: string) {
    openAdminNote('مراجعة البلاغ', 'اكتب ملاحظة داخلية/تظهر للمستخدم حسب الحالة.', item.admin_note || '', (note) => updateReport(item, nextStatus, note), nextStatus === 'resolved' ? 'إغلاق البلاغ' : 'تنفيذ');
  }

  async function updateRating(item: RatingRow, nextStatus: string) {
    setSaving(true);
    const { error } = await supabaseBrowser.from('deal_ratings').update({ status: nextStatus, reviewed_at: new Date().toISOString(), reviewed_by: admin?.id || null }).eq('id', item.id);
    setSaving(false);
    if (error) return setNotice({ type: 'error', text: error.message });
    await logAction('review_rating', 'deal_rating', item.id, { status: nextStatus });
    await notifyUser(item.reviewer_auth_id, 'تم تحديث حالة تقييمك', `حالة التقييم: ${nextStatus}`, 'rating');
    setNotice({ type: 'success', text: 'تم تحديث التقييم.' });
    await loadAll();
  }

  async function sendBroadcast(event: React.FormEvent) {
    event.preventDefault();
    if (!broadcastForm.title || !broadcastForm.body) return setNotice({ type: 'error', text: 'أدخل عنوان ونص الإشعار.' });
    const targetUsers = broadcastForm.targetRole === 'all' ? users : users.filter((u) => String(u.account_type || u.role || '').includes(broadcastForm.targetRole));
    const rows = targetUsers.map((u) => ({ user_auth_id: String(u.auth_id || u.id), title: broadcastForm.title, body: broadcastForm.body, type: broadcastForm.type, is_read: false }));
    setSaving(true);
    const { error } = await supabaseBrowser.from('notifications').insert(rows);
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else {
      await logAction('broadcast_notification', 'notification', 'bulk', { count: rows.length, targetRole: broadcastForm.targetRole, type: broadcastForm.type });
      setBroadcastForm({ title: '', body: '', type: 'system', targetRole: 'all' });
      setNotice({ type: 'success', text: `تم إرسال ${rows.length} إشعار.` });
      await loadAll();
    }
  }


  async function createOrUpdateAdmin(event: React.FormEvent) {
    event.preventDefault();
    if (!isSuperAdmin) return setNotice({ type: 'error', text: 'فقط Super Admin يستطيع إنشاء أو تعديل حسابات الإدارة.' });
    const email = adminForm.email.trim().toLowerCase();
    if (!email || !email.includes('@')) return setNotice({ type: 'error', text: 'أدخل بريد إداري صحيح.' });
    setSaving(true);
    const payload = {
      email,
      name: adminForm.name.trim() || email,
      role: adminForm.role === 'super_admin' ? 'super_admin' : 'admin',
      admin_role: adminForm.role,
      admin_permissions: adminForm.role === 'super_admin' ? DEFAULT_ADMIN_PERMISSIONS : adminForm.permissions,
      is_admin: true,
      admin_status: 'active',
      created_by_admin: admin?.id || null,
    } as any;

    const existing = users.find((u) => String(u.email || '').toLowerCase() === email);
    let error: any = null;
    if (existing) {
      const id = String(existing.auth_id || existing.id || '');
      const result = await supabaseBrowser.from('users').update(payload).or(`auth_id.eq.${id},id.eq.${id},email.eq.${email}`);
      error = result.error;
    } else {
      const invitePayload = { email, name: payload.name, role: payload.role, permissions: payload.admin_permissions, status: 'invited', invited_by: admin?.id || null };
      const inviteResult = await supabaseBrowser.from('admin_invites').upsert(invitePayload, { onConflict: 'email' });
      error = inviteResult.error;
    }
    setSaving(false);
    if (error) return setNotice({ type: 'error', text: error.message });
    await logAction(existing ? 'update_admin_account' : 'invite_admin_account', 'admin_user', email, payload);
    setAdminForm(emptyAdminForm);
    setNotice({ type: 'success', text: existing ? 'تم تحديث صلاحيات حساب الإدارة.' : 'تم إنشاء دعوة إدارية. بعد تسجيل صاحب البريد بنفس الإيميل سيتم تطبيق الصلاحيات.' });
    await loadAll();
  }

  async function revokeAdmin(user: any) {
    if (!isSuperAdmin) return setNotice({ type: 'error', text: 'فقط Super Admin يستطيع سحب صلاحيات الإدارة.' });
    if (!confirm('سحب صلاحيات الإدارة من هذا الحساب؟')) return;
    await updateUser(user, { role: 'user', is_admin: false, admin_role: null, admin_status: 'revoked', admin_permissions: {} });
  }

  async function cancelAdminInvite(invite: AdminInvite) {
    if (!isSuperAdmin || !invite.email) return;
    setSaving(true);
    const { error } = await supabaseBrowser.from('admin_invites').update({ status: 'cancelled' }).eq('email', invite.email);
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else { await logAction('cancel_admin_invite', 'admin_invite', invite.email); setNotice({ type: 'success', text: 'تم إلغاء الدعوة.' }); await loadAll(); }
  }

  async function saveCountry(event: React.FormEvent) {
    event.preventDefault();
    const code = normalizeCode(countryForm.code);
    if (!code || !countryForm.nameAr || !countryForm.currencyCode) return setNotice({ type: 'error', text: 'أدخل كود الدولة والاسم والعملة.' });
    setSaving(true);
    const payload = { code, name_ar: countryForm.nameAr, name_en: countryForm.nameEn || countryForm.nameAr, flag: countryForm.flag || makeFlag(code), currency_code: countryForm.currencyCode.toUpperCase(), currency_symbol_ar: countryForm.symbolAr || countryForm.currencyCode.toUpperCase(), currency_symbol_en: countryForm.symbolEn || countryForm.currencyCode.toUpperCase(), is_default: countryForm.isDefault, is_active: countryForm.isActive, sort_order: Number(countryForm.sortOrder || 100) };
    if (countryForm.isDefault) await supabaseBrowser.from('platform_countries').update({ is_default: false }).neq('code', code);
    const { error } = await supabaseBrowser.from('platform_countries').upsert(payload, { onConflict: 'code' });
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else { await logAction('save_country', 'country', code, payload); setCountryForm(emptyCountry); setNotice({ type: 'success', text: 'تم حفظ الدولة.' }); await loadAll(); }
  }

  async function saveSlide(event: React.FormEvent) {
    event.preventDefault();
    if (!slideForm.titleAr && !slideForm.titleEn) return setNotice({ type: 'error', text: 'أدخل عنوان السلايد.' });
    setSaving(true);
    const payload = { ...(slideForm.id ? { id: slideForm.id } : {}), title_ar: slideForm.titleAr, title_en: slideForm.titleEn, subtitle_ar: slideForm.subtitleAr, subtitle_en: slideForm.subtitleEn, button_text_ar: slideForm.buttonTextAr, button_text_en: slideForm.buttonTextEn, button_url: slideForm.buttonUrl, image_url: slideForm.imageUrl, country_code: normalizeCode(slideForm.countryCode || 'om'), is_active: slideForm.isActive, slide_order: Number(slideForm.slideOrder || 100) };
    const { error } = await supabaseBrowser.from('homepage_slides').upsert(payload);
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else { await logAction('save_slide', 'homepage_slide', slideForm.id || slideForm.titleAr || 'new', payload); setSlideForm(emptySlide); setNotice({ type: 'success', text: 'تم حفظ السلايد.' }); await loadAll(); }
  }


  async function deleteSlide(slide: SlideRow) {
    if (!slide.id || !confirm('حذف هذا السلايد؟')) return;
    setSaving(true);
    const { error } = await supabaseBrowser.from('homepage_slides').delete().eq('id', slide.id);
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else { await logAction('delete_slide', 'homepage_slide', slide.id); setNotice({ type: 'success', text: 'تم حذف السلايد.' }); await loadAll(); }
  }

  async function toggleSliderSystem() {
    setSaving(true);
    const next = !sliderEnabled;
    const { error } = await supabaseBrowser.from('platform_settings').upsert({ key: 'homepage_slider_enabled', value: String(next), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else { await logAction('toggle_homepage_slider', 'platform_setting', 'homepage_slider_enabled', { enabled: next }); setSliderEnabled(next); setNotice({ type: 'success', text: next ? 'تم تشغيل السلايدر.' : 'تم إيقاف السلايدر.' }); await loadAll(); }
  }

  async function saveProjectPublishMode(mode: 'auto' | 'manual') {
    setSaving(true);
    setNotice(null);
    try {
      const { error } = await supabaseBrowser
        .from('platform_settings')
        .upsert({ key: 'project_publish_mode', value: mode, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      setProjectPublishMode(mode);
      await logAction('save_project_publish_mode', 'platform_settings', 'project_publish_mode', { mode });
      setNotice({ type: 'success', text: mode === 'auto' ? 'تم تفعيل النشر التلقائي للمشاريع. التوثيق يبقى من الإدارة.' : 'تم تحويل نشر المشاريع إلى موافقة الإدارة.' });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'تعذر حفظ إعداد النشر.' });
    } finally {
      setSaving(false);
    }
  }

  async function toggleSlide(slide: SlideRow) {
    if (!slide.id) return;
    setSaving(true);
    const { error } = await supabaseBrowser.from('homepage_slides').update({ is_active: !slide.isActive }).eq('id', slide.id);
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else { await logAction('toggle_slide', 'homepage_slide', slide.id, { is_active: !slide.isActive }); await loadAll(); }
  }


  function openUserEditor(user: any) {
    setUserEditModal({ user, form: {
      name: user.name || user.full_name || '',
      phone: user.phone || '',
      whatsapp: user.whatsapp || '',
      account_type: user.account_type || 'investor',
      role: user.role || 'user',
      subscription_status: user.subscription_status || user.plan || 'free',
      is_blocked: user.is_blocked === true,
      is_verified: user.is_verified === true,
    }});
  }

  async function saveUserEditor() {
    if (!userEditModal) return;
    await updateUser(userEditModal.user, userEditModal.form);
    setUserEditModal(null);
  }

  async function openProjectEditor(project: AdminProject) {
    const images = await supabaseBrowser.from('project_images').select('*').eq('project_id', project.id).order('sort_order', { ascending: true });
    setProjectEditModal({ project, form: {
      title_ar: project.title,
      title_en: project.raw?.title_en || '',
      description_ar: project.descriptionAr || project.description || '',
      description_en: project.descriptionEn || '',
      category: project.category,
      sector: project.raw?.sector || project.category,
      opportunity_type: project.opportunityType || project.raw?.opportunity_type || project.raw?.project_type || 'sale',
      city: project.city,
      location: project.raw?.location || project.city,
      price: project.price,
      funding_amount: project.fundingAmount || project.raw?.funding_amount || '',
      partnership_percent: project.partnershipPercent || project.raw?.partnership_percent || '',
      franchise_fee: project.franchiseFee || project.raw?.franchise_fee || '',
      roi: project.roi || project.raw?.roi || '',
      monthly_profit: project.monthlyProfit || project.raw?.monthly_profit || '',
      employees_count: project.employeesCount || project.raw?.employees_count || '',
      years_operating: project.yearsOperating || project.raw?.years_operating || '',
      payback_period: project.paybackPeriod || project.raw?.payback_period || '',
      map_lat: project.mapLat || project.raw?.map_lat || '',
      map_lng: project.mapLng || project.raw?.map_lng || '',
      contact_phone: project.contactPhone || project.raw?.contact_phone || '',
      contact_whatsapp: project.contactWhatsapp || project.raw?.contact_whatsapp || '',
      phone_country_code: project.phoneCountryCode || '+968',
      whatsapp_country_code: project.whatsappCountryCode || '+968',
      cover_image_url: project.coverImage,
      status: project.status,
      moderation_status: project.raw?.moderation_status || project.status,
      is_verified: project.verified,
      verification_status: project.verificationStatus,
    }, gallery: images.error ? [] : (images.data || []), newImageUrl: '' });
  }

  async function saveProjectEditor() {
    if (!projectEditModal) return;
    setSaving(true);
    const payload = {
      title_ar: projectEditModal.form.title_ar,
      title: projectEditModal.form.title_ar,
      title_en: projectEditModal.form.title_en || null,
      description_ar: projectEditModal.form.description_ar || null,
      description: projectEditModal.form.description_ar || projectEditModal.form.description_en || null,
      description_en: projectEditModal.form.description_en || null,
      category: projectEditModal.form.category,
      sector: projectEditModal.form.sector || projectEditModal.form.category,
      opportunity_type: projectEditModal.form.opportunity_type,
      project_type: projectEditModal.form.opportunity_type,
      city: projectEditModal.form.city,
      location: projectEditModal.form.location || projectEditModal.form.city,
      price: Number(projectEditModal.form.price || 0),
      asking_price: Number(projectEditModal.form.price || 0),
      funding_amount: projectEditModal.form.funding_amount ? Number(projectEditModal.form.funding_amount) : null,
      partnership_percent: projectEditModal.form.partnership_percent ? Number(projectEditModal.form.partnership_percent) : null,
      franchise_fee: projectEditModal.form.franchise_fee ? Number(projectEditModal.form.franchise_fee) : null,
      roi: projectEditModal.form.roi ? Number(projectEditModal.form.roi) : null,
      monthly_profit: projectEditModal.form.monthly_profit ? Number(projectEditModal.form.monthly_profit) : null,
      employees_count: projectEditModal.form.employees_count ? Number(projectEditModal.form.employees_count) : null,
      years_operating: projectEditModal.form.years_operating ? Number(projectEditModal.form.years_operating) : null,
      payback_period: projectEditModal.form.payback_period || null,
      map_lat: projectEditModal.form.map_lat ? Number(projectEditModal.form.map_lat) : null,
      map_lng: projectEditModal.form.map_lng ? Number(projectEditModal.form.map_lng) : null,
      contact_phone: projectEditModal.form.contact_phone || null,
      contact_whatsapp: projectEditModal.form.contact_whatsapp || null,
      phone_country_code: projectEditModal.form.phone_country_code || '+968',
      whatsapp_country_code: projectEditModal.form.whatsapp_country_code || '+968',
      cover_image_url: projectEditModal.form.cover_image_url,
      cover_image: projectEditModal.form.cover_image_url,
      status: projectEditModal.form.status,
      moderation_status: projectEditModal.form.moderation_status || projectEditModal.form.status,
      is_verified: projectEditModal.form.is_verified === true,
      verification_status: projectEditModal.form.verification_status || (projectEditModal.form.is_verified ? 'approved' : 'none'),
    };
    const { error } = await supabaseBrowser.from('projects').update(payload).eq('id', projectEditModal.project.id);
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else { await logAction('edit_project_details', 'project', projectEditModal.project.id, payload); setNotice({ type: 'success', text: 'تم تعديل المشروع.' }); setProjectEditModal(null); await loadAll(); }
  }

  async function addProjectImage() {
    if (!projectEditModal?.newImageUrl.trim()) return;
    const url = projectEditModal.newImageUrl.trim();
    const { error } = await supabaseBrowser.from('project_images').insert({
      project_id: projectEditModal.project.id,
      image_url: url,
      url,
      sort_order: projectEditModal.gallery.length + 1,
    });
    if (error) setNotice({ type: 'error', text: error.message });
    else openProjectEditor(projectEditModal.project);
  }

  async function deleteProjectImage(image: any) {
    if (!confirm('حذف هذه الصورة من المشروع؟')) return;
    const id = String(image.id || '');
    if (!id) return;
    const { error } = await supabaseBrowser.from('project_images').delete().eq('id', id);
    if (error) setNotice({ type: 'error', text: error.message });
    else if (projectEditModal) openProjectEditor(projectEditModal.project);
  }


  async function saveSector(event: React.FormEvent) {
    event.preventDefault();
    const key = (sectorForm.key || sectorForm.nameEn || sectorForm.nameAr).toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
    if (!key || !sectorForm.nameAr) return setNotice({ type: 'error', text: 'أدخل مفتاح واسم القطاع.' });
    setSaving(true);
    const payload = {
      ...(sectorForm.id ? { id: sectorForm.id } : {}),
      key,
      slug: key,
      code: key,
      name_ar: sectorForm.nameAr,
      name_en: sectorForm.nameEn || sectorForm.nameAr,
      icon: sectorForm.icon || '◇',
      emoji: sectorForm.icon || '◇',
      image_url: sectorForm.imageUrl,
      country_code: normalizeCode(sectorForm.countryCode || 'om'),
      is_active: sectorForm.isActive,
      sort_order: Number(sectorForm.sortOrder || 100),
    };
    const { error } = await supabaseBrowser.from('platform_sectors').upsert(payload, { onConflict: 'key,country_code' });
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else { await logAction('save_sector', 'platform_sector', key, payload); setSectorForm(emptySector); setNotice({ type: 'success', text: 'تم حفظ القطاع.' }); await loadAll(); }
  }

  async function deleteSector(sector: SectorRow) {
    if (!sector.id || !confirm('حذف القطاع؟')) return;
    setSaving(true);
    const { error } = await supabaseBrowser.from('platform_sectors').delete().eq('id', sector.id);
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else { await logAction('delete_sector', 'platform_sector', sector.id); setNotice({ type: 'success', text: 'تم حذف القطاع.' }); await loadAll(); }
  }

  async function saveAd(event: React.FormEvent) {
    event.preventDefault();
    if (!adForm.title || !adForm.imageUrl) return setNotice({ type: 'error', text: 'أدخل عنوان وصورة البنر.' });
    setSaving(true);
    const payload = {
      ...(adForm.id ? { id: adForm.id } : {}),
      title: adForm.title,
      placement: adForm.placement,
      image_url: adForm.imageUrl,
      link_url: adForm.linkUrl,
      country_code: normalizeCode(adForm.countryCode || 'om'),
      is_active: adForm.isActive,
      sort_order: Number(adForm.sortOrder || 100),
    };
    const { error } = await supabaseBrowser.from('platform_ads').upsert(payload);
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else { await logAction('save_ad_banner', 'platform_ad', adForm.id || adForm.title, payload); setAdForm(emptyAd); setNotice({ type: 'success', text: 'تم حفظ البنر الإعلاني.' }); await loadAll(); }
  }

  async function deleteAd(ad: AdRow) {
    if (!ad.id || !confirm('حذف البنر؟')) return;
    setSaving(true);
    const { error } = await supabaseBrowser.from('platform_ads').delete().eq('id', ad.id);
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else { await logAction('delete_ad_banner', 'platform_ad', ad.id); setNotice({ type: 'success', text: 'تم حذف البنر.' }); await loadAll(); }
  }


  async function updatePromotionRequestStatus(request: PromotionRequestRow, status: 'approved' | 'active' | 'rejected') {
    if (!request.id) return;
    setSaving(true);
    const now = new Date();
    const duration = Number(request.duration_days || 7);
    const startsAt = status === 'active' || status === 'approved' ? now.toISOString() : request.starts_at || null;
    const endsAt = status === 'active' || status === 'approved' ? new Date(now.getTime() + duration * 86400000).toISOString() : request.ends_at || null;
    const paymentOk = ['paid','succeeded','success'].includes(String((request as any).payment_status || (request as any).status_payment || '').toLowerCase()) || Number(request.price || request.amount || 0) <= 0;
    const finalStatus = status === 'approved' ? (paymentOk ? 'active' : 'pending_payment') : status;
    const { error } = await supabaseBrowser.from('promotion_requests').update({ status: finalStatus, starts_at: paymentOk ? startsAt : null, ends_at: paymentOk ? endsAt : null }).eq('id', request.id);
    if (!error && request.project_id && finalStatus === 'active') {
      await supabaseBrowser.from('projects').update({ is_sponsored: true, sponsored: true, sponsor_weight: Math.max(10, Number(request.price || request.amount || 0)), sponsored_until: endsAt }).eq('id', request.project_id);
    }
    if (!error && request.project_id && status === 'rejected') {
      await supabaseBrowser.from('projects').update({ is_sponsored: false, sponsored: false, sponsor_weight: 0 }).eq('id', request.project_id);
    }
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else { await logAction(`promotion_${status}`, 'promotion_request', request.id, { ...request, final_status: status === 'approved' ? 'active' : status } as any); setNotice({ type: 'success', text: finalStatus === 'active' ? 'تم تفعيل الترويج لأن الدفع ناجح.' : finalStatus === 'pending_payment' ? 'تم حفظ الطلب بانتظار الدفع.' : 'تم تحديث طلب الترويج.' }); await loadAll(); }
  }

  async function saveCampaign(event: React.FormEvent) {
    event.preventDefault();
    if (!campaignForm.title || !campaignForm.entityId) return setNotice({ type: 'error', text: 'اختر المشروع وأدخل عنوان الحملة.' });
    setSaving(true);
    const payload = {
      ...(campaignForm.id ? { id: campaignForm.id } : {}),
      title: campaignForm.title,
      advertiser_user_id: campaignForm.advertiserUserId || null,
      entity_type: campaignForm.entityType || 'project',
      entity_id: campaignForm.entityId,
      placement: campaignForm.placement || 'home_sponsored',
      country_code: normalizeCode(campaignForm.countryCode || 'om'),
      impressions: Number(campaignForm.impressions || 0),
      clicks: Number(campaignForm.clicks || 0),
      budget: Number(campaignForm.budget || 0),
      spent: Number(campaignForm.spent || 0),
      starts_at: campaignForm.startsAt || new Date().toISOString(),
      ends_at: campaignForm.endsAt || null,
      is_active: campaignForm.isActive,
    };
    const { error } = await supabaseBrowser.from('ad_campaigns').upsert(payload);
    if (!error && payload.entity_type === 'project') await supabaseBrowser.from('projects').update({ is_sponsored: payload.is_active, sponsored: payload.is_active, sponsor_weight: payload.is_active ? Math.max(10, Number(campaignForm.budget || 0)) : 0, sponsored_until: payload.ends_at }).eq('id', payload.entity_id);
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else { await logAction('save_ad_campaign', 'ad_campaign', campaignForm.id || campaignForm.title, payload); setCampaignForm(emptyCampaign); setNotice({ type: 'success', text: 'تم حفظ الحملة وتم تحديث المشروع الممول.' }); await loadAll(); }
  }

  async function deleteCampaign(campaign: CampaignRow) {
    if (!campaign.id || !confirm('حذف الحملة الإعلانية؟')) return;
    setSaving(true);
    const { error } = await supabaseBrowser.from('ad_campaigns').delete().eq('id', campaign.id);
    if (!error && campaign.entityType === 'project' && campaign.entityId) await supabaseBrowser.from('projects').update({ is_sponsored: false, sponsored: false, sponsor_weight: 0, sponsored_until: null }).eq('id', campaign.entityId);
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else { await logAction('delete_ad_campaign', 'ad_campaign', campaign.id); setNotice({ type: 'success', text: 'تم حذف الحملة.' }); await loadAll(); }
  }

  async function sponsorProject(project: AdminProject) {
    const days = Number(prompt('كم يوم تريد تمويل المشروع؟', '7') || 7);
    const weight = Number(prompt('أولوية الظهور / الوزن', '50') || 50);
    const budget = Number(prompt('ميزانية الحملة بالريال', '0') || 0);
    const endsAt = new Date(Date.now() + Math.max(1, days) * 86400000).toISOString();
    setSaving(true);
    const { error } = await supabaseBrowser.from('projects').update({ is_sponsored: true, sponsored: true, sponsor_weight: weight, sponsored_until: endsAt }).eq('id', project.id);
    if (!error) await supabaseBrowser.from('ad_campaigns').insert({ title: `تمويل: ${project.title}`, entity_type: 'project', entity_id: project.id, placement: 'home_sponsored', country_code: project.countryCode || 'om', budget, starts_at: new Date().toISOString(), ends_at: endsAt, is_active: true });
    setSaving(false);
    if (error) setNotice({ type: 'error', text: error.message });
    else { await logAction('sponsor_project', 'project', project.id, { days, weight, budget }); setNotice({ type: 'success', text: 'تم تحويل المشروع إلى مشروع ممول.' }); await loadAll(); }
  }

    if (loading) return <div className="flex min-h-screen items-center justify-center bg-[var(--brand-surface-2)] p-6"><div className="rounded-[2rem] bg-white p-8 text-center shadow-sm"><Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" /><p className="mt-4 font-black text-slate-700">جاري تحميل لوحة الإدارة...</p></div></div>;
  if (accessDenied) return <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white"><div className="max-w-lg rounded-[2rem] bg-white/10 p-8 text-center backdrop-blur"><LockKeyhole className="mx-auto h-12 w-12 text-amber-300" /><h1 className="mt-4 text-3xl font-black">صلاحية الإدارة مطلوبة</h1><p className="mt-3 text-slate-300">تأكد أن حسابك يحمل role = admin أو super_admin.</p><Link className="mt-6 inline-flex rounded-full bg-blue-500 px-6 py-3 font-black text-slate-950" href="/om/ar/login">تسجيل الدخول</Link></div></div>;

  const tabBadge = (key: Tab) => {
    if (key === 'projects') return stats.pendingProjects;
    if (key === 'verifications') return stats.verifications;
    if (key === 'upgrades') return stats.upgrades;
    if (key === 'notifications') return notifications.filter((item) => !item.is_read).length;
    if (key === 'admins') return stats.adminUsers;
    if (key === 'reports') return stats.reports;
    if (key === 'ratings') return ratings.filter((item) => String(item.status || 'pending') === 'pending').length;
    if (key === 'promotions') return promotionRequests.filter((item) => String(item.status || 'pending').toLowerCase() === 'pending').length;
    return 0;
  };

  const tabs: { key: Tab; label: string; icon: any; group?: string }[] = [
    { key: 'overview', label: 'نظرة عامة', icon: BarChart3, group: 'الرئيسية' },
    { key: 'publish_settings', label: 'نظام النشر', icon: FileCheck2, group: 'الرئيسية' },
    { key: 'projects', label: 'المشاريع', icon: BriefcaseBusiness, group: 'المحتوى' },
    { key: 'sectors', label: 'القطاعات', icon: Layers3, group: 'المحتوى' },
    { key: 'verifications', label: 'التوثيق', icon: ShieldCheck, group: 'الثقة والأمان' },
    { key: 'packages', label: 'الباقات', icon: Crown, group: 'الإيرادات' },
    { key: 'upgrades', label: 'طلبات الترقية', icon: PackageCheck, group: 'الإيرادات' },
    { key: 'recommendations', label: 'التوصيات', icon: Sparkles, group: 'النمو' },
    { key: 'notifications', label: 'الإشعارات', icon: Bell, group: 'النمو' },
    { key: 'reports', label: 'البلاغات', icon: Flag, group: 'الثقة والأمان' },
    { key: 'ratings', label: 'التقييمات والثقة', icon: Star, group: 'الثقة والأمان' },
    { key: 'logs', label: 'سجل الإدارة', icon: FileText, group: 'النظام' },
    { key: 'seo', label: 'SEO', icon: ShieldAlert, group: 'النظام' },
    { key: 'analytics', label: 'التحليلات', icon: Activity, group: 'النمو' },
    { key: 'users', label: 'المستخدمين', icon: Users, group: 'الأشخاص' },
    { key: 'admins', label: 'حسابات الإدارة', icon: UserPlus, group: 'الأشخاص' },
    { key: 'promotions', label: 'طلبات الترويج', icon: Megaphone, group: 'الإيرادات' },
    { key: 'payment', label: 'بوابة الدفع', icon: CreditCard, group: 'الإيرادات' },
    { key: 'languages', label: 'اللغات والترجمات', icon: Languages, group: 'النظام' },
    { key: 'ads', label: 'الإعلانات والبنرات', icon: Megaphone, group: 'المحتوى' },
    { key: 'countries', label: 'الدول', icon: Globe2, group: 'النظام' },
    { key: 'slides', label: 'السلايدر', icon: SlidersHorizontal, group: 'المحتوى' },
  ];

  const groupedTabs = tabs.reduce((acc, item) => {
    const group = item.group || 'عام';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, typeof tabs>);
  const activeTab = tabs.find((item) => item.key === tab);
  const urgentCount = stats.pendingProjects + stats.verifications + stats.upgrades + stats.reports;
  const adminIsAr = adminLang === 'ar';
  const adminDir = adminIsAr ? 'rtl' : 'ltr';
  const adminCopy = {
    dashboard: adminIsAr ? 'لوحة الإدارة' : 'Admin Dashboard',
    search: adminIsAr ? 'بحث سريع [CTRL + K]' : 'Quick Search [CTRL + K]',
    openSite: adminIsAr ? 'فتح الموقع' : 'Open Site',
    refresh: adminIsAr ? 'تحديث' : 'Refresh',
    pending: adminIsAr ? `${urgentCount} إجراء بانتظارك` : `${urgentCount} pending actions`,
    suite: adminIsAr ? 'مجموعة الإدارة' : 'Admin Suite',
    pageHint: adminIsAr ? 'لوحة إدارة حديثة بتجربة واضحة وألوان مقروءة على نمط Vuexy و Paces.' : 'Modern admin dashboard with readable colors inspired by Vuexy and Paces.',
    projects: adminIsAr ? 'مشروع' : 'Projects',
    users: adminIsAr ? 'مستخدم' : 'Users',
    verification: adminIsAr ? 'توثيق' : 'Verification',
  };
  const tabLabels: Record<Tab, string> = {
    overview: adminIsAr ? 'نظرة عامة' : 'Overview',
    publish_settings: adminIsAr ? 'نظام النشر' : 'Publishing',
    projects: adminIsAr ? 'المشاريع' : 'Projects',
    sectors: adminIsAr ? 'القطاعات' : 'Sectors',
    verifications: adminIsAr ? 'التوثيق' : 'Verification',
    packages: adminIsAr ? 'الباقات' : 'Packages',
    upgrades: adminIsAr ? 'طلبات الترقية' : 'Upgrades',
    recommendations: adminIsAr ? 'التوصيات' : 'Recommendations',
    notifications: adminIsAr ? 'الإشعارات' : 'Notifications',
    users: adminIsAr ? 'المستخدمين' : 'Users',
    admins: adminIsAr ? 'حسابات الإدارة' : 'Admin Accounts',
    promotions: adminIsAr ? 'طلبات الترويج' : 'Promotions',
    ads: adminIsAr ? 'الإعلانات والبنرات' : 'Ads & Banners',
    countries: adminIsAr ? 'الدول' : 'Countries',
    slides: adminIsAr ? 'السلايدر' : 'Slider',
    analytics: adminIsAr ? 'التحليلات' : 'Analytics',
    reports: adminIsAr ? 'البلاغات' : 'Reports',
    ratings: adminIsAr ? 'التقييمات والثقة' : 'Ratings',
    logs: adminIsAr ? 'سجل الإدارة' : 'Activity Logs',
    seo: 'SEO',
    payment: adminIsAr ? 'بوابة الدفع' : 'Payment Gateway',
    languages: adminIsAr ? 'اللغات والترجمات' : 'Languages',
  };
  const groupLabels: Record<string, string> = {
    'الرئيسية': adminIsAr ? 'الرئيسية' : 'Main',
    'المحتوى': adminIsAr ? 'المحتوى' : 'Content',
    'الثقة والأمان': adminIsAr ? 'الثقة والأمان' : 'Trust & Safety',
    'الإيرادات': adminIsAr ? 'الإيرادات' : 'Revenue',
    'النمو': adminIsAr ? 'النمو' : 'Growth',
    'النظام': adminIsAr ? 'النظام' : 'System',
    'الأشخاص': adminIsAr ? 'الأشخاص' : 'People',
    'عام': adminIsAr ? 'عام' : 'General',
  };
  const activeTabLabel = activeTab ? tabLabels[activeTab.key] : adminCopy.dashboard;

  return (
    <main dir={adminDir} className={`admin-premium admin-vuexy ${adminMobileMenuOpen ? 'admin-mobile-menu-open' : ''}`}>
      {adminMobileMenuOpen ? <button type="button" className="admin-mobile-sidebar-backdrop" onClick={() => setAdminMobileMenuOpen(false)} aria-label={adminIsAr ? 'إغلاق القائمة' : 'Close menu'} /> : null}
      <aside className={`admin-premium-sidebar admin-vuexy-sidebar ${adminMobileMenuOpen ? 'open' : ''}`}>
        <button type="button" className="admin-mobile-sidebar-close" onClick={() => setAdminMobileMenuOpen(false)} aria-label={adminIsAr ? 'إغلاق القائمة' : 'Close menu'}><X className="h-5 w-5" /></button>
        <div className="admin-vuexy-brand">
          <span className="admin-vuexy-logo">إ</span>
          <div>
            <strong>إلو مستثمر</strong>
            <small>{adminCopy.suite}</small>
          </div>
        </div>
        <div className="admin-vuexy-profile">
          <span className="admin-vuexy-avatar">{String(admin?.name || 'A').slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0">
            <b>{admin?.name || 'Admin'}</b>
            <small>{admin?.role || 'super admin'}</small>
          </div>
        </div>
        <nav className="admin-vuexy-nav">
          {Object.entries(groupedTabs).map(([group, groupTabs]) => (
            <div key={group} className="admin-vuexy-nav-group">
              <p>{groupLabels[group] || group}</p>
              {groupTabs.map((item) => (
                <button key={item.key} onClick={() => { setTab(item.key); setAdminMobileMenuOpen(false); }} className={`admin-vuexy-tab ${tab === item.key ? 'admin-premium-tab-active' : ''}`}>
                  <item.icon className="h-5 w-5" />
                  <span>{tabLabels[item.key] || item.label}</span>
                  {tabBadge(item.key) ? <em>{tabBadge(item.key)}</em> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <section className="admin-premium-hero admin-vuexy-topbar">
        <div className="admin-vuexy-topbar-inner">
          <button type="button" className="admin-mobile-menu-button" onClick={() => setAdminMobileMenuOpen(true)} aria-label={adminIsAr ? 'فتح قائمة الإدارة' : 'Open admin menu'}><Menu className="h-5 w-5" /></button>
          <label className="admin-vuexy-search" aria-label={adminCopy.search}>
            <Search className="h-5 w-5" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setTab('projects')}
              placeholder={adminCopy.search}
            />
          </label>
          <div className="admin-vuexy-topbar-actions">
            <button type="button" onClick={() => setAdminLang(adminLang === 'ar' ? 'en' : 'ar')} className="admin-vuexy-icon-btn" title="Language">
              <Languages className="h-5 w-5" />
            </button>
            <button type="button" onClick={loadAll} className="admin-vuexy-icon-btn" title={adminCopy.refresh}><RefreshCcw className="h-5 w-5" /></button>
            <button type="button" onClick={() => setTab('notifications')} className="admin-vuexy-icon-btn admin-vuexy-bell" title={tabLabels.notifications}>
              <Bell className="h-5 w-5" />
              {urgentCount ? <em>{urgentCount}</em> : null}
            </button>
            <Link href="/om/ar" className="admin-vuexy-site-btn">{adminCopy.openSite}</Link>
            <div className="admin-vuexy-user-chip">
              <div>
                <b>{admin?.name || 'Admin'}</b>
                <small>{admin?.role || 'super_admin'}</small>
              </div>
              <span>{String(admin?.name || 'A').slice(0, 1).toUpperCase()}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="admin-vuexy-main">
        <section className="min-w-0">
          <div className="admin-vuexy-pagehead">
            <div>
              <h2>{activeTabLabel}</h2>
              <p>{adminCopy.pageHint}</p>
            </div>
            <div className="admin-vuexy-mini-stats">
              <span><b>{stats.projects}</b> {adminCopy.projects}</span>
              <span><b>{stats.users}</b> {adminCopy.users}</span>
              <span><b>{stats.verifications}</b> {adminCopy.verification}</span>
            </div>
          </div>
          {notice ? <div className={`mb-5 rounded-2xl p-4 text-sm font-black ring-1 ${notice.type === 'error' ? 'bg-red-50 text-red-700 ring-red-100' : notice.type === 'success' ? 'bg-blue-50 text-blue-700 ring-blue-100' : 'bg-sky-50 text-sky-700 ring-sky-100'}`}>{notice.text}</div> : null}
          {saving ? <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm"><Loader2 className="h-4 w-4 animate-spin" /> جاري الحفظ...</div> : null}

          {tab === 'overview' && (
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AdminStat icon={BriefcaseBusiness} label="كل المشاريع" value={stats.projects} tone="bg-blue-50 text-blue-700" />
                <AdminStat icon={Clock3} label="مشاريع بانتظار الموافقة" value={stats.pendingProjects} tone="bg-amber-50 text-amber-700" />
                <AdminStat icon={Users} label="المستخدمون" value={stats.users} tone="bg-sky-50 text-sky-700" />
                <AdminStat icon={UserPlus} label="حسابات الإدارة" value={stats.adminUsers} tone="bg-indigo-50 text-indigo-700" />
                <AdminStat icon={Crown} label="مستخدمون مدفوعون" value={stats.premiumUsers} tone="bg-purple-50 text-purple-700" />
                <AdminStat icon={ShieldCheck} label="طلبات توثيق معلقة" value={stats.verifications} tone="bg-blue-50 text-blue-700" />
                <AdminStat icon={PackageCheck} label="طلبات ترقية معلقة" value={stats.upgrades} tone="bg-orange-50 text-orange-700" />
                <AdminStat icon={Bell} label="الإشعارات" value={notifications.length} tone="bg-rose-50 text-rose-700" />
                <AdminStat icon={Flag} label="بلاغات مفتوحة" value={stats.reports} tone="bg-red-50 text-red-700" />
                <AdminStat icon={Star} label="التقييمات" value={stats.ratings} tone="bg-yellow-50 text-yellow-700" />
                <AdminStat icon={Activity} label="المحادثات" value={analytics.conversations} tone="bg-slate-100 text-slate-700" />
              </div>
              <div className="grid gap-5 xl:grid-cols-3">
                <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm xl:col-span-2">
                  <h2 className="text-2xl font-black">أهم التنبيهات</h2>
                  <div className="mt-4 grid gap-3">
                    <button onClick={() => setTab('verifications')} className="rounded-2xl bg-amber-50 p-4 text-right font-black text-amber-800">{stats.verifications} طلب توثيق بحاجة مراجعة</button>
                    <button onClick={() => setTab('upgrades')} className="rounded-2xl bg-blue-50 p-4 text-right font-black text-blue-800">{stats.upgrades} طلب ترقية باقة بحاجة مراجعة</button>
                    <button onClick={() => setTab('projects')} className="rounded-2xl bg-sky-50 p-4 text-right font-black text-sky-800">{stats.pendingProjects} مشروع بانتظار النشر</button>
                    <button onClick={() => setTab('reports')} className="rounded-2xl bg-red-50 p-4 text-right font-black text-red-800">{stats.reports} بلاغ بحاجة مراجعة</button>
                  </div>
                </div>
                <div className="rounded-[2rem] border border-slate-100 bg-slate-950 p-5 text-white shadow-sm">
                  <h2 className="text-2xl font-black">Business Snapshot</h2>
                  <p className="mt-4 text-sm font-bold text-slate-300">المحفوظات: {analytics.saves}</p>
                  <p className="mt-2 text-sm font-bold text-slate-300">طلبات التواصل: {analytics.contacted}</p>
                  <p className="mt-2 text-sm font-bold text-slate-300">الرسائل: {analytics.messages}</p>
                  <p className="mt-2 text-sm font-bold text-slate-300">المشاهدات المسجلة: {analytics.views}</p>
                </div>
              </div>
            </div>
          )}

          {tab === 'sectors' && <SectorsPanel sectors={sectors} countries={countries} form={sectorForm} setForm={setSectorForm} saveSector={saveSector} deleteSector={deleteSector} />}

          {tab === 'publish_settings' && (
            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">إعداد نشر المشاريع</h2>
                  <p className="mt-2 text-sm font-bold leading-7 text-slate-500">اختر هل يظهر المشروع مباشرة بعد إضافته، أو ينتظر موافقة الإدارة. توثيق المشروع منفصل دائمًا ويبقى من لوحة التوثيق.</p>
                </div>
                <span className={`rounded-full px-4 py-2 text-xs font-black ${projectPublishMode === 'auto' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{projectPublishMode === 'auto' ? 'النشر تلقائي' : 'بموافقة الإدارة'}</span>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <button type="button" onClick={() => saveProjectPublishMode('auto')} className={`min-h-28 rounded-[1.5rem] border p-5 text-start font-black shadow-sm transition ${projectPublishMode === 'auto' ? 'border-blue-600 bg-blue-700 text-white shadow-blue-900/10' : 'border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50'}`}>
                  <b className="block text-lg font-black">نشر تلقائي</b>
                  <span className="mt-2 block text-sm font-bold leading-7">بعد حفظ المشروع يظهر مباشرة في المنصة، لكن شارة التوثيق لا تظهر إلا بعد قبول الإدارة.</span>
                </button>
                <button type="button" onClick={() => saveProjectPublishMode('manual')} className={`min-h-28 rounded-[1.5rem] border p-5 text-start font-black shadow-sm transition ${projectPublishMode === 'manual' ? 'border-amber-500 bg-amber-500 text-white shadow-amber-900/10' : 'border-slate-200 bg-white text-slate-800 hover:border-amber-200 hover:bg-amber-50'}`}>
                  <b className="block text-lg font-black">موافقة الإدارة</b>
                  <span className="mt-2 block text-sm font-bold leading-7">المشروع يبقى قيد المراجعة حتى تضغط الإدارة زر نشر من تبويب المشاريع.</span>
                </button>
              </div>
            </div>
          )}

          {tab === 'projects' && (
            <div className="grid gap-5">
              <div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="relative flex-1"><Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث عن مشروع..." className="admin-input pr-10" /></div>
                  <select value={projectStatus} onChange={(e) => setProjectStatus(e.target.value)} className="admin-input md:w-56"><option value="all">كل الحالات</option><option value="pending">قيد المراجعة</option><option value="approved">منشور</option><option value="rejected">مرفوض</option><option value="revision">يحتاج تعديل</option></select>
                </div>
              </div>
              <div className="grid gap-3">
                {filteredProjects.map((project) => {
                  const meta = statusMeta(project.status);
                  return <article key={project.id} className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0"><span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ring-1 ${meta.cls}`}><meta.icon className="h-4 w-4" /> {meta.label}</span><h3 className="mt-2 text-xl font-black">{project.title}</h3><p className="mt-1 text-sm font-bold text-slate-500">{project.category} · {project.city || '—'} · {project.countryCode.toUpperCase()} · {money(project.price)} ر.ع</p><p className="mt-1 text-xs font-bold text-slate-400">مشاهدات {project.views} · تواصل {project.contacts} · حفظ {project.saves}</p></div>
                      <div className="flex shrink-0 flex-wrap gap-2"><button onClick={() => openProjectEditor(project)} className="rounded-full bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-800"><FileText className="inline h-4 w-4" /> فتح وإدارة</button><Link target="_blank" href={`/${project.countryCode || 'om'}/ar/project/${encodeURIComponent(project.slug || project.id)}?adminPreview=1`} className="rounded-full bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"><Eye className="inline h-4 w-4" /> معاينة</Link></div>
                    </div>
                  </article>;
                })}
              </div>
            </div>
          )}

          {tab === 'verifications' && <div className="grid gap-4">
            <div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm">
              <select value={verificationStatusFilter} onChange={(e) => setVerificationStatusFilter(e.target.value)} className="admin-input md:w-72">
                <option value="all">كل طلبات التوثيق</option><option value="pending">قيد المراجعة</option><option value="approved">مقبول</option><option value="revision">يحتاج تعديل</option><option value="rejected">مرفوض</option>
              </select>
            </div>
            {filteredVerifications.length ? filteredVerifications.map((item) => { const meta = statusMeta(item.status); return <article key={item.id} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ring-1 ${meta.cls}`}><meta.icon className="h-4 w-4" /> {meta.label}</span><h3 className="mt-3 text-xl font-black">{(item.request_type || item.type) === 'project' ? 'توثيق مشروع' : 'توثيق مستخدم'} {item.project_title ? `— ${item.project_title}` : ''}</h3><p className="mt-2 text-xs font-bold text-slate-500">المستخدم: {userByAuth.get(String(item.user_auth_id))?.name || userByAuth.get(String(item.user_auth_id))?.full_name || userByAuth.get(String(item.user_auth_id))?.email || item.user_auth_id} · المشروع: {item.project_id ? (projectById.get(String(item.project_id))?.title || item.project_title || item.project_id) : '—'}</p>{item.admin_note ? <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">{item.admin_note}</p> : null}</div><div className="flex flex-wrap gap-2">{item.project_id ? <Link target="_blank" href={`/${projectById.get(String(item.project_id))?.countryCode || 'om'}/ar/project/${encodeURIComponent(projectById.get(String(item.project_id))?.slug || String(item.project_id))}?adminPreview=1`} className="rounded-full bg-blue-50 px-4 py-3 text-sm font-black text-blue-700">معاينة المشروع</Link> : null}{item.document_url ? <a href={item.document_url} target="_blank" rel="noreferrer" className="rounded-full bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">فتح الملف</a> : null}<button onClick={() => reviewVerification(item, 'approved')} className="rounded-full bg-blue-600 px-4 py-3 text-sm font-black text-white">قبول</button><button onClick={() => reviewVerification(item, 'revision')} className="rounded-full bg-amber-100 px-4 py-3 text-sm font-black text-amber-800">طلب تعديل</button><button onClick={() => reviewVerification(item, 'rejected')} className="rounded-full bg-red-100 px-4 py-3 text-sm font-black text-red-700">رفض</button></div></div></article>; }) : <EmptyCard text="لا توجد طلبات توثيق." />}
          </div>}

          {tab === 'packages' && <PackagesPanel packages={packages} form={packageForm} setForm={setPackageForm} savePackage={savePackage} deletePackage={deletePackage} />}

          {tab === 'upgrades' && <div className="grid gap-4">
            <div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm">
              <select value={upgradeStatusFilter} onChange={(e) => setUpgradeStatusFilter(e.target.value)} className="admin-input md:w-72"><option value="all">كل طلبات الترقية</option><option value="pending">قيد المراجعة</option><option value="approved">مقبول</option><option value="rejected">مرفوض</option></select>
            </div>
            {filteredUpgrades.length ? filteredUpgrades.map((item) => <article key={item.id} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><h3 className="text-xl font-black">طلب ترقية إلى {item.package_code || 'pro'}</h3><p className="mt-2 text-sm font-bold text-slate-500">المستخدم: {item.user_auth_id} · النوع: {item.package_type || 'investor'} · الحالة: {item.status}</p>{item.payment_reference ? <p className="mt-2 text-xs font-bold text-slate-400">مرجع الدفع: {item.payment_reference}</p> : null}{item.admin_note ? <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">{item.admin_note}</p> : null}</div><div className="flex flex-wrap gap-2"><button onClick={() => reviewUpgrade(item, 'approved')} className="rounded-full bg-blue-600 px-4 py-3 text-sm font-black text-white">قبول وتفعيل</button><button onClick={() => reviewUpgrade(item, 'rejected')} className="rounded-full bg-red-100 px-4 py-3 text-sm font-black text-red-700">رفض</button></div></div></article>) : <EmptyCard text="لا توجد طلبات ترقية." />}
          </div>}

          {tab === 'recommendations' && <RecommendationsAdmin projects={projects} packages={packages} users={users} />}
          {tab === 'notifications' && <NotificationsPanel form={broadcastForm} setForm={setBroadcastForm} sendBroadcast={sendBroadcast} notifications={notifications} users={users} />}
          {tab === 'reports' && <ReportsPanel reports={filteredReports} statusFilter={reportStatusFilter} setStatusFilter={setReportStatusFilter} users={userByAuth} projects={projectById} reviewReport={reviewReport} />}
          {tab === 'ratings' && <RatingsPanel ratings={filteredRatings} statusFilter={ratingStatusFilter} setStatusFilter={setRatingStatusFilter} users={userByAuth} projects={projectById} updateRating={updateRating} />}
          {tab === 'logs' && <ActivityLogsPanel logs={activityLogs} users={userByAuth} />}
          {tab === 'seo' && <SeoPanel />}
          {tab === 'analytics' && <AnalyticsPanel analytics={analytics} projects={projects} users={users} />}
          {tab === 'users' && <UsersPanel users={filteredUsers} userQuery={userQuery} setUserQuery={setUserQuery} updateUser={updateUser} openUserEditor={openUserEditor} />}
          {tab === 'admins' && <AdminAccountsPanel isSuperAdmin={isSuperAdmin} adminAccounts={adminAccounts} invites={adminInvites} form={adminForm} setForm={setAdminForm} createOrUpdateAdmin={createOrUpdateAdmin} revokeAdmin={revokeAdmin} cancelInvite={cancelAdminInvite} updateUser={updateUser} />}
          {tab === 'promotions' && <PromotionRequestsAdminPanel promotionRequests={promotionRequests} updatePromotionRequestStatus={updatePromotionRequestStatus} projects={projects} />}
          {tab === 'languages' && <LanguagesTranslationsPanel languages={languages} translations={filteredTranslations} languageForm={languageForm} setLanguageForm={setLanguageForm} translationForm={translationForm} setTranslationForm={setTranslationForm} translationQuery={translationQuery} setTranslationQuery={setTranslationQuery} saveLanguage={saveLanguage} saveTranslation={saveTranslation} toggleLanguage={toggleLanguage} autoTranslateCurrent={autoTranslateCurrent} seedDefaultTranslations={seedDefaultTranslations} importTranslationsJson={importTranslationsJson} />}
          {tab === 'payment' && <PaymentGatewaySettingsPanel settings={paymentSettings} setSettings={setPaymentSettings} payments={payments} onSave={savePaymentSettings} onReload={loadPaymentSettings} onTest={testPaymentSettings} loading={paymentSettingsLoading} saving={saving} message={paymentSettingsMessage} />}
          {tab === 'ads' && <AdsPanel ads={ads} campaigns={campaigns} promotionRequests={promotionRequests} updatePromotionRequestStatus={updatePromotionRequestStatus} projects={projects} form={adForm} setForm={setAdForm} campaignForm={campaignForm} setCampaignForm={setCampaignForm} saveAd={saveAd} deleteAd={deleteAd} saveCampaign={saveCampaign} deleteCampaign={deleteCampaign} sponsorProject={sponsorProject} />}
          {tab === 'countries' && <CountriesPanel countries={countries} form={countryForm} setForm={setCountryForm} saveCountry={saveCountry} />}
          {tab === 'slides' && <SlidesPanel slides={slides} countries={countries} form={slideForm} setForm={setSlideForm} saveSlide={saveSlide} deleteSlide={deleteSlide} toggleSlide={toggleSlide} sliderEnabled={sliderEnabled} toggleSliderSystem={toggleSliderSystem} />}
        </section>
      </div>
      {adminNoteModal ? <AdminNoteDialog modal={adminNoteModal} onClose={() => setAdminNoteModal(null)} /> : null}
      {userEditModal ? <UserEditDialog modal={userEditModal} setModal={setUserEditModal} onSave={saveUserEditor} onClose={() => setUserEditModal(null)} /> : null}
      {projectEditModal ? <ProjectEditDialog modal={projectEditModal} setModal={setProjectEditModal} onSave={saveProjectEditor} onClose={() => setProjectEditModal(null)} addImage={addProjectImage} deleteImage={deleteProjectImage} updateProject={updateProject} sponsorProject={sponsorProject} deleteProject={deleteProject} /> : null}
    </main>
  );
}


function toLanguage(row: any): PlatformLanguageRow {
  return {
    id: row.id,
    code: String(row.code || '').toLowerCase(),
    nameAr: row.name_ar || row.nameAr || '',
    nameEn: row.name_en || row.nameEn || '',
    direction: row.direction === 'ltr' ? 'ltr' : 'rtl',
    isDefault: row.is_default ?? row.isDefault ?? false,
    isActive: row.is_active ?? row.isActive ?? true,
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 100),
  };
}

function toTranslation(row: any): TranslationRow {
  return {
    id: row.id,
    translationKey: row.translation_key || row.translationKey || '',
    namespace: row.namespace || 'common',
    ar: row.ar || '',
    en: row.en || '',
    notes: row.notes || '',
    isActive: row.is_active ?? row.isActive ?? true,
    updatedAt: row.updated_at || row.updatedAt || null,
  };
}

function EmptyCard({ text }: { text: string }) { return <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center font-black text-slate-500">{text}</div>; }

function PackagesPanel({ packages, form, setForm, savePackage, deletePackage }: any) {
  return <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]"><form onSubmit={savePackage} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-2xl font-black">إضافة / تعديل باقة</h2><div className="mt-5 grid gap-3"><input value={form.code} onChange={(e) => setForm((f: any) => ({ ...f, code: e.target.value }))} placeholder="كود الباقة: investor_pro" className="admin-input" /><input value={form.nameAr} onChange={(e) => setForm((f: any) => ({ ...f, nameAr: e.target.value }))} placeholder="اسم الباقة عربي" className="admin-input" /><input value={form.nameEn} onChange={(e) => setForm((f: any) => ({ ...f, nameEn: e.target.value }))} placeholder="Package name English" className="admin-input" /><select value={form.packageType} onChange={(e) => setForm((f: any) => ({ ...f, packageType: e.target.value }))} className="admin-input"><option value="investor">مستثمر</option><option value="owner">صاحب مشروع</option><option value="both">الاثنين</option></select><div className="grid gap-3 sm:grid-cols-2"><input type="number" value={form.price} onChange={(e) => setForm((f: any) => ({ ...f, price: Number(e.target.value) }))} placeholder="السعر" className="admin-input" /><input value={form.currency} onChange={(e) => setForm((f: any) => ({ ...f, currency: e.target.value }))} placeholder="OMR" className="admin-input" /></div><div className="grid gap-3 sm:grid-cols-2"><input type="number" value={form.recommendationLimit} onChange={(e) => setForm((f: any) => ({ ...f, recommendationLimit: Number(e.target.value) }))} placeholder="عدد التوصيات" className="admin-input" /><input type="number" value={form.projectLimit} onChange={(e) => setForm((f: any) => ({ ...f, projectLimit: Number(e.target.value) }))} placeholder="عدد المشاريع" className="admin-input" /></div><label className="flex items-center gap-2 text-sm font-black"><input type="checkbox" checked={form.verificationIncluded} onChange={(e) => setForm((f: any) => ({ ...f, verificationIncluded: e.target.checked }))} /> يشمل توثيق المشاريع</label><label className="flex items-center gap-2 text-sm font-black"><input type="checkbox" checked={form.featuredIncluded} onChange={(e) => setForm((f: any) => ({ ...f, featuredIncluded: e.target.checked }))} /> يشمل تمييز المشروع</label><label className="flex items-center gap-2 text-sm font-black"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f: any) => ({ ...f, isActive: e.target.checked }))} /> فعالة</label><button className="rounded-full bg-blue-600 px-5 py-3 font-black text-white"><Save className="inline h-4 w-4" /> حفظ الباقة</button></div></form><div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-2xl font-black">الباقات الحالية</h2><div className="mt-5 grid gap-3">{packages.map((pkg: PackageRow) => <div key={pkg.code} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{pkg.nameAr || pkg.code}</p><p className="text-xs font-bold text-slate-500">{pkg.packageType} · {pkg.price} {pkg.currency} · توصيات {pkg.recommendationLimit} · مشاريع {pkg.projectLimit}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${pkg.isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>{pkg.isActive ? 'فعالة' : 'متوقفة'}</span></div><div className="mt-3 flex gap-2"><button onClick={() => setForm(pkg)} className="rounded-full bg-white px-3 py-2 text-xs font-black ring-1 ring-slate-200">تعديل</button><button onClick={() => deletePackage(pkg)} className="rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">تعطيل</button></div></div>)}</div></div></div>;
}

function RecommendationsAdmin({ projects, packages, users }: { projects: AdminProject[]; packages: PackageRow[]; users: any[] }) {
  const verified = projects.filter((p) => p.verified).length;
  const activePackages = packages.filter((p) => p.packageType === 'investor' && p.isActive);
  return <div className="grid gap-5"><div className="grid gap-4 md:grid-cols-3"><AdminStat icon={Sparkles} label="فرص مؤهلة للتوصية" value={projects.filter((p) => ['approved', 'active', 'published'].includes(p.status)).length} tone="bg-blue-50 text-blue-700" /><AdminStat icon={ShieldCheck} label="فرص موثقة" value={verified} tone="bg-sky-50 text-sky-700" /><AdminStat icon={Crown} label="باقات مستثمر نشطة" value={activePackages.length} tone="bg-purple-50 text-purple-700" /></div><div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-2xl font-black">قواعد التوصيات الحالية</h2><div className="mt-4 grid gap-3 text-sm font-bold text-slate-600"><p>✅ تطابق الميزانية مع price / asking_price.</p><p>✅ تطابق التصنيف مع preferred_categories.</p><p>✅ تطابق المدينة أو المحافظة مع preferred_location.</p><p>✅ Boost للمشاريع الموثقة والمميزة.</p><p>✅ عدد النتائج محكوم بباقة المستثمر.</p></div><div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-black text-amber-800">تحكم الباقات يتم من تبويب الباقات، وتفعيل/إيقاف التوثيق والتمييز يتم من تبويب المشاريع والتوثيق.</div></div><div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-2xl font-black">عيّنة مستخدمين للتوصيات</h2><div className="mt-4 grid gap-3">{users.slice(0, 8).map((u) => <div key={String(u.id || u.auth_id || u.email)} className="rounded-2xl bg-slate-50 p-4"><p className="font-black">{u.name || u.email || 'مستخدم'}</p><p className="text-xs font-bold text-slate-500">ميزانية: {u.budget_min || 0} - {u.budget_max || 0} · موقع: {u.preferred_location || '—'} · تصنيفات: {Array.isArray(u.preferred_categories) ? u.preferred_categories.join(', ') : u.preferred_categories || '—'}</p></div>)}</div></div></div>;
}

function NotificationsPanel({ form, setForm, sendBroadcast, notifications, users }: any) {
  return <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]"><form onSubmit={sendBroadcast} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-2xl font-black">إرسال إشعار</h2><div className="mt-5 grid gap-3"><input value={form.title} onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="عنوان الإشعار" className="admin-input" /><textarea value={form.body} onChange={(e) => setForm((f: any) => ({ ...f, body: e.target.value }))} placeholder="نص الإشعار" className="admin-input min-h-28" /><select value={form.targetRole} onChange={(e) => setForm((f: any) => ({ ...f, targetRole: e.target.value }))} className="admin-input"><option value="all">كل المستخدمين ({users.length})</option><option value="investor">المستثمرين</option><option value="owner">أصحاب المشاريع</option></select><select value={form.type} onChange={(e) => setForm((f: any) => ({ ...f, type: e.target.value }))} className="admin-input"><option value="system">System</option><option value="package">Package</option><option value="verification">Verification</option><option value="recommendation">Recommendation</option></select><button className="rounded-full bg-blue-600 px-5 py-3 font-black text-white"><Megaphone className="inline h-4 w-4" /> إرسال</button></div></form><div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-2xl font-black">آخر الإشعارات</h2><div className="mt-5 grid gap-3">{notifications.map((n: NotificationRow) => <div key={String(n.id || `${n.title}-${n.created_at}`)} className="rounded-2xl bg-slate-50 p-4"><p className="font-black">{n.title}</p><p className="mt-1 text-sm font-bold text-slate-500">{n.body}</p><p className="mt-2 text-xs font-bold text-slate-400">{n.type} · {n.user_auth_id || 'عام'}</p></div>)}</div></div></div>;
}

function AnalyticsPanel({ analytics, projects, users }: { analytics: any; projects: AdminProject[]; users: any[] }) {
  const topProjects = [...projects].sort((a, b) => (b.views + b.contacts + b.saves) - (a.views + a.contacts + a.saves)).slice(0, 8);
  return <div className="grid gap-5"><div className="grid gap-4 md:grid-cols-5"><AdminStat icon={Eye} label="مشاهدات" value={analytics.views} tone="bg-sky-50 text-sky-700" /><AdminStat icon={Save} label="محفوظات" value={analytics.saves} tone="bg-blue-50 text-blue-700" /><AdminStat icon={TrendingUp} label="تواصلات" value={analytics.contacted} tone="bg-amber-50 text-amber-700" /><AdminStat icon={Activity} label="محادثات" value={analytics.conversations} tone="bg-purple-50 text-purple-700" /><AdminStat icon={Bell} label="رسائل" value={analytics.messages} tone="bg-rose-50 text-rose-700" /></div><div className="grid gap-5 lg:grid-cols-2"><AnalyticsBars title="قنوات التفاعل" rows={[{ label: 'مشاهدات', value: analytics.views }, { label: 'محفوظات', value: analytics.saves }, { label: 'تواصلات', value: analytics.contacted }, { label: 'محادثات', value: analytics.conversations }, { label: 'رسائل', value: analytics.messages }]} /><AnalyticsBars title="أفضل القطاعات" rows={Object.entries(projects.reduce((acc: Record<string, number>, p) => { acc[p.category || 'other'] = (acc[p.category || 'other'] || 0) + 1; return acc; }, {})).map(([label, value]) => ({ label, value: Number(value) })).slice(0, 8)} /></div><div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-2xl font-black">أقوى المشاريع أداءً</h2><div className="mt-5 grid gap-3">{topProjects.map((p) => <div key={p.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-black">{p.title}</p><p className="text-xs font-bold text-slate-500">مشاهدات {p.views} · تواصل {p.contacts} · حفظ {p.saves}</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">{p.category}</span></div></div>)}</div></div></div>;
}

function UsersPanel({ users, userQuery, setUserQuery, updateUser, openUserEditor }: { users: any[]; userQuery: string; setUserQuery: (value: string) => void; updateUser: (u: any, p: Record<string, any>) => void; openUserEditor: (u: any) => void }) {
  return <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><h2 className="text-2xl font-black">المستخدمين والصلاحيات</h2><input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="بحث عن مستخدم..." className="admin-input md:w-80" /></div><div className="mt-5 grid gap-3">{users.map((user) => <div key={String(user.id || user.auth_id || user.email)} className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="font-black">{user.name || user.full_name || user.email || 'مستخدم'}</p><p className="text-xs font-bold text-slate-500">{user.email || user.phone || user.auth_id}</p><p className="mt-1 text-xs font-bold text-slate-400">role: {user.role || '—'} · type: {user.account_type || '—'} · plan: {user.subscription_status || user.plan || 'free'}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => openUserEditor(user)} className="rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">تعديل الحساب</button><button onClick={() => updateUser(user, { role: 'admin', admin_role: 'admin', is_admin: true, admin_status: 'active', admin_permissions: LIMITED_ADMIN_PERMISSIONS })} className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white">جعله مدير</button><button onClick={() => updateUser(user, { subscription_status: 'pro', plan: 'pro' })} className="rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">Pro</button><button onClick={() => updateUser(user, { subscription_status: 'elite', plan: 'elite' })} className="rounded-full bg-purple-50 px-3 py-2 text-xs font-black text-purple-700">Elite</button><button onClick={() => updateUser(user, { is_blocked: true })} className="rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">حظر</button><button onClick={() => updateUser(user, { is_blocked: false })} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">رفع الحظر</button></div></div></div>)}</div></div>;
}


function AdminAccountsPanel({ isSuperAdmin, adminAccounts, invites, form, setForm, createOrUpdateAdmin, revokeAdmin, cancelInvite, updateUser }: any) {
  const togglePermission = (key: string) => setForm((f: any) => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions?.[key] } }));
  return <div className="grid gap-5 xl:grid-cols-[.95fr_1.05fr]">
    <form onSubmit={createOrUpdateAdmin} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700"><UserPlus className="h-5 w-5" /></div><div><h2 className="text-2xl font-black">إنشاء / ترقية حساب إدارة</h2><p className="mt-1 text-sm font-bold text-slate-500">يفضل إنشاء المستخدم عاديًا أولًا ثم ترقيته. إذا البريد غير موجود سيتم إنشاء دعوة إدارية.</p></div></div>
      {!isSuperAdmin ? <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-black text-amber-800">هذه الصفحة للعرض فقط. إنشاء وتعديل حسابات الإدارة متاح فقط لـ Super Admin.</div> : null}
      <div className="mt-5 grid gap-3">
        <input disabled={!isSuperAdmin} value={form.email} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} placeholder="admin@example.com" className="admin-input" />
        <input disabled={!isSuperAdmin} value={form.name} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="اسم المدير" className="admin-input" />
        <select disabled={!isSuperAdmin} value={form.role} onChange={(e) => setForm((f: any) => ({ ...f, role: e.target.value, permissions: e.target.value === 'super_admin' ? DEFAULT_ADMIN_PERMISSIONS : f.permissions }))} className="admin-input">
          <option value="admin">Admin كامل</option>
          <option value="verification_admin">مدير التوثيق</option>
          <option value="content_admin">مدير المحتوى</option>
          <option value="finance_admin">مدير الباقات والمدفوعات</option>
          <option value="support_admin">دعم فني</option>
          <option value="super_admin">Super Admin</option>
        </select>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="mb-3 text-sm font-black text-slate-700">الصلاحيات التفصيلية</p>
          <div className="grid gap-2 md:grid-cols-2">
            {ADMIN_PERMISSION_OPTIONS.map((permission) => <label key={permission.key} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-100"><input disabled={!isSuperAdmin || form.role === 'super_admin'} type="checkbox" checked={!!form.permissions?.[permission.key]} onChange={() => togglePermission(permission.key)} /> {permission.label}</label>)}
          </div>
        </div>
        <button disabled={!isSuperAdmin} className="rounded-full bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-50">حفظ حساب الإدارة</button>
      </div>
    </form>
    <div className="grid gap-5">
      <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-2xl font-black">المدراء الحاليون</h2><div className="mt-5 grid gap-3">{adminAccounts.length ? adminAccounts.map((user: any) => <div key={String(user.id || user.auth_id || user.email)} className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="font-black">{user.name || user.full_name || user.email}</p><p className="text-xs font-bold text-slate-500">{user.email} · {user.role || 'admin'} · {user.admin_status || 'active'}</p><p className="mt-1 text-xs font-bold text-slate-400">صلاحيات: {Object.entries(user.admin_permissions || {}).filter(([, v]) => v).map(([k]) => k).join(', ') || 'كل/غير محدد'}</p></div><div className="flex flex-wrap gap-2"><button disabled={!isSuperAdmin} onClick={() => setForm({ email: user.email || '', name: user.name || user.full_name || '', role: user.admin_role || user.role || 'admin', permissions: user.admin_permissions || LIMITED_ADMIN_PERMISSIONS })} className="rounded-full bg-white px-3 py-2 text-xs font-black ring-1 ring-slate-200 disabled:opacity-50">تعديل الصلاحيات</button><button disabled={!isSuperAdmin || user.role === 'super_admin'} onClick={() => revokeAdmin(user)} className="rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 disabled:opacity-40">سحب الإدارة</button><button disabled={!isSuperAdmin} onClick={() => updateUser(user, { admin_status: user.admin_status === 'suspended' ? 'active' : 'suspended' })} className="rounded-full bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 disabled:opacity-40">{user.admin_status === 'suspended' ? 'تفعيل' : 'تعليق'}</button></div></div></div>) : <EmptyCard text="لا توجد حسابات إدارة." />}</div></div>
      <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-2xl font-black">الدعوات الإدارية</h2><div className="mt-5 grid gap-3">{invites.length ? invites.map((invite: AdminInvite) => <div key={String(invite.id || invite.email)} className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="font-black">{invite.name || invite.email}</p><p className="text-xs font-bold text-slate-500">{invite.email} · {invite.role} · {invite.status || 'invited'}</p></div><button disabled={!isSuperAdmin || invite.status === 'cancelled'} onClick={() => cancelInvite(invite)} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40">إلغاء الدعوة</button></div></div>) : <EmptyCard text="لا توجد دعوات إدارية." />}</div></div>
    </div>
  </div>;
}


function AdminNoteDialog({ modal, onClose }: { modal: NonNullable<AdminNoteModal>; onClose: () => void }) {
  const [note, setNote] = useState(modal.initial || '');
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl"><h3 className="text-2xl font-black">{modal.title}</h3>{modal.message ? <p className="mt-2 text-sm font-bold text-slate-500">{modal.message}</p> : null}<textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} className="admin-input mt-5 min-h-32" placeholder="ملاحظة الإدارة" /><div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="rounded-full bg-slate-100 px-5 py-3 font-black text-slate-700">إلغاء</button><button onClick={async () => { await modal.onConfirm(note); onClose(); }} className="rounded-full bg-blue-600 px-5 py-3 font-black text-white">{modal.confirmLabel || 'حفظ'}</button></div></div></div>;
}

function UserEditDialog({ modal, setModal, onSave, onClose }: { modal: NonNullable<UserEditModal>; setModal: any; onSave: () => void; onClose: () => void }) {
  const f = modal.form;
  const setF = (patch: Record<string, any>) => setModal((m: any) => m ? ({ ...m, form: { ...m.form, ...patch } }) : m);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl"><h3 className="text-2xl font-black">تعديل حساب المستخدم</h3><p className="mt-1 text-sm font-bold text-slate-500">{modal.user.email}</p><div className="mt-5 grid gap-3 md:grid-cols-2"><input className="admin-input" value={f.name} onChange={(e) => setF({ name: e.target.value })} placeholder="الاسم" /><input className="admin-input" value={f.phone} onChange={(e) => setF({ phone: e.target.value })} placeholder="الهاتف" /><input className="admin-input" value={f.whatsapp} onChange={(e) => setF({ whatsapp: e.target.value })} placeholder="واتساب" /><select className="admin-input" value={f.account_type} onChange={(e) => setF({ account_type: e.target.value })}><option value="investor">مستثمر</option><option value="owner">صاحب مشروع</option><option value="both">الاثنين معًا</option></select><select className="admin-input" value={f.subscription_status} onChange={(e) => setF({ subscription_status: e.target.value, plan: e.target.value })}><option value="free">Free</option><option value="starter">Starter</option><option value="pro">Pro</option><option value="elite">Elite</option><option value="business">Business</option></select><select className="admin-input" value={f.role} onChange={(e) => setF({ role: e.target.value })}><option value="user">User</option><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select><label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 font-black"><input type="checkbox" checked={!!f.is_verified} onChange={(e) => setF({ is_verified: e.target.checked })} /> موثق</label><label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 font-black"><input type="checkbox" checked={!!f.is_blocked} onChange={(e) => setF({ is_blocked: e.target.checked })} /> محظور</label></div><div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="rounded-full bg-slate-100 px-5 py-3 font-black text-slate-700">إلغاء</button><button onClick={onSave} className="rounded-full bg-blue-600 px-5 py-3 font-black text-white">حفظ التعديل</button></div></div></div>;
}

function ProjectEditDialog({ modal, setModal, onSave, onClose, addImage, deleteImage, updateProject, sponsorProject, deleteProject }: { modal: NonNullable<ProjectEditModal>; setModal: any; onSave: () => void; onClose: () => void; addImage: () => void; deleteImage: (image: any) => void; updateProject: (id: string, patch: Record<string, any>) => Promise<void>; sponsorProject: (project: AdminProject) => Promise<void>; deleteProject: (id: string) => Promise<void> }) {
  const f = modal.form;
  const project = modal.project;
  const setF = (patch: Record<string, any>) => setModal((m: any) => m ? ({ ...m, form: { ...m.form, ...patch } }) : m);
  const action = async (patch: Record<string, any>) => { await updateProject(project.id, patch); onClose(); };
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"><div className="mx-auto my-6 w-full max-w-5xl rounded-[2rem] bg-white p-6 shadow-2xl">
    <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
      <div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">إدارة مشروع</span><h3 className="mt-3 text-2xl font-black text-slate-950">{project.title}</h3><p className="mt-1 text-sm font-bold text-slate-500">{project.category} · {project.city || '—'} · مشاهدات {project.views} · تواصل {project.contacts} · حفظ {project.saves}</p></div>
      <Link target="_blank" href={`/${project.countryCode || 'om'}/ar/project/${encodeURIComponent(project.slug || project.id)}?adminPreview=1`} className="rounded-full bg-slate-100 px-5 py-3 text-sm font-black text-slate-700"><Eye className="inline h-4 w-4" /> معاينة المشروع</Link>
    </div>

    <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
      <section className="rounded-[1.5rem] bg-slate-50 p-4">
        <h4 className="mb-4 font-black text-slate-950">تعديل بيانات المشروع</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="admin-input" value={f.title_ar || ''} onChange={(e) => setF({ title_ar: e.target.value })} placeholder="عنوان المشروع عربي" />
          <input className="admin-input" value={f.title_en || ''} onChange={(e) => setF({ title_en: e.target.value })} placeholder="Project title EN" />
          <select className="admin-input" value={f.opportunity_type || 'sale'} onChange={(e) => setF({ opportunity_type: e.target.value })}>
            <option value="sale">بيع مشروع</option><option value="partnership">شراكة</option><option value="funding">تمويل</option><option value="franchise">امتياز</option>
          </select>
          <input className="admin-input" value={f.category || ''} onChange={(e) => setF({ category: e.target.value, sector: e.target.value })} placeholder="القطاع / التصنيف" />
          <input className="admin-input" value={f.city || ''} onChange={(e) => setF({ city: e.target.value })} placeholder="المدينة" />
          <input className="admin-input" value={f.location || ''} onChange={(e) => setF({ location: e.target.value })} placeholder="الموقع التفصيلي" />
          <input className="admin-input" type="number" value={f.price || ''} onChange={(e) => setF({ price: e.target.value })} placeholder="السعر" />
          <input className="admin-input" type="number" value={f.roi || ''} onChange={(e) => setF({ roi: e.target.value })} placeholder="العائد المتوقع %" />
          <input className="admin-input" type="number" value={f.funding_amount || ''} onChange={(e) => setF({ funding_amount: e.target.value })} placeholder="مبلغ التمويل" />
          <input className="admin-input" type="number" value={f.partnership_percent || ''} onChange={(e) => setF({ partnership_percent: e.target.value })} placeholder="نسبة الشراكة %" />
          <input className="admin-input" type="number" value={f.franchise_fee || ''} onChange={(e) => setF({ franchise_fee: e.target.value })} placeholder="رسوم الامتياز" />
          <input className="admin-input" type="number" value={f.monthly_profit || ''} onChange={(e) => setF({ monthly_profit: e.target.value })} placeholder="صافي الربح الشهري" />
          <input className="admin-input" type="number" value={f.employees_count || ''} onChange={(e) => setF({ employees_count: e.target.value })} placeholder="عدد الموظفين" />
          <input className="admin-input" type="number" value={f.years_operating || ''} onChange={(e) => setF({ years_operating: e.target.value })} placeholder="سنوات التشغيل" />
          <input className="admin-input" value={f.payback_period || ''} onChange={(e) => setF({ payback_period: e.target.value })} placeholder="مدة الاسترداد" />
          <input className="admin-input" value={f.phone_country_code || '+968'} onChange={(e) => setF({ phone_country_code: e.target.value })} placeholder="مفتاح الهاتف" />
          <input className="admin-input" value={f.contact_phone || ''} onChange={(e) => setF({ contact_phone: e.target.value.replace(/[^0-9]/g, '') })} placeholder="رقم الهاتف" inputMode="numeric" />
          <input className="admin-input" value={f.whatsapp_country_code || '+968'} onChange={(e) => setF({ whatsapp_country_code: e.target.value })} placeholder="مفتاح واتساب" />
          <input className="admin-input" value={f.contact_whatsapp || ''} onChange={(e) => setF({ contact_whatsapp: e.target.value.replace(/[^0-9]/g, '') })} placeholder="واتساب" inputMode="numeric" />
          <input className="admin-input" type="number" value={f.map_lat || ''} onChange={(e) => setF({ map_lat: e.target.value })} placeholder="Latitude" />
          <input className="admin-input" type="number" value={f.map_lng || ''} onChange={(e) => setF({ map_lng: e.target.value })} placeholder="Longitude" />
          <textarea className="admin-input md:col-span-2 min-h-28" value={f.description_ar || ''} onChange={(e) => setF({ description_ar: e.target.value })} placeholder="وصف المشروع عربي" />
          <textarea className="admin-input md:col-span-2 min-h-28" value={f.description_en || ''} onChange={(e) => setF({ description_en: e.target.value })} placeholder="Project description EN" />
          <input className="admin-input md:col-span-2" value={f.cover_image_url || ''} onChange={(e) => setF({ cover_image_url: e.target.value })} placeholder="رابط صورة الغلاف" />
          <select className="admin-input" value={f.status || 'approved'} onChange={(e) => setF({ status: e.target.value, moderation_status: e.target.value })}><option value="pending">قيد المراجعة</option><option value="approved">منشور</option><option value="revision">يحتاج تعديل</option><option value="rejected">مرفوض</option></select>
          <label className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 font-black"><input type="checkbox" checked={!!f.is_verified} onChange={(e) => setF({ is_verified: e.target.checked, verification_status: e.target.checked ? 'approved' : 'pending' })} /> مشروع موثق</label>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2"><button onClick={onClose} className="rounded-full bg-white px-5 py-3 font-black text-slate-700 ring-1 ring-slate-200">إغلاق</button><button onClick={onSave} className="rounded-full bg-blue-700 px-5 py-3 font-black text-white">حفظ التعديلات</button></div>
      </section>

      <aside className="grid gap-3">
        <button onClick={() => action({ status: 'approved' })} className="rounded-2xl bg-blue-700 px-5 py-4 text-right font-black text-white">نشر المشروع</button>
        <button onClick={() => action({ is_verified: true, verified: true, verification_status: 'approved' })} className="rounded-2xl bg-blue-50 px-5 py-4 text-right font-black text-blue-800">توثيق المشروع</button>
        <button onClick={() => action({ is_featured: true, featured_until: new Date(Date.now() + 7 * 86400000).toISOString() })} className="rounded-2xl bg-amber-50 px-5 py-4 text-right font-black text-amber-800">تمييز 7 أيام</button>
        <button onClick={async () => { await sponsorProject(project); onClose(); }} className="rounded-2xl bg-yellow-100 px-5 py-4 text-right font-black text-yellow-900">ترويج المشروع</button>
        <button onClick={() => action({ status: 'revision' })} className="rounded-2xl bg-orange-50 px-5 py-4 text-right font-black text-orange-800">طلب تعديل من صاحب المشروع</button>
        <button onClick={() => action({ status: 'rejected', is_active: false })} className="rounded-2xl bg-rose-50 px-5 py-4 text-right font-black text-rose-800">رفض المشروع</button>
        <button onClick={async () => { await deleteProject(project.id); onClose(); }} className="rounded-2xl bg-slate-950 px-5 py-4 text-right font-black text-white">حذف المشروع</button>
      </aside>
    </div>

    <div className="mt-6 rounded-2xl bg-slate-50 p-4"><h4 className="font-black">صور المشروع</h4><div className="mt-3 grid gap-3 md:grid-cols-3">{modal.gallery.map((image: any) => <div key={String(image.id || image.image_url || image.url)} className="rounded-2xl bg-white p-2 ring-1 ring-slate-100"><div className="h-28 rounded-xl bg-slate-100 bg-cover bg-center" style={{ backgroundImage: `url(${image.image_url || image.url})` }} /><button onClick={() => deleteImage(image)} className="mt-2 w-full rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">حذف الصورة</button></div>)}</div><div className="mt-4 flex gap-2"><input className="admin-input" value={modal.newImageUrl} onChange={(e) => setModal((m: any) => m ? ({ ...m, newImageUrl: e.target.value }) : m)} placeholder="رابط صورة جديدة" /><button onClick={addImage} className="rounded-full bg-slate-950 px-5 py-3 font-black text-white">إضافة</button></div></div>
  </div></div>;
}


function ReportsPanel({ reports, statusFilter, setStatusFilter, users, projects, reviewReport }: any) {
  const userName = (id?: string | null) => id ? (users.get(String(id))?.name || users.get(String(id))?.full_name || users.get(String(id))?.email || id) : '—';
  const projectName = (id?: string | null) => id ? (projects.get(String(id))?.title || id) : '—';
  return <div className="grid gap-5">
    <div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div><h2 className="text-2xl font-black">مركز البلاغات والمراجعة</h2><p className="text-sm font-bold text-slate-500">راجع بلاغات المشاريع والمستخدمين والرسائل واتخذ إجراء واضح.</p></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-input md:w-60"><option value="all">كل البلاغات</option><option value="open">مفتوح</option><option value="reviewing">قيد المراجعة</option><option value="resolved">مغلق</option><option value="hidden">تم إخفاء المحتوى</option><option value="suspended">تم تعليق المستخدم</option><option value="rejected">مرفوض</option></select>
      </div>
    </div>
    {reports.length ? reports.map((item: ReportRow) => <article key={item.id} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 ring-1 ring-red-100">{item.status || 'open'}</span>
          <h3 className="mt-3 text-xl font-black">بلاغ على {item.target_type || 'محتوى'}</h3>
          <p className="mt-2 text-sm font-bold text-slate-500">المبلّغ: {userName(item.reporter_auth_id)} · المستخدم المبلّغ عنه: {userName(item.reported_user_auth_id)} · المشروع: {projectName(item.project_id || item.target_id)}</p>
          <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700">{item.reason || 'بدون سبب'} — {item.description || 'لا يوجد وصف إضافي'}</p>
          {item.admin_note ? <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">ملاحظة الإدارة: {item.admin_note}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {['open','pending','reviewing'].includes(String(item.status || 'open').toLowerCase()) ? <>
            <button onClick={() => reviewReport(item, 'reviewing')} className="rounded-full bg-sky-50 px-4 py-3 text-sm font-black text-sky-700">قيد المراجعة</button>
            <button onClick={() => reviewReport(item, 'resolved')} className="rounded-full bg-blue-600 px-4 py-3 text-sm font-black text-white">إغلاق</button>
            <button onClick={() => reviewReport(item, 'hidden')} className="rounded-full bg-amber-100 px-4 py-3 text-sm font-black text-amber-800">إخفاء المحتوى</button>
            <button onClick={() => reviewReport(item, 'suspended')} className="rounded-full bg-red-100 px-4 py-3 text-sm font-black text-red-700">تعليق المستخدم</button>
            <button onClick={() => reviewReport(item, 'rejected')} className="rounded-full bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">رفض البلاغ</button>
          </> : <span className="rounded-full bg-slate-100 px-4 py-3 text-sm font-black text-slate-600">تمت المعالجة: {item.status}</span>}
        </div>
      </div>
    </article>) : <EmptyCard text="لا توجد بلاغات بهذه الحالة." />}
  </div>;
}

function RatingsPanel({ ratings, statusFilter, setStatusFilter, users, projects, updateRating }: any) {
  const userName = (id?: string | null) => id ? (users.get(String(id))?.name || users.get(String(id))?.full_name || users.get(String(id))?.email || id) : '—';
  const projectName = (id?: string | null) => id ? (projects.get(String(id))?.title || id) : '—';
  const avg = ratings.length ? (ratings.reduce((sum: number, r: RatingRow) => sum + Number(r.rating || 0), 0) / ratings.length).toFixed(1) : '0.0';
  return <div className="grid gap-5">
    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className="text-2xl font-black">التقييمات ونقاط الثقة</h2><p className="text-sm font-bold text-slate-500">متوسط التقييم الحالي: {avg} / 5</p></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-input md:w-60"><option value="all">كل التقييمات</option><option value="pending">بانتظار النشر</option><option value="published">منشور</option><option value="hidden">مخفي</option></select></div>
    </div>
    {ratings.length ? ratings.map((item: RatingRow) => <article key={item.id} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="text-xl text-amber-400">{'★'.repeat(Math.max(1, Math.min(5, Number(item.rating || 0))))}<span className="text-slate-300">{'★'.repeat(Math.max(0, 5 - Number(item.rating || 0)))}</span></div><h3 className="mt-2 font-black">{userName(item.reviewer_auth_id)} قيّم {userName(item.reviewed_auth_id)}</h3><p className="mt-1 text-sm font-bold text-slate-500">المشروع: {projectName(item.project_id)} · الحالة: {item.status}</p>{item.comment ? <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700">{item.comment}</p> : null}</div><div className="flex gap-2">{String(item.status || 'published').toLowerCase() !== 'published' ? <button onClick={() => updateRating(item, 'published')} className="rounded-full bg-blue-600 px-4 py-3 text-sm font-black text-white">نشر</button> : null}{String(item.status || '').toLowerCase() !== 'hidden' ? <button onClick={() => updateRating(item, 'hidden')} className="rounded-full bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">إخفاء</button> : <span className="rounded-full bg-slate-100 px-4 py-3 text-sm font-black text-slate-600">مخفي</span>}</div></div></article>) : <EmptyCard text="لا توجد تقييمات." />}
  </div>;
}

function ActivityLogsPanel({ logs, users }: any) {
  const userName = (id?: string | null) => id ? (users.get(String(id))?.name || users.get(String(id))?.full_name || users.get(String(id))?.email || id) : 'النظام';
  return <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-2xl font-black">سجل عمليات الإدارة</h2><div className="mt-5 grid gap-3">{logs.length ? logs.map((log: ActivityLogRow) => <div key={log.id} className="rounded-2xl bg-slate-50 p-4"><p className="font-black">{log.action}</p><p className="mt-1 text-xs font-bold text-slate-500">بواسطة: {userName(log.admin_auth_id)} · الهدف: {log.target_type || '—'} / {log.target_id || '—'} · {log.created_at ? new Date(log.created_at).toLocaleString('ar-OM') : ''}</p>{log.details ? <pre className="mt-3 max-h-32 overflow-auto rounded-xl bg-white p-3 text-xs text-slate-600">{JSON.stringify(log.details, null, 2)}</pre> : null}</div>) : <EmptyCard text="لا يوجد سجل عمليات بعد." />}</div></div>;
}

function SeoPanel() {
  return <div className="grid gap-5 xl:grid-cols-2">
    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-2xl font-black">SEO Production</h2><p className="mt-2 text-sm font-bold text-slate-500">تم تجهيز ملفات sitemap و robots و metadata الأساسية. المرحلة التالية: توليد روابط المشاريع ديناميكيًا من Supabase وقت النشر.</p><div className="mt-5 grid gap-3 text-sm font-black text-slate-700"><a className="rounded-2xl bg-slate-50 p-4" href="/sitemap.xml" target="_blank">فتح sitemap.xml</a><a className="rounded-2xl bg-slate-50 p-4" href="/robots.txt" target="_blank">فتح robots.txt</a></div></div>
    <div className="rounded-[2rem] border border-slate-100 bg-slate-950 p-5 text-white shadow-sm"><h2 className="text-2xl font-black">Checklist قبل الإطلاق</h2><ul className="mt-4 grid gap-2 text-sm font-bold text-slate-300"><li>✓ OpenGraph للصفحات الأساسية</li><li>✓ robots.txt</li><li>✓ sitemap ثابت كبداية</li><li>✓ إخفاء المشاريع المرفوضة من الواجهة</li><li>✓ إشعارات وبلاغات وسجلات نشاط</li></ul></div>
  </div>;
}


function SectorsPanel({ sectors, countries, form, setForm, saveSector, deleteSector }: any) {
  return <div className="grid gap-5">
    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-black">إدارة القطاعات</h2>
      <p className="mt-2 text-sm font-bold text-slate-500">أضف القطاعات يدويًا مع رمز أو صورة، ثم تظهر في الرئيسية ونموذج إضافة المشروع والفلترة.</p>
      <form onSubmit={saveSector} className="mt-5 grid gap-3 md:grid-cols-3">
        <input value={form.key} onChange={(e) => setForm((p: SectorRow) => ({ ...p, key: e.target.value }))} placeholder="key مثل restaurants" className="rounded-2xl border border-slate-200 px-4 py-3 font-bold" />
        <input value={form.nameAr} onChange={(e) => setForm((p: SectorRow) => ({ ...p, nameAr: e.target.value }))} placeholder="الاسم العربي" className="rounded-2xl border border-slate-200 px-4 py-3 font-bold" />
        <input value={form.nameEn} onChange={(e) => setForm((p: SectorRow) => ({ ...p, nameEn: e.target.value }))} placeholder="English name" className="rounded-2xl border border-slate-200 px-4 py-3 font-bold" />
        <input value={form.icon} onChange={(e) => setForm((p: SectorRow) => ({ ...p, icon: e.target.value }))} placeholder="رمز/Emoji" className="rounded-2xl border border-slate-200 px-4 py-3 font-bold" />
        <input value={form.imageUrl} onChange={(e) => setForm((p: SectorRow) => ({ ...p, imageUrl: e.target.value }))} placeholder="رابط صورة اختياري" className="rounded-2xl border border-slate-200 px-4 py-3 font-bold" />
        <select value={form.countryCode} onChange={(e) => setForm((p: SectorRow) => ({ ...p, countryCode: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 font-bold">
          {(countries.length ? countries : [{ code: 'om', nameAr: 'عمان' }]).map((c: any) => <option key={c.code} value={c.code}>{c.flag} {c.nameAr || c.nameEn || c.code}</option>)}
        </select>
        <input type="number" value={form.sortOrder} onChange={(e) => setForm((p: SectorRow) => ({ ...p, sortOrder: Number(e.target.value || 100) }))} placeholder="الترتيب" className="rounded-2xl border border-slate-200 px-4 py-3 font-bold" />
        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 font-black"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p: SectorRow) => ({ ...p, isActive: e.target.checked }))} /> ظاهر</label>
        <button className="rounded-2xl bg-blue-700 px-5 py-3 font-black text-white">حفظ القطاع</button>
      </form>
    </div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {sectors.length ? sectors.map((sector: SectorRow) => <div key={sector.id || sector.key} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          {sector.imageUrl ? <div className="h-14 w-14 rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${sector.imageUrl})` }} /> : <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-2xl">{sector.icon}</div>}
          <div className="min-w-0"><p className="font-black">{sector.nameAr}</p><p className="text-xs font-bold text-slate-500">{sector.key} · {sector.countryCode.toUpperCase()} · ترتيب {sector.sortOrder}</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => setForm(sector)} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black">تعديل</button>
          <button onClick={() => setForm({ ...sector, isActive: !sector.isActive })} className="rounded-full bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">{sector.isActive ? 'إيقاف من النموذج' : 'تفعيل من النموذج'}</button>
          <button onClick={() => deleteSector(sector)} className="rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">حذف</button>
        </div>
      </div>) : <EmptyCard text="لا توجد قطاعات بعد." />}
    </div>
  </div>;
}


function PromotionRequestsAdminPanel({ promotionRequests, updatePromotionRequestStatus, projects }: { promotionRequests: PromotionRequestRow[]; updatePromotionRequestStatus: (request: PromotionRequestRow, status: 'approved' | 'active' | 'rejected') => void; projects: AdminProject[] }) {
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const pending = promotionRequests.filter((request) => String(request.status || 'pending').toLowerCase() === 'pending').length;
  const active = promotionRequests.filter((request) => ['active', 'approved', 'running'].includes(String(request.status || '').toLowerCase())).length;
  const budget = promotionRequests.reduce((sum, request) => sum + Number(request.price || request.amount || 0), 0);
  const views = promotionRequests.reduce((sum, request) => sum + Number(request.promotion_views || request.views || request.impressions || 0), 0);
  const clicks = promotionRequests.reduce((sum, request) => sum + Number(request.promotion_clicks || request.clicks || 0), 0);
  const contacts = promotionRequests.reduce((sum, request) => sum + Number(request.promotion_contacts || request.contacts || 0), 0);
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-6">
        <AdminStat icon={Clock3} label="قيد المراجعة" value={pending} tone="bg-amber-50 text-amber-700" />
        <AdminStat icon={Megaphone} label="قيد الترويج" value={active} tone="bg-blue-50 text-blue-700" />
        <AdminStat icon={Eye} label="مشاهدات الترويج" value={views.toLocaleString('en-US')} tone="bg-sky-50 text-sky-700" />
        <AdminStat icon={TrendingUp} label="نقرات الترويج" value={clicks.toLocaleString('en-US')} tone="bg-purple-50 text-purple-700" />
        <AdminStat icon={MessageCircle} label="عدد التواصل" value={contacts.toLocaleString('en-US')} tone="bg-rose-50 text-rose-700" />
        <AdminStat icon={TrendingUp} label="إجمالي الميزانيات" value={`${budget.toLocaleString('en-US')} ر.ع`} tone="bg-slate-50 text-slate-700" />
      </div>
      <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black">تقرير الإيرادات الشهرية</h2>
        <p className="mt-1 text-sm font-bold text-slate-500">تجميع سريع لإيرادات الترويج وعدد الطلبات المدفوعة حسب الشهر.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {Object.entries(promotionRequests.reduce((acc: Record<string, { revenue: number; orders: number }>, request) => {
            const date = request.created_at ? new Date(request.created_at) : new Date();
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            acc[key] = acc[key] || { revenue: 0, orders: 0 };
            acc[key].revenue += Number(request.price || request.amount || 0);
            acc[key].orders += 1;
            return acc;
          }, {})).slice(0, 6).map(([month, value]) => (
            <div key={month} className="rounded-2xl bg-slate-50 p-4">
              <span className="text-xs font-black text-slate-500">{month}</span>
              <b className="mt-1 block text-2xl font-black text-slate-950">{value.revenue.toLocaleString('en-US')} ر.ع</b>
              <small className="font-bold text-slate-500">{value.orders} طلب · متوسط {(value.revenue / Math.max(1, value.orders)).toFixed(1)} ر.ع</small>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black">طلبات ترويج المستخدمين</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">راجع طلبات أصحاب المشاريع وقم بقبولها أو تفعيلها أو رفضها.</p>
          </div>
          <button type="button" onClick={() => exportRowsCsv('promotion-requests.csv', promotionRequests as any)} className="rounded-full bg-slate-950 px-4 py-3 text-sm font-black text-white">تصدير CSV</button>
        </div>
        <div className="mt-5 admin-promotion-requests">
          {promotionRequests.length ? promotionRequests.map((request) => {
            const project = projectMap.get(String(request.project_id || ''));
            const status = String(request.status || 'pending').toLowerCase();
            return (
              <article key={request.id} className="admin-promotion-request">
                <header>
                  <div>
                    <h4>{project?.title || request.project_id || 'مشروع غير معروف'}</h4>
                    <p>{request.plan_name || request.plan_code || 'باقة ترويج'} · {request.placement || 'home_sponsored'} · {request.duration_days || 7} يوم · {Number(request.price || request.amount || 0).toLocaleString('en-US')} ر.ع</p>
                    {request.created_at ? <small>تاريخ الطلب: {new Date(request.created_at).toLocaleDateString('en-GB')}</small> : null}
                  </div>
                  <span className={`badge ${status}`}>{status === 'approved' || status === 'active' || status === 'running' ? 'قيد الترويج' : status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}</span>
                </header>
                <div className="promotion-results-row"><span>مشاهدات <b>{Number(request.promotion_views || request.views || request.impressions || 0).toLocaleString('en-US')}</b></span><span>نقرات <b>{Number(request.promotion_clicks || request.clicks || 0).toLocaleString('en-US')}</b></span><span>تواصل <b>{Number(request.promotion_contacts || request.contacts || 0).toLocaleString('en-US')}</b></span></div>
                {request.note ? <p>{request.note}</p> : null}
                {request.admin_note ? <p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">ملاحظة: {request.admin_note}</p> : null}
                <footer>
                  {['active', 'approved', 'running'].includes(status) ? <button className="activate" disabled>قيد الترويج</button> : <button className="approve" onClick={() => updatePromotionRequestStatus(request, 'approved')}>قبول</button>}
                  {!['active', 'approved', 'running'].includes(status) ? <button className="activate" onClick={() => updatePromotionRequestStatus(request, 'active')}>تفعيل الآن</button> : null}
                  {status !== 'rejected' ? <button className="reject" onClick={() => updatePromotionRequestStatus(request, 'rejected')}>رفض</button> : null}
                </footer>
              </article>
            );
          }) : <EmptyCard text="لا توجد طلبات ترويج من المستخدمين." />}
        </div>
      </div>
    </div>
  );
}

function AdsPanel({ ads, campaigns, promotionRequests, updatePromotionRequestStatus, projects, form, setForm, campaignForm, setCampaignForm, saveAd, deleteAd, saveCampaign, deleteCampaign, sponsorProject }: any) {
  const projectOptions = projects.map((project: AdminProject) => ({ id: project.id, title: project.title, countryCode: project.countryCode }));
  return (
    <div className="grid gap-5">
      <div className="rounded-[2rem] border border-amber-100 bg-gradient-to-l from-amber-50 to-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><h2 className="text-2xl font-black text-slate-950">الإعلانات والتمويل</h2><p className="mt-1 text-sm font-bold text-slate-600">تحكم بالبنرات والحملات والمشاريع الممولة من مكان واحد.</p></div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-black text-slate-600"><span className="rounded-2xl bg-white px-4 py-3 shadow-sm"><b className="block text-xl text-amber-700">{ads.length}</b> بنر</span><span className="rounded-2xl bg-white px-4 py-3 shadow-sm"><b className="block text-xl text-blue-700">{campaigns.filter((c: CampaignRow) => c.isActive).length}</b> حملة فعالة</span><span className="rounded-2xl bg-white px-4 py-3 shadow-sm"><b className="block text-xl text-slate-950">{projects.filter((p: any) => p.is_sponsored || p.isSponsored || p.sponsored).length}</b> ممول</span></div>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <form onSubmit={saveAd} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><h3 className="text-xl font-black">إضافة / تعديل بنر</h3><div className="mt-5 grid gap-3"><input value={form.title} onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="عنوان البنر" className="admin-input" /><select value={form.placement} onChange={(e) => setForm((f: any) => ({ ...f, placement: e.target.value }))} className="admin-input"><option value="home_top">الرئيسية - أعلى</option><option value="home_middle">الرئيسية - وسط</option><option value="opportunities_top">الفرص - أعلى</option><option value="project_details">تفاصيل المشروع</option><option value="dashboard">لوحة المستخدم</option></select><input value={form.imageUrl} onChange={(e) => setForm((f: any) => ({ ...f, imageUrl: e.target.value }))} placeholder="رابط صورة البنر" className="admin-input" /><input value={form.linkUrl} onChange={(e) => setForm((f: any) => ({ ...f, linkUrl: e.target.value }))} placeholder="رابط عند الضغط" className="admin-input" /><div className="grid gap-3 sm:grid-cols-2"><input value={form.countryCode} onChange={(e) => setForm((f: any) => ({ ...f, countryCode: normalizeCode(e.target.value) }))} placeholder="om" className="admin-input" /><input type="number" value={form.sortOrder} onChange={(e) => setForm((f: any) => ({ ...f, sortOrder: Number(e.target.value) }))} placeholder="الترتيب" className="admin-input" /></div><label className="flex items-center gap-2 text-sm font-black"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f: any) => ({ ...f, isActive: e.target.checked }))} /> فعال</label><button className="rounded-full bg-blue-600 px-5 py-3 font-black text-white">حفظ البنر</button></div></form>
        <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><h3 className="text-xl font-black">البنرات الحالية</h3><div className="mt-5 grid gap-3">{ads.length ? ads.map((ad: AdRow) => <div key={ad.id || ad.title} className="rounded-2xl bg-slate-50 p-4"><div className="flex gap-3"><div className="h-20 w-32 rounded-xl bg-slate-200 bg-cover bg-center" style={{ backgroundImage: `url(${ad.imageUrl})` }} /><div className="flex-1"><p className="font-black">{ad.title}</p><p className="text-xs font-bold text-slate-500">{ad.placement} · {ad.countryCode.toUpperCase()} · {ad.isActive ? 'فعال' : 'متوقف'}</p><div className="mt-3 flex gap-2"><button onClick={() => setForm(ad)} className="rounded-full bg-white px-3 py-2 text-xs font-black ring-1 ring-slate-200">تعديل</button><button onClick={() => deleteAd(ad)} className="rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">حذف</button></div></div></div></div>) : <EmptyCard text="لا توجد بنرات." />}</div></div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <form onSubmit={saveCampaign} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><h3 className="text-xl font-black">إنشاء حملة / تمويل مشروع</h3><div className="mt-5 grid gap-3"><input value={campaignForm.title} onChange={(e) => setCampaignForm((f: CampaignRow) => ({ ...f, title: e.target.value }))} placeholder="عنوان الحملة" className="admin-input" /><select value={campaignForm.entityId} onChange={(e) => { const project = projectOptions.find((p: any) => p.id === e.target.value); setCampaignForm((f: CampaignRow) => ({ ...f, entityId: e.target.value, title: f.title || `تمويل: ${project?.title || ''}`, countryCode: project?.countryCode || f.countryCode })); }} className="admin-input"><option value="">اختر المشروع</option>{projectOptions.map((project: any) => <option key={project.id} value={project.id}>{project.title}</option>)}</select><select value={campaignForm.placement} onChange={(e) => setCampaignForm((f: CampaignRow) => ({ ...f, placement: e.target.value }))} className="admin-input"><option value="home_sponsored">الرئيسية - فرص ممولة</option><option value="opportunities_sponsored">صفحة الفرص - ممول</option><option value="project_details_sponsored">تفاصيل المشروع</option><option value="dashboard_sponsored">داشبورد المستثمر</option></select><div className="grid gap-3 sm:grid-cols-2"><input type="number" value={campaignForm.budget} onChange={(e) => setCampaignForm((f: CampaignRow) => ({ ...f, budget: Number(e.target.value) }))} placeholder="الميزانية" className="admin-input" /><input value={campaignForm.countryCode} onChange={(e) => setCampaignForm((f: CampaignRow) => ({ ...f, countryCode: normalizeCode(e.target.value) }))} placeholder="om" className="admin-input" /></div><div className="grid gap-3 sm:grid-cols-2"><input type="date" value={campaignForm.startsAt ? campaignForm.startsAt.slice(0, 10) : ''} onChange={(e) => setCampaignForm((f: CampaignRow) => ({ ...f, startsAt: e.target.value ? new Date(e.target.value).toISOString() : '' }))} className="admin-input" /><input type="date" value={campaignForm.endsAt ? campaignForm.endsAt.slice(0, 10) : ''} onChange={(e) => setCampaignForm((f: CampaignRow) => ({ ...f, endsAt: e.target.value ? new Date(e.target.value).toISOString() : '' }))} className="admin-input" /></div><label className="flex items-center gap-2 text-sm font-black"><input type="checkbox" checked={campaignForm.isActive} onChange={(e) => setCampaignForm((f: CampaignRow) => ({ ...f, isActive: e.target.checked }))} /> حملة فعالة</label><button className="rounded-full bg-amber-500 px-5 py-3 font-black text-slate-950">حفظ الحملة وتفعيل التمويل</button></div></form>
        <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><h3 className="text-xl font-black">طلبات ترويج المستخدمين</h3><div className="mt-5 admin-promotion-requests">{promotionRequests?.length ? promotionRequests.map((request: PromotionRequestRow) => { const project = projects.find((p: AdminProject) => p.id === request.project_id); const status = String(request.status || 'pending').toLowerCase(); const running = ['active', 'approved', 'running'].includes(status); return <article key={request.id} className="admin-promotion-request"><header><div><h4>{project?.title || request.project_id || 'مشروع غير معروف'}</h4><p>{request.plan_name || request.plan_code || 'باقة ترويج'} · {request.placement || 'home_sponsored'} · {request.duration_days || 7} يوم · {Number(request.price || request.amount || 0).toLocaleString('en-US')} ر.ع</p></div><span className={`badge ${status}`}>{running ? 'قيد الترويج' : status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}</span></header><div className="promotion-results-row"><span>مشاهدات <b>{Number(request.promotion_views || request.views || request.impressions || 0).toLocaleString('en-US')}</b></span><span>نقرات <b>{Number(request.promotion_clicks || request.clicks || 0).toLocaleString('en-US')}</b></span><span>تواصل <b>{Number(request.promotion_contacts || request.contacts || 0).toLocaleString('en-US')}</b></span></div>{request.note ? <p>{request.note}</p> : null}<footer>{running ? <button className="activate" disabled>قيد الترويج</button> : <button className="approve" onClick={() => updatePromotionRequestStatus(request, 'approved')}>قبول</button>}{!running ? <button className="activate" onClick={() => updatePromotionRequestStatus(request, 'active')}>تفعيل الآن</button> : null}{status !== 'rejected' ? <button className="reject" onClick={() => updatePromotionRequestStatus(request, 'rejected')}>رفض</button> : null}</footer></article>; }) : <EmptyCard text="لا توجد طلبات ترويج من المستخدمين." />}</div></div>
        <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><h3 className="text-xl font-black">الحملات الإعلانية</h3><div className="mt-5 grid gap-3">{campaigns.length ? campaigns.map((campaign: CampaignRow) => { const project = projects.find((p: AdminProject) => p.id === campaign.entityId); const ctr = campaign.impressions ? ((campaign.clicks / campaign.impressions) * 100).toFixed(1) : '0'; return <div key={campaign.id || campaign.title} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{campaign.title}</p><p className="text-xs font-bold text-slate-500">{project?.title || campaign.entityId || '—'} · {campaign.placement} · {campaign.countryCode.toUpperCase()}</p><p className="mt-2 text-xs font-black text-slate-600">مشاهدات {campaign.impressions} · نقرات {campaign.clicks} · CTR {ctr}% · ميزانية {campaign.budget}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${campaign.isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>{campaign.isActive ? 'فعالة' : 'متوقفة'}</span></div><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => setCampaignForm(campaign)} className="rounded-full bg-white px-3 py-2 text-xs font-black ring-1 ring-slate-200">تعديل</button>{project ? <button onClick={() => sponsorProject(project)} className="rounded-full bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">تمديد التمويل</button> : null}<button onClick={() => deleteCampaign(campaign)} className="rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">حذف</button></div></div>; }) : <EmptyCard text="لا توجد حملات إعلانية بعد." />}</div></div>
      </div>
      <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><h3 className="text-xl font-black">اختيار سريع لمشاريع ممولة</h3><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{projects.slice(0, 12).map((project: AdminProject) => <div key={project.id} className="rounded-2xl bg-slate-50 p-4"><p className="font-black">{project.title}</p><p className="mt-1 text-xs font-bold text-slate-500">{project.city || '—'} · {project.category || '—'} · {project.status}</p><button onClick={() => sponsorProject(project)} className="mt-3 rounded-full bg-yellow-100 px-3 py-2 text-xs font-black text-yellow-800">تمييز كممول</button></div>)}</div></div>
    </div>
  );
}


function PaymentGatewaySettingsPanel({ settings, setSettings, payments = [], onSave, onReload, onTest, loading, saving, message }: any) {
  const setField = (key: keyof PaymentGatewaySettings, value: any) => setSettings((current: PaymentGatewaySettings) => ({ ...current, [key]: value }));
  const liveMode = settings.mode === 'live';
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-[1fr_.85fr]">
      <form onSubmit={onSave} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-black">إعدادات بوابة الدفع — Thawani</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">يمكنك التحكم بالمفاتيح، وضع الاختبار/الإنتاج، روابط API، وتشغيل أو إيقاف الدفع من لوحة الإدارة بدون تعديل ملفات السيرفر.</p>
          </div>
          <span className={`rounded-full px-4 py-2 text-xs font-black ${settings.is_enabled ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{settings.is_enabled ? 'مفعّلة' : 'متوقفة'}</span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-slate-700">حالة البوابة
            <select className="admin-input" value={settings.is_enabled ? 'enabled' : 'disabled'} onChange={(e) => setField('is_enabled', e.target.value === 'enabled')}>
              <option value="enabled">مفعّلة</option>
              <option value="disabled">متوقفة مؤقتًا</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">الوضع
            <select className="admin-input" value={settings.mode} onChange={(e) => {
              const mode = e.target.value as 'test' | 'live';
              setSettings((current: PaymentGatewaySettings) => ({
                ...current,
                mode,
                base_url: mode === 'live' ? 'https://checkout.thawani.om/api/v1' : 'https://uatcheckout.thawani.om/api/v1',
                checkout_url: mode === 'live' ? 'https://checkout.thawani.om' : 'https://uatcheckout.thawani.om',
              }));
            }}>
              <option value="test">Test / UAT</option>
              <option value="live">Live / Production</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700 md:col-span-2">Publishable Key
            <input className="admin-input" dir="ltr" value={settings.publishable_key || ''} onChange={(e) => setField('publishable_key', e.target.value)} placeholder="pk_test_..." />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700 md:col-span-2">Secret Key
            <input className="admin-input" dir="ltr" type="password" value={settings.secret_key || ''} onChange={(e) => setField('secret_key', e.target.value)} placeholder={settings.has_secret_key ? 'المفتاح محفوظ — اتركه فارغًا إذا لا تريد تغييره' : 'sk_test_...'} />
            <span className="text-xs font-bold text-slate-400">للحماية لا نعرض المفتاح القديم بعد الحفظ.</span>
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">API Base URL
            <input className="admin-input" dir="ltr" value={settings.base_url || ''} onChange={(e) => setField('base_url', e.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">Checkout URL
            <input className="admin-input" dir="ltr" value={settings.checkout_url || ''} onChange={(e) => setField('checkout_url', e.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700 md:col-span-2">Webhook URL
            <input className="admin-input" dir="ltr" value={settings.webhook_url || ''} onChange={(e) => setField('webhook_url', e.target.value)} placeholder="https://eloinvestor.com/api/payments/thawani/webhook" />
          </label>
        </div>

        {message ? <p className="mt-4 rounded-2xl bg-blue-50 p-3 text-sm font-black text-blue-700">{message}</p> : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <button disabled={saving || loading} className="rounded-full bg-blue-600 px-5 py-3 font-black text-white disabled:opacity-60">{saving ? 'جاري الحفظ...' : 'حفظ إعدادات الدفع'}</button>
          <button type="button" onClick={onReload} disabled={loading} className="rounded-full bg-slate-100 px-5 py-3 font-black text-slate-700 disabled:opacity-60">تحديث</button>
          <button type="button" onClick={onTest} disabled={loading || saving || !settings.has_secret_key && !settings.secret_key} className="rounded-full bg-amber-100 px-5 py-3 font-black text-amber-800 disabled:opacity-60">اختبار الاتصال</button>
        </div>
      </form>

      <aside className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-black">ملاحظات مهمة</h3>
        <div className="mt-4 grid gap-3 text-sm font-bold leading-7 text-slate-600">
          <p className="rounded-2xl bg-slate-50 p-4">وضع الاختبار يستخدم UAT، ووضع الإنتاج يستخدم روابط Thawani الحقيقية.</p>
          <p className="rounded-2xl bg-slate-50 p-4">بعد الحفظ أضف هذا الرابط في لوحة Thawani كـ Webhook: <br /><b dir="ltr" className="inline-block break-all text-slate-900">{settings.webhook_url || 'https://eloinvestor.com/api/payments/thawani/webhook'}</b></p>
          <p className="rounded-2xl bg-amber-50 p-4 text-amber-800">لا تحفظ مفاتيح الإنتاج قبل التأكد أن الدومين و SSL شغالين.</p>
          <p className="rounded-2xl bg-blue-50 p-4 text-blue-800">الحالة الحالية: {settings.is_enabled ? 'الدفع متاح للمستخدمين' : 'الدفع متوقف ولن يتم إنشاء جلسات دفع'} · الوضع: {liveMode ? 'إنتاج' : 'اختبار'}</p>
        </div>
      </aside>
      </div>

      <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black">عمليات الدفع</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">سجل مركزي لكل مدفوعات الباقات، الاشتراكات، الترويج، و Boost.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
            <span className="rounded-2xl bg-blue-50 px-4 py-3 text-blue-700">ناجحة {payments.filter((p: PaymentRow) => String(p.status || '').toLowerCase() === 'paid').length}</span>
            <span className="rounded-2xl bg-amber-50 px-4 py-3 text-amber-700">معلقة {payments.filter((p: PaymentRow) => String(p.status || '').toLowerCase() === 'pending').length}</span>
            <span className="rounded-2xl bg-slate-50 px-4 py-3 text-slate-700">الإيراد {payments.filter((p: PaymentRow) => String(p.status || '').toLowerCase() === 'paid').reduce((sum: number, p: PaymentRow) => sum + Number(p.amount || 0), 0).toLocaleString('en-US')} ر.ع</span>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-right text-sm">
            <thead className="text-xs font-black text-slate-400"><tr><th className="p-3">النوع</th><th className="p-3">المستخدم</th><th className="p-3">المرجع</th><th className="p-3">المبلغ</th><th className="p-3">الحالة</th><th className="p-3">Webhook</th><th className="p-3">التاريخ</th><th className="p-3">Session</th></tr></thead>
            <tbody>
              {payments.length ? payments.map((payment: PaymentRow) => {
                const status = String(payment.status || 'pending').toLowerCase();
                return <tr key={payment.id} className="border-t border-slate-100 font-bold text-slate-700"><td className="p-3">{payment.payment_type || payment.purpose || 'payment'}</td><td className="p-3" dir="ltr">{payment.user_auth_id || '—'}</td><td className="p-3">{payment.plan_code || payment.reference_id || payment.promotion_request_id || payment.project_id || '—'}</td><td className="p-3">{Number(payment.amount || 0).toLocaleString('en-US')} {payment.currency || 'OMR'}</td><td className="p-3"><span className={`rounded-full px-3 py-1 text-xs ${status === 'paid' ? 'bg-blue-50 text-blue-700' : status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{status}</span></td><td className="p-3">{payment.webhook_status || '—'}</td><td className="p-3">{payment.created_at ? new Date(payment.created_at).toLocaleString('en-GB') : '—'}</td><td className="max-w-[220px] truncate p-3" dir="ltr">{payment.provider_session_id || '—'}</td></tr>;
              }) : <tr><td colSpan={8} className="p-8 text-center font-black text-slate-400">لا توجد عمليات دفع بعد.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CountriesPanel({ countries, form, setForm, saveCountry }: any) { return <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]"><form onSubmit={saveCountry} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-2xl font-black">إضافة / تعديل دولة</h2><div className="mt-5 grid gap-3"><input value={form.code} onChange={(e) => setForm((f: any) => ({ ...f, code: normalizeCode(e.target.value), flag: makeFlag(e.target.value) }))} placeholder="كود الدولة" className="admin-input" /><input value={form.nameAr} onChange={(e) => setForm((f: any) => ({ ...f, nameAr: e.target.value }))} placeholder="الاسم العربي" className="admin-input" /><input value={form.currencyCode} onChange={(e) => setForm((f: any) => ({ ...f, currencyCode: e.target.value.toUpperCase() }))} placeholder="OMR" className="admin-input" /><label className="flex items-center gap-2 text-sm font-black"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f: any) => ({ ...f, isActive: e.target.checked }))} /> فعالة</label><button className="rounded-full bg-blue-600 px-5 py-3 font-black text-white">حفظ الدولة</button></div></form><div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-2xl font-black">الدول</h2><div className="mt-5 grid gap-3">{countries.map((country: CountryRow) => <div key={country.code} className="rounded-2xl bg-slate-50 p-4"><p className="font-black">{country.flag} {country.nameAr}</p><p className="text-xs font-bold text-slate-500">{country.code.toUpperCase()} · {country.currencyCode}</p><button onClick={() => setForm(country)} className="mt-3 rounded-full bg-white px-3 py-2 text-xs font-black ring-1 ring-slate-200">تعديل</button></div>)}</div></div></div>; }

function SlidesPanel({ slides, countries, form, setForm, saveSlide, deleteSlide, toggleSlide, sliderEnabled, toggleSliderSystem }: any) {
  return <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
    <form onSubmit={saveSlide} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-2xl font-black">السلايدر</h2><p className="mt-1 text-sm font-bold text-slate-500">السلايدات الفعالة تظهر تلقائيًا في الواجهة الأمامية. يمكنك إيقاف أو تشغيل أي سلايد.</p></div><button type="button" onClick={toggleSliderSystem} className={`rounded-full px-4 py-3 text-sm font-black ${sliderEnabled ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{sliderEnabled ? 'السلايدر شغال' : 'السلايدر متوقف'}</button></div>
      <div className="mt-5 grid gap-3">
        <select value={form.countryCode} onChange={(e) => setForm((f: any) => ({ ...f, countryCode: e.target.value }))} className="admin-input">
          {countries.map((c: CountryRow) => <option key={c.code} value={c.code}>{c.flag} {c.nameAr}</option>)}
        </select>
        <input value={form.titleAr} onChange={(e) => setForm((f: any) => ({ ...f, titleAr: e.target.value }))} placeholder="العنوان العربي" className="admin-input" />
        <input value={form.titleEn} onChange={(e) => setForm((f: any) => ({ ...f, titleEn: e.target.value }))} placeholder="English title" className="admin-input" />
        <textarea value={form.subtitleAr} onChange={(e) => setForm((f: any) => ({ ...f, subtitleAr: e.target.value }))} placeholder="الوصف العربي" className="admin-input min-h-24" />
        <input value={form.buttonTextAr} onChange={(e) => setForm((f: any) => ({ ...f, buttonTextAr: e.target.value }))} placeholder="نص الزر (اختياري)" className="admin-input" />
        <input value={form.buttonUrl} onChange={(e) => setForm((f: any) => ({ ...f, buttonUrl: e.target.value }))} placeholder="رابط الزر (اختياري)" className="admin-input" />
        <input value={form.imageUrl} onChange={(e) => setForm((f: any) => ({ ...f, imageUrl: e.target.value }))} placeholder="رابط الصورة" className="admin-input" />
        <input type="number" value={form.slideOrder} onChange={(e) => setForm((f: any) => ({ ...f, slideOrder: Number(e.target.value || 100) }))} placeholder="الترتيب" className="admin-input" />
        <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 font-black"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f: any) => ({ ...f, isActive: e.target.checked }))} /> تشغيل السلايد في الواجهة</label>
        <button className="rounded-full bg-blue-600 px-5 py-3 font-black text-white">حفظ السلايد</button>
      </div>
    </form>
    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-black">السلايدات الحالية</h2>
      <div className="mt-5 grid gap-3">
        {slides.length ? slides.map((slide: SlideRow) => <div key={slide.id || `${slide.countryCode}-${slide.slideOrder}`} className="rounded-2xl bg-slate-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="font-black">{slide.titleAr || slide.titleEn || 'سلايد'}</p>
              <p className="text-xs font-bold text-slate-500">{slide.countryCode.toUpperCase()} · ترتيب {slide.slideOrder} · {slide.isActive ? 'ظاهر' : 'متوقف'}</p>
              {slide.imageUrl ? <div className="mt-3 h-24 rounded-xl bg-slate-200 bg-cover bg-center" style={{ backgroundImage: `url(${slide.imageUrl})` }} /> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setForm(slide)} className="rounded-full bg-white px-3 py-2 text-xs font-black ring-1 ring-slate-200">تعديل</button>
              <button onClick={() => toggleSlide(slide)} className={`rounded-full px-3 py-2 text-xs font-black ${slide.isActive ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-700'}`}>{slide.isActive ? 'إيقاف' : 'تشغيل'}</button>
              <button onClick={() => deleteSlide(slide)} className="rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">حذف</button>
            </div>
          </div>
        </div>) : <EmptyCard text="لا توجد سلايدات." />}
      </div>
    </div>
  </div>;
}


function LanguagesTranslationsPanel({ languages, translations, languageForm, setLanguageForm, translationForm, setTranslationForm, translationQuery, setTranslationQuery, saveLanguage, saveTranslation, toggleLanguage, autoTranslateCurrent, seedDefaultTranslations, importTranslationsJson }: any) {
  function exportTranslationsJson() {
    const payload = translations.reduce((acc: Record<string, any>, item: TranslationRow) => {
      acc[item.namespace] ||= {};
      acc[item.namespace][item.translationKey] = { ar: item.ar, en: item.en, active: item.isActive };
      return acc;
    }, {});
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eloinvestor-translations.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <form onSubmit={saveLanguage} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">إدارة اللغات</h2>
          <p className="mt-2 text-sm font-bold text-slate-500">أضف لغة، فعّلها أو عطّلها، وحدد اتجاه الكتابة واللغة الافتراضية. متوافق مع جدولك القديم والجديد.</p>
          <div className="mt-5 grid gap-3">
            <input value={languageForm.code} onChange={(e) => setLanguageForm((f: any) => ({ ...f, code: e.target.value.toLowerCase() }))} placeholder="كود اللغة: ar / en" className="admin-input" />
            <input value={languageForm.nameAr} onChange={(e) => setLanguageForm((f: any) => ({ ...f, nameAr: e.target.value }))} placeholder="اسم اللغة عربي" className="admin-input" />
            <input value={languageForm.nameEn} onChange={(e) => setLanguageForm((f: any) => ({ ...f, nameEn: e.target.value }))} placeholder="Language name English" className="admin-input" />
            <select value={languageForm.direction} onChange={(e) => setLanguageForm((f: any) => ({ ...f, direction: e.target.value }))} className="admin-input">
              <option value="rtl">RTL — عربي</option>
              <option value="ltr">LTR — English</option>
            </select>
            <input type="number" value={languageForm.sortOrder} onChange={(e) => setLanguageForm((f: any) => ({ ...f, sortOrder: Number(e.target.value || 100) }))} placeholder="الترتيب" className="admin-input" />
            <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 font-black"><input type="checkbox" checked={languageForm.isActive} onChange={(e) => setLanguageForm((f: any) => ({ ...f, isActive: e.target.checked }))} /> فعالة</label>
            <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 font-black"><input type="checkbox" checked={languageForm.isDefault} onChange={(e) => setLanguageForm((f: any) => ({ ...f, isDefault: e.target.checked }))} /> اللغة الافتراضية</label>
            <button className="rounded-full bg-blue-600 px-5 py-3 font-black text-white">حفظ اللغة</button>
          </div>
        </form>
        <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">اللغات الحالية</h2>
          <div className="mt-5 grid gap-3">
            {languages.length ? languages.map((language: PlatformLanguageRow) => (
              <div key={language.code} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-black">{language.nameAr || language.code} <span className="text-xs text-slate-400">/ {language.nameEn}</span></p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{language.code} · {language.direction} · {language.isDefault ? 'افتراضية' : 'غير افتراضية'} · {language.isActive ? 'فعالة' : 'متوقفة'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setLanguageForm(language)} className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">تعديل</button>
                    <button type="button" onClick={() => toggleLanguage(language)} className={`rounded-full px-4 py-2 text-xs font-black ${language.isActive ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-700'}`}>{language.isActive ? 'إيقاف' : 'تشغيل'}</button>
                  </div>
                </div>
              </div>
            )) : <EmptyCard text="لا توجد لغات بعد." />}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <form onSubmit={saveTranslation} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">إضافة / تعديل ترجمة</h2>
          <p className="mt-2 text-sm font-bold text-slate-500">استخدم مفتاح ثابت مثل: home.hero.title حتى تقدر تعدّل النصوص بدون تغيير الكود.</p>
          <div className="mt-5 grid gap-3">
            <input value={translationForm.namespace} onChange={(e) => setTranslationForm((f: any) => ({ ...f, namespace: e.target.value }))} placeholder="القسم: home / admin / project" className="admin-input" />
            <input value={translationForm.translationKey} onChange={(e) => setTranslationForm((f: any) => ({ ...f, translationKey: e.target.value }))} placeholder="مفتاح الترجمة" className="admin-input" />
            <textarea value={translationForm.ar} onChange={(e) => setTranslationForm((f: any) => ({ ...f, ar: e.target.value }))} placeholder="النص العربي" className="admin-input min-h-24" />
            <textarea value={translationForm.en} onChange={(e) => setTranslationForm((f: any) => ({ ...f, en: e.target.value }))} placeholder="English text" className="admin-input min-h-24" />
            <textarea value={translationForm.notes || ''} onChange={(e) => setTranslationForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="ملاحظات داخلية" className="admin-input min-h-20" />
            <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 font-black"><input type="checkbox" checked={translationForm.isActive} onChange={(e) => setTranslationForm((f: any) => ({ ...f, isActive: e.target.checked }))} /> الترجمة فعالة</label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={autoTranslateCurrent} className="rounded-full bg-sky-50 px-5 py-3 font-black text-sky-700">ترجمة مبدئية</button>
              <button className="rounded-full bg-blue-600 px-5 py-3 font-black text-white">حفظ الترجمة</button>
            </div>
          </div>
        </form>
        <div className="admin-translations-card rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black">النصوص والترجمات</h2>
              <p className="mt-2 text-sm font-bold text-slate-500">بحث وتعديل سريع لكل نصوص الواجهة.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input value={translationQuery} onChange={(e) => setTranslationQuery(e.target.value)} placeholder="بحث..." className="admin-input md:w-72" />
              <button type="button" onClick={seedDefaultTranslations} className="rounded-full bg-blue-600 px-5 py-3 text-sm font-black text-white">مزامنة النصوص الافتراضية</button>
              <label className="cursor-pointer rounded-full bg-sky-50 px-5 py-3 text-sm font-black text-sky-700">استيراد JSON<input type="file" accept="application/json" className="hidden" onChange={(e) => importTranslationsJson(e.target.files?.[0] || null)} /></label>
              <button type="button" onClick={exportTranslationsJson} className="rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white">تصدير JSON</button>
            </div>
          </div>
          <div className="admin-translations-scroll mt-5 grid gap-3">
            {translations.length ? translations.map((item: TranslationRow) => (
              <div key={`${item.namespace}.${item.translationKey}`} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="font-black text-slate-900">{item.namespace}.{item.translationKey}</p>
                    <p className="mt-2 text-sm font-bold text-slate-700">AR: {item.ar || '—'}</p>
                    <p className="mt-1 text-sm font-bold text-slate-500">EN: {item.en || '—'}</p>
                  </div>
                  <button type="button" onClick={() => setTranslationForm(item)} className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">تعديل</button>
                </div>
              </div>
            )) : <EmptyCard text="لا توجد ترجمات بعد." />}
          </div>
        </div>
      </section>
    </div>
  );
}
