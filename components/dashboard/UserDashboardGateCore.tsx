'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileCheck2,
  Gauge,
  HeartHandshake,
  Home,
  LayoutDashboard,
  LayoutGrid,
  LockKeyhole,
  MessageCircle,
  Megaphone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCircle,
  Camera,
  Wallet,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { getCurrentAppUser, signOutEverywhere, firebaseCompatibleUserQuery } from '@/lib/auth-client';
import { AddProjectForm } from '@/components/AddProjectForm';
import { SavedSearchesPanel } from '@/components/SavedSearchesPanel';
import { accountTypeLabel, canAddProjects, canInvest, isAdminRole } from '@/lib/account';
import { getCategoryLabel } from '@/lib/data';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1200&auto=format&fit=crop';

type Tab =
  | 'overview'
  | 'my-projects'
  | 'add-project'
  | 'requests'
  | 'investor-center'
  | 'saved'
  | 'suggested'
  | 'interests'
  | 'messages'
  | 'promotion'
  | 'verification'
  | 'packages'
  | 'notifications'
  | 'activity'
  | 'profile'
  | 'admin-panel';

type Profile = {
  id: string;
  name: string;
  email: string;
  accountType: string;
  role: string;
  plan: string;
  verificationStatus: string;
  remainingProjects: number;
  phone?: string;
  whatsapp?: string;
  budgetMin?: number;
  budgetMax?: number;
  preferredLocation?: string;
  preferredCategories?: string[];
  investorPreferences?: Record<string, any>;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  autoWelcomeMessage?: string;
};

type DashboardProject = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  city: string;
  governorate: string;
  price: number;
  roi: number;
  coverImage: string;
  status: string;
  verified: boolean;
  views: number;
  contacts: number;
  createdAt: string;
};

type MiniProject = { id: string; projectId: string; conversationId?: string; title: string; slug: string; image: string; price: number; roi: number; city: string; createdAt: string };
type ChatMessage = { id: string; conversationId: string; senderId: string; body: string; createdAt: string; readAt?: string };
type ConversationRow = { id: string; project_id?: string; buyer_id?: string; investor_id?: string; owner_id?: string; last_message?: string; last_message_at?: string; projects?: Record<string, any> };
type ActivityItem = { id: string; title: string; subtitle: string; date: string; tone?: 'blue' | 'amber' | 'rose' | 'slate' };
type PromotionStats = { total: number; pending: number; approved: number; active: number; rejected: number; budget: number; views: number; clicks: number; contacts: number };
type OwnerPromotionRequest = { id: string; project_id?: string | null; plan_code?: string | null; plan_name?: string | null; placement?: string | null; duration_days?: number | null; price?: number | null; amount?: number | null; status?: string | null; starts_at?: string | null; ends_at?: string | null; created_at?: string | null; admin_note?: string | null; note?: string | null; projectTitle?: string; promotion_views?: number | null; promotion_clicks?: number | null; promotion_contacts?: number | null; views?: number | null; clicks?: number | null; contacts?: number | null; impressions?: number | null };
const EMPTY_PROMOTION_STATS: PromotionStats = { total: 0, pending: 0, approved: 0, active: 0, rejected: 0, budget: 0, views: 0, clicks: 0, contacts: 0 };
type MenuItem = { id: Tab; label: string; icon: any; href?: string; ownerOnly?: boolean; investorOnly?: boolean };

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

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || `project-${Date.now()}`;
}

function normalizeStatus(status: string) {
  return String(status || 'pending').toLowerCase();
}

function statusLabel(status: string) {
  const s = normalizeStatus(status);
  if (['approved', 'active', 'published'].includes(s)) return 'منشور';
  if (['rejected', 'declined'].includes(s)) return 'مرفوض';
  if (['revision', 'needs_revision', 'needs-revision'].includes(s)) return 'تعديل مطلوب';
  return 'قيد المراجعة';
}

function statusClass(status: string) {
  const s = normalizeStatus(status);
  if (['approved', 'active', 'published'].includes(s)) return 'bg-blue-50 text-blue-700 ring-blue-100';
  if (['rejected', 'declined'].includes(s)) return 'bg-rose-50 text-rose-700 ring-rose-100';
  if (['revision', 'needs_revision', 'needs-revision'].includes(s)) return 'bg-orange-50 text-orange-700 ring-orange-100';
  return 'bg-amber-50 text-amber-700 ring-amber-100';
}

function formatMoney(amount: number, lang: string) {
  return `${new Intl.NumberFormat(lang === 'ar' ? 'ar-OM' : 'en-US').format(amount || 0)} ${lang === 'ar' ? 'ر.ع' : 'OMR'}`;
}

function formatDate(value: string, lang: string) {
  if (!value) return lang === 'ar' ? 'حديثًا' : 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return lang === 'ar' ? 'حديثًا' : 'Recently';
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-OM' : 'en-US', { dateStyle: 'short' }).format(date);
}

function mapProject(row: Record<string, any>): DashboardProject {
  const title = pickString(row, ['title_ar', 'title', 'project_title', 'name_ar'], 'مشروع بدون عنوان');
  return {
    id: pickString(row, ['id']),
    slug: pickString(row, ['slug']) || pickString(row, ['id']) || slugify(title),
    title,
    description: pickString(row, ['description_ar', 'description', 'summary_ar', 'details'], ''),
    category: pickString(row, ['category', 'sector', 'scope'], 'services'),
    city: pickString(row, ['city', 'location'], ''),
    governorate: pickString(row, ['governorate', 'region', 'wilaya'], ''),
    price: pickNumber(row, ['price', 'project_price', 'asking_price', 'sale_price'], 0),
    roi: pickNumber(row, ['roi', 'profit_percentage', 'return_percentage'], 0),
    coverImage: pickString(row, ['cover_image_url', 'cover_image', 'image_url', 'main_image', 'thumbnail', 'image'], DEFAULT_IMAGE),
    status: pickString(row, ['status'], 'pending'),
    verified: row?.is_verified === true || row?.verified === true || row?.verification_status === 'approved',
    views: pickNumber(row, ['views_count', 'views'], 0),
    contacts: pickNumber(row, ['contacts_count', 'contact_count'], 0),
    createdAt: pickString(row, ['created_at'], ''),
  };
}

function mapMini(row: Record<string, any>, prefix: string): MiniProject {
  const snapshot = typeof row?.project_snapshot === 'object' && row.project_snapshot ? row.project_snapshot : {};
  const project = typeof row?.projects === 'object' && row.projects ? row.projects : {};
  const source = { ...snapshot, ...project, ...row };
  const projectId = pickString(source, ['project_id', 'id'], '');
  const title = pickString(source, ['title_ar', 'title', 'project_title', 'name_ar'], 'فرصة استثمارية');
  return {
    id: `${prefix}-${pickString(row, ['id'], projectId || title)}`,
    projectId,
    conversationId: pickString(source, ['conversation_id'], '') || (prefix === 'conversation' ? pickString(row, ['id'], '') : ''),
    title,
    slug: pickString(source, ['slug'], projectId),
    image: pickString(source, ['cover_image_url', 'cover_image', 'image_url', 'thumbnail', 'image'], DEFAULT_IMAGE),
    price: pickNumber(source, ['price', 'project_price', 'asking_price', 'sale_price'], 0),
    roi: pickNumber(source, ['roi', 'profit_percentage', 'return_percentage'], 0),
    city: pickString(source, ['city', 'governorate', 'location', 'region'], ''),
    createdAt: pickString(row, ['created_at', 'last_message_at'], ''),
  };
}

async function getProfile(): Promise<Profile | null> {
  const authUser = await getCurrentAppUser();
  if (!authUser) return null;
  let profile: any = null;
  try {
    const res = await supabaseBrowser.from('users').select('*').or(firebaseCompatibleUserQuery(authUser)).maybeSingle();
    profile = res.data;
  } catch (error) {
    console.warn('Profile lookup failed:', error);
  }
  return {
    id: authUser.id,
    name: profile?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
    email: profile?.email || authUser.email || '',
    accountType: profile?.account_type || authUser.user_metadata?.account_type || 'investor',
    role: profile?.role || authUser.user_metadata?.role || 'user',
    plan: profile?.subscription_status || profile?.plan || 'starter',
    verificationStatus: profile?.verification_status || profile?.investor_verification_status || 'unverified',
    remainingProjects: Number(profile?.remaining_projects ?? profile?.projects_remaining ?? 1),
    phone: profile?.phone || authUser.user_metadata?.phone || '',
    whatsapp: profile?.whatsapp || authUser.user_metadata?.whatsapp || '',
    budgetMin: Number(profile?.budget_min || 0),
    budgetMax: Number(profile?.budget_max || 0),
    preferredLocation: profile?.preferred_location || '',
    preferredCategories: Array.isArray(profile?.preferred_categories) ? profile.preferred_categories : [],
    avatarUrl: profile?.avatar_url || profile?.photo_url || '',
    bio: profile?.bio || profile?.about || '',
    location: profile?.location || profile?.city || '',
    autoWelcomeMessage: profile?.auto_welcome_message || profile?.welcome_message || '',
    investorPreferences: typeof profile?.investor_preferences === 'object' && profile.investor_preferences ? profile.investor_preferences : {},
  };
}

async function loadUserProjects(userId: string) {
  const ownerColumns = ['owner_auth_id', 'user_auth_id', 'auth_id', 'user_id', 'created_by'];

  try {
    const { data, error } = await supabaseBrowser
      .from('projects')
      .select('*')
      .or(ownerColumns.map((column) => `${column}.eq.${userId}`).join(','))
      .order('created_at', { ascending: false })
      .limit(80);
    if (!error) {
      const seen = new Set<string>();
      return (data || [])
        .filter((row: any) => {
          const id = String(row.id || '');
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        })
        .map(mapProject);
    }
    console.warn('Combined projects lookup failed, falling back:', error.message);
  } catch (error) {
    console.warn('Combined projects lookup skipped:', error);
  }

  const rows = new Map<string, any>();
  for (const column of ownerColumns) {
    try {
      const { data, error } = await supabaseBrowser.from('projects').select('*').eq(column, userId).order('created_at', { ascending: false }).limit(80);
      if (error) throw error;
      for (const row of data || []) rows.set(String((row as any).id), row);
    } catch (error) {
      console.warn(`Projects lookup by ${column} skipped:`, error);
    }
  }
  return Array.from(rows.values()).map(mapProject);
}

async function loadSaved(userId: string) {
  const selects = [
    'id,project_id,project_snapshot,created_at,projects(*)',
    'id,project_id,project_snapshot,created_at',
  ];
  for (const select of selects) {
    try {
      const { data, error } = await supabaseBrowser
        .from('investor_saved_projects')
        .select(select)
        .eq('investor_auth_id', userId)
        .order('created_at', { ascending: false })
        .limit(40);
      if (!error) return (data || []).map((row: any) => mapMini(row, 'saved'));
      console.warn('Saved projects lookup failed:', error.message);
    } catch (error) {
      console.warn('Saved projects lookup unavailable:', error);
    }
  }
  return [];
}

async function loadContacted(userId: string) {
  const conversationSelects = [
    'id,project_id,buyer_id,investor_id,owner_id,last_message,last_message_at,projects(*)',
    'id,project_id,buyer_id,investor_id,owner_id,last_message,last_message_at',
    'id,project_id,buyer_id,owner_id,last_message_at',
  ];
  for (const select of conversationSelects) {
    try {
      const { data, error } = await supabaseBrowser
        .from('conversations')
        .select(select)
        .or(`buyer_id.eq.${userId},investor_id.eq.${userId},owner_id.eq.${userId}`)
        .order('last_message_at', { ascending: false })
        .limit(40);
      if (!error) return ((data || []) as any[]).map((row: ConversationRow) => mapMini({ ...row, conversation_id: row.id }, 'conversation'));
      console.warn('Conversations lookup failed, falling back:', error.message);
    } catch (error) {
      console.warn('Conversations unavailable:', error);
    }
  }

  const contactedSelects = [
    'id,project_id,conversation_id,project_snapshot,created_at,projects(*)',
    'id,project_id,conversation_id,project_snapshot,created_at',
  ];
  for (const select of contactedSelects) {
    try {
      const { data, error } = await supabaseBrowser
        .from('investor_contacted_projects')
        .select(select)
        .eq('investor_auth_id', userId)
        .order('created_at', { ascending: false })
        .limit(40);
      if (!error) return (data || []).map((row: any) => mapMini(row, 'contacted'));
      console.warn('Contacted projects lookup failed:', error.message);
    } catch (error) {
      console.warn('Contacted projects unavailable:', error);
    }
  }
  return [];
}


async function loadPromotionStatsForProjects(projects: DashboardProject[]) {
  const ids = projects.map((project) => project.id).filter(Boolean);
  if (!ids.length) return EMPTY_PROMOTION_STATS;
  try {
    const { data, error } = await supabaseBrowser
      .from('promotion_requests')
      .select('*')
      .in('project_id', ids)
      .limit(500);
    if (error) throw error;
    const rows = data || [];
    return rows.reduce((acc: PromotionStats, row: any) => {
      const status = String(row.status || 'pending').toLowerCase();
      acc.total += 1;
      acc.budget += Number(row.price || row.amount || row.budget || 0);
      acc.views += Number(row.promotion_views || row.views || row.impressions || 0);
      acc.clicks += Number(row.promotion_clicks || row.clicks || 0);
      acc.contacts += Number(row.promotion_contacts || row.contacts || 0);
      if (['approved', 'paid'].includes(status)) acc.approved += 1;
      else if (['active', 'published', 'running'].includes(status)) acc.active += 1;
      else if (['rejected', 'declined'].includes(status)) acc.rejected += 1;
      else acc.pending += 1;
      return acc;
    }, { ...EMPTY_PROMOTION_STATS });
  } catch (error) {
    console.warn('Promotion stats unavailable:', error);
    return EMPTY_PROMOTION_STATS;
  }
}


async function loadPromotionRequestsForProjects(projects: DashboardProject[]): Promise<OwnerPromotionRequest[]> {
  const ids = projects.map((project) => project.id).filter(Boolean);
  if (!ids.length) return [];
  try {
    const { data, error } = await supabaseBrowser
      .from('promotion_requests')
      .select('*')
      .in('project_id', ids)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    const byId = new Map(projects.map((project) => [project.id, project.title]));
    return (data || []).map((row: any) => ({ ...row, projectTitle: byId.get(String(row.project_id)) || 'مشروع' }));
  } catch (error) {
    console.warn('Promotion requests unavailable:', error);
    return [];
  }
}

function promotionStatusLabel(status?: string | null) {
  const value = String(status || 'pending').toLowerCase();
  if (['active', 'running', 'published'].includes(value)) return 'قيد الترويج';
  if (['approved', 'paid'].includes(value)) return 'مقبول';
  if (['rejected', 'declined'].includes(value)) return 'مرفوض';
  if (['expired', 'ended'].includes(value)) return 'منتهي';
  return 'قيد المراجعة';
}

function promotionStatusClass(status?: string | null) {
  const value = String(status || 'pending').toLowerCase();
  if (['active', 'running', 'published'].includes(value)) return 'bg-blue-50 text-blue-700 ring-blue-100';
  if (['approved', 'paid'].includes(value)) return 'bg-sky-50 text-sky-700 ring-sky-100';
  if (['rejected', 'declined'].includes(value)) return 'bg-rose-50 text-rose-700 ring-rose-100';
  if (['expired', 'ended'].includes(value)) return 'bg-slate-100 text-slate-600 ring-slate-200';
  return 'bg-amber-50 text-amber-700 ring-amber-100';
}

function normalizePlan(plan?: string) {
  return String(plan || 'free').toLowerCase().replace(/\s+/g, '_');
}

function isPaidPlan(plan?: string) {
  const p = normalizePlan(plan);
  return ['growth', 'pro', 'business', 'premium', 'elite', 'investor_pro', 'investor_elite', 'owner_pro', 'owner_business'].includes(p);
}

function investorSuggestionLimit(plan?: string) {
  const p = normalizePlan(plan);
  if (['elite', 'investor_elite', 'premium'].includes(p)) return 999;
  if (['pro', 'investor_pro', 'business'].includes(p)) return 25;
  if (['growth'].includes(p)) return 10;
  return 3;
}

function scoreSuggestedProject(project: DashboardProject, profile: Profile) {
  let score = 0;
  const categories = (profile.preferredCategories || []).map((c) => String(c).toLowerCase());
  const location = String(profile.preferredLocation || '').trim().toLowerCase();
  const opportunityType = String(profile.investorPreferences?.opportunity_type || 'all').toLowerCase();
  if (project.verified) score += 35;
  if (categories.length && categories.includes(String(project.category || '').toLowerCase())) score += 35;
  if (location && `${project.city} ${project.governorate}`.toLowerCase().includes(location)) score += 20;
  if (profile.budgetMin && project.price >= profile.budgetMin) score += 8;
  if (profile.budgetMax && project.price && project.price <= profile.budgetMax) score += 14;
  if (opportunityType && opportunityType !== 'all' && String((project as any).opportunityType || '').toLowerCase() === opportunityType) score += 10;
  score += Math.min(15, Math.floor((project.views || 0) / 20));
  score += Math.min(12, Math.floor((project.contacts || 0) / 3));
  score += Math.min(12, Math.floor(project.roi || 0));
  return score;
}

async function loadSuggestedProjects(profile: Profile) {
  try {
    const { data, error } = await supabaseBrowser
      .from('projects')
      .select('*')
      .in('status', ['approved', 'active', 'published'])
      .order('created_at', { ascending: false })
      .limit(120);
    if (error) throw error;
    const seen = new Set<string>();
    return (data || [])
      .map(mapProject)
      .filter((project) => {
        if (!project.id || seen.has(project.id)) return false;
        seen.add(project.id);
        return true;
      })
      .map((project) => ({ project, score: scoreSuggestedProject(project, profile) }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.project)
      .slice(0, 60);
  } catch (error) {
    console.warn('Suggested projects unavailable:', error);
    return [];
  }
}

async function loadActivity(userId: string) {
  const items: ActivityItem[] = [];
  try {
    const { data } = await supabaseBrowser.from('verification_requests').select('*').eq('user_auth_id', userId).order('created_at', { ascending: false }).limit(8);
    for (const row of data || []) items.push({ id: String(row.id), title: row.request_type === 'investor' ? 'طلب توثيق مستثمر' : 'طلب توثيق مشروع', subtitle: String(row.status || 'pending'), date: String(row.created_at || ''), tone: row.status === 'approved' ? 'blue' : row.status === 'rejected' ? 'rose' : 'amber' });
  } catch (error) {
    console.warn('Verification activity unavailable:', error);
  }
  try {
    const { data } = await supabaseBrowser.from('notifications').select('*').eq('user_auth_id', userId).order('created_at', { ascending: false }).limit(8);
    for (const row of data || []) items.push({ id: `n-${row.id}`, title: pickString(row, ['title', 'type'], 'إشعار'), subtitle: pickString(row, ['body', 'message', 'description'], ''), date: pickString(row, ['created_at'], ''), tone: 'slate' });
  } catch (error) {
    console.warn('Notifications unavailable:', error);
  }
  return items.sort((a, b) => +new Date(b.date || 0) - +new Date(a.date || 0));
}

async function insertRowWithFallback(table: string, payload: Record<string, any>) {
  const current = { ...payload };
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await supabaseBrowser.from(table).insert(current).select('*').maybeSingle();
    if (!error) return data;
    const message = [error.message, (error as any).details, (error as any).hint].filter(Boolean).join(' ');
    const missing = message.match(/column ['"]?([^'"\s]+)['"]? of relation/i)?.[1] || message.match(/Could not find the ['"]([^'"]+)['"] column/i)?.[1];
    if (missing && Object.prototype.hasOwnProperty.call(current, missing)) {
      delete current[missing];
      continue;
    }
    throw error;
  }
  throw new Error('تعذر حفظ الطلب بسبب توافق أعمدة قاعدة البيانات.');
}

async function updateUserWithFallback(userId: string, payload: Record<string, any>) {
  const current = { ...payload };
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { error } = await supabaseBrowser.from('users').update(current).eq('auth_id', userId);
    if (!error) return;
    const message = [error.message, (error as any).details, (error as any).hint].filter(Boolean).join(' ');
    const missing = message.match(/column ['"]?([^'"\s]+)['"]? of relation/i)?.[1] || message.match(/Could not find the ['"]([^'"]+)['"] column/i)?.[1];
    if (missing && Object.prototype.hasOwnProperty.call(current, missing)) {
      delete current[missing];
      continue;
    }
    throw error;
  }
}

function menuFor(owner: boolean, investor: boolean, admin: boolean, lang: string): MenuItem[] {
  const isAr = lang !== 'en';
  const label = (ar: string, en: string) => (isAr ? ar : en);
  const items: MenuItem[] = [{ id: 'overview', label: label('نظرة عامة', 'Overview'), icon: Home }];
  if (owner) items.push(
    { id: 'my-projects', label: label('مشاريعي', 'My projects'), icon: LayoutGrid, ownerOnly: true },
    { id: 'add-project', label: label('إضافة مشروع', 'Add project'), icon: Plus, ownerOnly: true },
    { id: 'requests', label: label('طلبات المستثمرين', 'Investor requests'), icon: HeartHandshake, ownerOnly: true },
    { id: 'promotion', label: label('الترويج', 'Promotion'), icon: Megaphone, ownerOnly: true },
  );
  if (investor) items.push(
    { id: 'investor-center', label: label('مركز المستثمر', 'Investor center'), icon: Gauge, investorOnly: true },
    { id: 'saved', label: label('المحفوظات', 'Saved'), icon: Bookmark, investorOnly: true },
    { id: 'suggested', label: label('الفرص المقترحة', 'Suggested'), icon: Sparkles, investorOnly: true },
    { id: 'interests', label: label('اهتماماتي', 'Interests'), icon: Settings, investorOnly: true },
  );
  if (owner || investor) items.push({ id: 'packages', label: label('الباقات', 'Packages'), icon: CreditCard });
  items.push(
    { id: 'messages', label: label('الشات الداخلي', 'Messages'), icon: MessageCircle },
    { id: 'verification', label: label('التوثيق', 'Verification'), icon: ShieldCheck },
    { id: 'notifications', label: label('الإشعارات', 'Notifications'), icon: Bell },
    { id: 'activity', label: label('النشاط', 'Activity'), icon: Activity },
    { id: 'profile', label: label('الملف الشخصي', 'Profile'), icon: UserCircle },
  );
  if (admin) items.push({ id: 'admin-panel', label: label('لوحة الإدارة', 'Admin panel'), icon: LockKeyhole, href: '/eloinvestor-admin' });
  return items;
}

export function UserDashboardGate({ country, lang }: { country: string; lang: string }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [saved, setSaved] = useState<MiniProject[]>([]);
  const [contacted, setContacted] = useState<MiniProject[]>([]);
  const [suggested, setSuggested] = useState<DashboardProject[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [promotionStats, setPromotionStats] = useState<PromotionStats>(EMPTY_PROMOTION_STATS);
  const [promotionRequests, setPromotionRequests] = useState<OwnerPromotionRequest[]>([]);
  const [active, setActive] = useState<Tab>('overview');
  const [query, setQuery] = useState('');
  const [editingProjectId, setEditingProjectId] = useState('');

  useEffect(() => {
    document.body.classList.add('dashboard-app');
    return () => document.body.classList.remove('dashboard-app');
  }, []);

  useEffect(() => {
    let mounted = true;
    async function init() {
      setLoading(true);
      const userProfile = await getProfile();
      if (!mounted) return;
      setProfile(userProfile);
      if (!userProfile) {
        setLoading(false);
        return;
      }
      const [userProjects, savedRows, contactedRows, activityRows, suggestedRows] = await Promise.all([
        loadUserProjects(userProfile.id),
        loadSaved(userProfile.id),
        loadContacted(userProfile.id),
        loadActivity(userProfile.id),
        loadSuggestedProjects(userProfile),
      ]);
      if (!mounted) return;
      setProjects(userProjects);
      setPromotionStats(await loadPromotionStatsForProjects(userProjects));
      setPromotionRequests(await loadPromotionRequestsForProjects(userProjects));
      setSaved(savedRows);
      setContacted(contactedRows);
      setActivity(activityRows);
      setSuggested(suggestedRows);
      setLoading(false);
    }
    init();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!profile?.id) return undefined;
    const refreshInvestorLists = async () => {
      const [savedRows, contactedRows, activityRows] = await Promise.all([
        loadSaved(profile.id),
        loadContacted(profile.id),
        loadActivity(profile.id),
      ]);
      setSaved(savedRows);
      setContacted(contactedRows);
      setActivity(activityRows);
    };
    const savedChannel = supabaseBrowser
      .channel(`dashboard-saved-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investor_saved_projects', filter: `investor_auth_id=eq.${profile.id}` }, () => { void refreshInvestorLists(); })
      .subscribe();
    const contactedChannel = supabaseBrowser
      .channel(`dashboard-contacted-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investor_contacted_projects', filter: `investor_auth_id=eq.${profile.id}` }, () => { void refreshInvestorLists(); })
      .subscribe();
    const notificationChannel = supabaseBrowser
      .channel(`dashboard-notifications-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_auth_id=eq.${profile.id}` }, () => { void refreshInvestorLists(); })
      .subscribe();
    return () => {
      void supabaseBrowser.removeChannel(savedChannel);
      void supabaseBrowser.removeChannel(contactedChannel);
      void supabaseBrowser.removeChannel(notificationChannel);
    };
  }, [profile?.id]);

  const admin = isAdminRole(profile?.role) || isAdminRole(profile?.accountType);
  const owner = canAddProjects(profile?.accountType, profile?.role);
  const investor = canInvest(profile?.accountType, profile?.role);
  const isRtl = lang !== 'en';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menu = useMemo(() => menuFor(owner, investor, admin, lang), [owner, investor, admin, lang]);

  function openTab(tab: Tab) {
    if (tab !== 'add-project') setEditingProjectId('');
    setActive(tab);
    setMobileMenuOpen(false);
  }

  function editProject(projectId: string) {
    setEditingProjectId(projectId);
    setActive('add-project');
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  async function refreshDashboard() {
    if (!profile) return;
    const [userProjects, savedRows, contactedRows, activityRows, suggestedRows] = await Promise.all([
      loadUserProjects(profile.id),
      loadSaved(profile.id),
      loadContacted(profile.id),
      loadActivity(profile.id),
      loadSuggestedProjects(profile),
    ]);
    setProjects(userProjects);
    setPromotionStats(await loadPromotionStatsForProjects(userProjects));
    setPromotionRequests(await loadPromotionRequestsForProjects(userProjects));
    setSaved(savedRows);
    setContacted(contactedRows);
    setActivity(activityRows);
    setSuggested(suggestedRows);
    setEditingProjectId('');
    setActive('my-projects');
  }

  useEffect(() => {
    if (!menu.some((item) => !item.href && item.id === active)) setActive('overview');
  }, [menu, active]);

  const stats = useMemo(() => {
    const published = projects.filter((p) => ['approved', 'active', 'published'].includes(normalizeStatus(p.status))).length;
    const pending = projects.filter((p) => !['approved', 'active', 'published', 'rejected'].includes(normalizeStatus(p.status))).length;
    const views = projects.reduce((sum, p) => sum + p.views, 0);
    const contacts = projects.reduce((sum, p) => sum + p.contacts, 0);
    return { projects: projects.length, published, pending, views, contacts, saved: saved.length, contacted: contacted.length };
  }, [projects, saved.length, contacted.length]);

  const filteredProjects = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter((p) => `${p.title} ${p.city} ${p.governorate} ${p.category}`.toLowerCase().includes(term));
  }, [projects, query]);

  if (loading) return <DashboardSkeleton />;

  if (!profile) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5faf7] p-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <section className="max-w-md rounded-[2rem] border border-slate-100 bg-white p-8 text-center shadow-sm">
          <LockKeyhole className="mx-auto h-10 w-10 text-blue-700" />
          <h1 className="mt-4 text-2xl font-black text-slate-950">تحتاج تسجيل الدخول</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">لوحة المستخدم متاحة للحسابات المسجلة فقط.</p>
          <Link href={`/${country}/${lang}/login`} className="mt-6 inline-flex rounded-2xl bg-blue-700 px-7 py-3 font-black text-white">تسجيل الدخول</Link>
        </section>
      </main>
    );
  }

  return (
    <div className={`clean-dashboard ${isRtl ? 'is-rtl' : 'is-ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <DashboardSidebar profile={profile} menu={menu} active={active} setActive={openTab} country={country} lang={lang} />
      <main className="clean-main">
        <MobileDashboardBar profile={profile} active={active} menu={menu} setOpen={setMobileMenuOpen} country={country} lang={lang} />
        <MobileDashboardDrawer open={mobileMenuOpen} setOpen={setMobileMenuOpen} profile={profile} menu={menu} active={active} setActive={openTab} country={country} lang={lang} />
        <DashboardHeader profile={profile} owner={owner} investor={investor} country={country} lang={lang} setActive={openTab} />
        <section className="clean-stats-grid">
          {owner && <Metric title="مشاريعي" value={stats.projects} caption={`${stats.published} منشور`} icon={BriefcaseBusiness} />}
          {owner && <Metric title="طلبات التواصل" value={stats.contacts} caption="من المستثمرين" icon={MessageCircle} />}
          {investor && <Metric title="المحفوظات" value={stats.saved} caption="فرص محفوظة" icon={Bookmark} />}
          {investor && <Metric title="تواصلت معها" value={stats.contacted} caption="طلبات تواصل" icon={HeartHandshake} />}
          {investor && <Metric title="اقتراحات متاحة" value={investorSuggestionLimit(profile.plan)} caption="حسب باقة المستثمر" icon={Sparkles} />}
          <Metric title="الباقة الحالية" value={profile.plan || 'starter'} caption={`${profile.remainingProjects} رصيد نشر`} icon={Wallet} textValue />
          <Metric title="حالة التوثيق" value={profile.verificationStatus === 'approved' ? 'موثق' : 'غير موثق'} caption="تؤثر على الثقة" icon={FileCheck2} textValue />
        </section>
        <section className="clean-content">
          {active === 'overview' && <OverviewPanel owner={owner} investor={investor} stats={stats} promotionStats={promotionStats} projects={projects} saved={saved} contacted={contacted} activity={activity} country={country} lang={lang} setActive={openTab} onEdit={editProject} />}
          {active === 'my-projects' && owner && <ProjectsPanel projects={filteredProjects} query={query} setQuery={setQuery} country={country} lang={lang} onEdit={editProject} />}
          {active === 'add-project' && owner && <AddProjectForm country={country} lang={lang} editProjectId={editingProjectId} onSaved={refreshDashboard} />}
          {active === 'requests' && owner && <ActivityPanel title="طلبات المستثمرين" items={activity.filter((i) => i.title.includes('تواصل') || i.subtitle.includes('contact'))} empty="لا توجد طلبات مستثمرين بعد." />}
          {active === 'promotion' && owner && <OwnerPromotionPanel requests={promotionRequests} stats={promotionStats} projects={projects} country={country} lang={lang} />}
          {active === 'packages' && (owner || investor) && <PackagesPanel currentPlan={profile.plan} remaining={profile.remainingProjects} profile={profile} owner={owner} investor={investor} />}
          {active === 'investor-center' && investor && <InvestorPanel saved={saved} contacted={contacted} country={country} lang={lang} />}
          {active === 'saved' && investor && <MiniProjects title="المحفوظات" items={saved} country={country} lang={lang} empty="لم تحفظ فرصًا بعد." />}
          {active === 'suggested' && investor && <SuggestedPanel projects={suggested} profile={profile} country={country} lang={lang} setActive={openTab} />}
          {active === 'interests' && investor && <InterestsPanel profile={profile} lang={lang} onSaved={(next) => { setProfile(next); void loadSuggestedProjects(next).then(setSuggested); }} />}
          {active === 'messages' && <MessagesPanel contacted={contacted} country={country} lang={lang} profile={profile} />}
          {active === 'verification' && <VerificationPanel profile={profile} owner={owner} investor={investor} onActivity={async () => setActivity(await loadActivity(profile.id))} />}
          {active === 'notifications' && <ActivityPanel title="الإشعارات" items={activity.filter((i) => i.id.startsWith('n-'))} empty="لا توجد إشعارات جديدة." />}
          {active === 'activity' && <ActivityPanel title="سجل النشاط" items={activity} empty="لا يوجد نشاط مسجل بعد." />}
          {active === 'profile' && <ProfilePanel profile={profile} country={country} lang={lang} onSaved={setProfile} projects={projects} saved={saved} contacted={contacted} stats={stats} />}
        </section>
      </main>
    </div>
  );
}

function DashboardSidebar({ profile, menu, active, setActive, country, lang }: { profile: Profile; menu: MenuItem[]; active: Tab; setActive: (tab: Tab) => void; country: string; lang: string }) {
  return (
    <aside className="clean-sidebar">
      <Link href={`/${country}/${lang}`} className="clean-brand"><span>↗</span><strong>إلو مستثمر</strong></Link>
      <div className="clean-user-card">
        <div className="clean-avatar"><UserCircle size={26} /></div>
        <b>{profile.name}</b>
        <small>{accountTypeLabel(profile.accountType, lang)}</small>
      </div>
      <nav className="clean-menu" aria-label="Dashboard menu">
        {menu.map((item, index) => {
          const Icon = item.icon;
          if (item.href) return <Link key={`${item.label}-${index}`} href={item.href} className="clean-menu-item"><Icon size={18} /><span>{item.label}</span></Link>;
          return <button key={`${item.id}-${index}`} onClick={() => setActive(item.id)} className={`clean-menu-item ${active === item.id ? 'active' : ''}`}><Icon size={18} /><span>{item.label}</span></button>;
        })}
      </nav>
      <button type="button" onClick={() => setActive('packages')} className="clean-upgrade"><span>ترقية الباقة</span><b>انشر مشاريع أكثر</b></button>
    </aside>
  );
}

function DashboardHeader({ profile, owner, investor, country, lang, setActive }: { profile: Profile; owner: boolean; investor: boolean; country: string; lang: string; setActive: (tab: Tab) => void }) {
  const router = useRouter();
  async function logout() {
    await signOutEverywhere();
    router.push(`/${country}/${lang}/login`);
    router.refresh();
  }
  return (
    <section className="clean-hero">
      <div>
        <p>مرحبًا بك</p>
        <h1>{profile.name}</h1>
        <span>حساب {owner && investor ? 'مستثمر وصاحب مشروع' : owner ? 'صاحب مشروع' : 'مستثمر'} — إدارة كل شيء من مكان واحد.</span>
      </div>
      <div className="clean-hero-actions">
        <Link href={`/${country}/${lang}`}>الرئيسية</Link>
        <Link href={`/${country}/${lang}/profile/${encodeURIComponent(profile.id)}`}>صفحتي الشخصية</Link>
        {owner && <button type="button" onClick={() => setActive('add-project')}>إضافة مشروع</button>}
        {investor && <Link href={`/${country}/${lang}/opportunities`}>فرص الاستثمار</Link>}
        <button type="button" onClick={logout} className="dashboard-logout-button"><LogOut size={16} /> تسجيل الخروج</button>
      </div>
    </section>
  );
}

function Metric({ title, value, caption, icon: Icon, textValue }: { title: string; value: number | string; caption: string; icon: any; textValue?: boolean }) {
  return <div className="clean-metric"><div><span>{title}</span><strong className={textValue ? 'is-text' : ''}>{value}</strong><small>{caption}</small></div><i><Icon size={20} /></i></div>;
}

function OverviewPanel({ owner, investor, stats, promotionStats, projects, saved, contacted, activity, country, lang, setActive, onEdit }: any) {
  return (
    <div className="clean-two-col">
      <div className="clean-stack">
        {owner && <ProjectsPreview projects={projects.slice(0, 4)} country={country} lang={lang} setActive={setActive} onEdit={onEdit} />}
        {owner && <PromotionStatsPanel stats={promotionStats} />}
        {investor && <InvestorPanel saved={saved} contacted={contacted} country={country} lang={lang} />}
      </div>
      <div className="clean-stack">
        <ProgressPanel stats={stats} />
        <ActivityPanel title="آخر النشاط" items={activity.slice(0, 5)} empty="لا يوجد نشاط حديث." compact />
      </div>
    </div>
  );
}

function PromotionStatsPanel({ stats }: { stats: PromotionStats }) {
  return (
    <div className="promotion-stats-card">
      <h3>إحصائيات الترويج</h3>
      <div className="promotion-stats-grid">
        <div><span>كل الطلبات</span><b>{stats.total}</b></div>
        <div><span>المشاهدات</span><b>{new Intl.NumberFormat('en-US').format(stats.views)}</b></div>
        <div><span>النقرات</span><b>{new Intl.NumberFormat('en-US').format(stats.clicks)}</b></div>
        <div><span>عدد التواصل</span><b>{new Intl.NumberFormat('en-US').format(stats.contacts)}</b></div>
        <div><span>قيد المراجعة</span><b>{stats.pending}</b></div>
        <div><span>قيد الترويج</span><b>{stats.active + stats.approved}</b></div>
        <div><span>الميزانية</span><b>{new Intl.NumberFormat('en-US').format(stats.budget)}</b></div>
      </div>
    </div>
  );
}


function OwnerPromotionPanel({ requests, stats, projects, country, lang }: { requests: OwnerPromotionRequest[]; stats: PromotionStats; projects: DashboardProject[]; country: string; lang: string }) {
  const [renewingId, setRenewingId] = useState('');
  const [renewMessage, setRenewMessage] = useState('');
  const isAr = lang !== 'en';

  async function requestRenewal(requestId: string) {
    setRenewingId(requestId);
    setRenewMessage('');
    try {
      const { error } = await supabaseBrowser.rpc('request_promotion_renewal', { p_request_id: requestId });
      if (error) throw error;
      setRenewMessage(isAr ? 'تم إنشاء طلب تجديد الترويج. سيظهر للإدارة كطلب جديد.' : 'Promotion renewal request created.');
    } catch (error) {
      setRenewMessage(error instanceof Error ? error.message : (isAr ? 'تعذر إنشاء طلب التجديد.' : 'Could not create renewal request.'));
    } finally {
      setRenewingId('');
    }
  }

  async function payPromotion(requestId: string) {
    setRenewingId(requestId);
    setRenewMessage('');
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error(isAr ? 'سجل الدخول مرة أخرى لإكمال الدفع.' : 'Please login again to complete payment.');
      const response = await fetch('/api/payments/thawani/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ promotionRequestId: requestId, country, lang }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.paymentUrl) throw new Error(payload.error || (isAr ? 'تعذر إنشاء رابط الدفع.' : 'Could not create payment link.'));
      window.location.href = payload.paymentUrl;
    } catch (error) {
      setRenewMessage(error instanceof Error ? error.message : (isAr ? 'تعذر فتح بوابة الدفع.' : 'Could not open payment gateway.'));
    } finally {
      setRenewingId('');
    }
  }

  return (
    <div className="clean-stack">
      <div className="clean-card">
        <CardTitle title="الترويج المدفوع" subtitle="تابع طلبات ترويج مشاريعك ونتائجها من مكان واحد." action={<Link href={`/${country}/${lang}/dashboard?tab=my-projects`}>مشاريعي</Link>} />
        <div className="promotion-stats-grid mt-4">
          <div><span>كل الطلبات</span><b>{stats.total}</b></div>
          <div><span>المشاهدات</span><b>{new Intl.NumberFormat('en-US').format(stats.views)}</b></div>
          <div><span>النقرات</span><b>{new Intl.NumberFormat('en-US').format(stats.clicks)}</b></div>
          <div><span>عدد التواصل</span><b>{new Intl.NumberFormat('en-US').format(stats.contacts)}</b></div>
          <div><span>قيد المراجعة</span><b>{stats.pending}</b></div>
          <div><span>قيد الترويج</span><b>{stats.active + stats.approved}</b></div>
          <div><span>الميزانية</span><b>{new Intl.NumberFormat('en-US').format(stats.budget)} ر.ع</b></div>
        </div>
      </div>
      <div className="clean-card">
        <CardTitle title="طلبات الترويج" subtitle="يمكنك ترويج أي مشروع من صفحة تفاصيل المشروع أو من قائمة مشاريعك." />
        {renewMessage ? <p className="clean-save-message">{renewMessage}</p> : null}
        {requests.length ? (
          <div className="clean-project-list">
            {requests.map((request) => {
              const project = projects.find((item) => item.id === request.project_id);
              const projectId = String(request.project_id || project?.id || '');
              return (
                <article key={request.id} className="clean-project-row">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-xl">📣</div>
                  <div>
                    <span className={promotionStatusClass(request.status)}>{promotionStatusLabel(request.status)}</span>
                    <h3>{project?.title || request.projectTitle || 'مشروع'}</h3>
                    <p>{request.plan_name || request.plan_code || 'باقة ترويج'} · {request.placement || 'الرئيسية'} · {request.duration_days || 7} يوم</p>
                    <small>{Number(request.price || request.amount || 0).toLocaleString('en-US')} ر.ع {request.ends_at ? `· ينتهي ${formatDate(request.ends_at, lang)}` : ''}</small>
                    <small className="block text-blue-700">نتائج الترويج: مشاهدات {Number(request.promotion_views || request.views || request.impressions || 0).toLocaleString('en-US')} · نقرات {Number(request.promotion_clicks || request.clicks || 0).toLocaleString('en-US')} · تواصل {Number(request.promotion_contacts || request.contacts || 0).toLocaleString('en-US')}</small>
                    {request.admin_note ? <small className="block text-amber-700">ملاحظة الإدارة: {request.admin_note}</small> : null}
                  </div>
                  <div className="row-actions">
                    {projectId ? <Link href={`/${country}/${lang}/project/${encodeURIComponent(projectId)}`}>عرض المشروع</Link> : null}
                    {String(request.status || '').toLowerCase() === 'pending_payment' ? <button type="button" onClick={() => payPromotion(request.id)} disabled={renewingId === request.id}>{renewingId === request.id ? 'جاري فتح الدفع...' : 'ادفع عبر ثواني'}</button> : null}
                    {projectId ? <Link href={`/${country}/${lang}/promote/${encodeURIComponent(projectId)}`}>ترويج جديد</Link> : null}
                    <button type="button" onClick={() => requestRenewal(request.id)} disabled={renewingId === request.id}>{renewingId === request.id ? 'جاري التجديد...' : 'تجديد بنقرة'}</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <Empty title="لا توجد طلبات ترويج بعد" />
        )}
      </div>
    </div>
  );
}

function ProjectsPreview({ projects, country, lang, setActive, onEdit }: { projects: DashboardProject[]; country: string; lang: string; setActive: (tab: Tab) => void; onEdit: (id: string) => void }) {
  return <div className="clean-card"><CardTitle title="أحدث مشاريعي" subtitle="مختصر للمشاريع وحالتها." action={<button onClick={() => setActive('my-projects')}>عرض الكل</button>} />{projects.length ? <div className="clean-project-grid">{projects.map((p) => <ProjectCard key={p.id} project={p} country={country} lang={lang} onEdit={onEdit} editable />)}</div> : <Empty title="لا توجد مشاريع بعد" />}</div>;
}

function ProjectsPanel({ projects, query, setQuery, country, lang, onEdit }: { projects: DashboardProject[]; query: string; setQuery: (v: string) => void; country: string; lang: string; onEdit: (id: string) => void }) {
  return <div className="clean-card"><div className="clean-card-head"><div><h2>مشاريعي</h2><p>إدارة المشاريع ومتابعة حالتها.</p></div><label className="clean-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في مشاريعي" /></label></div>{projects.length ? <div className="clean-project-list">{projects.map((p) => <ProjectRow key={p.id} project={p} country={country} lang={lang} onEdit={onEdit} />)}</div> : <Empty title="لا توجد مشاريع مطابقة" />}</div>;
}

function ProjectCard({ project, country, lang, onEdit, editable = false }: { project: DashboardProject; country: string; lang: string; onEdit?: (id: string) => void; editable?: boolean }) {
  return <div className="clean-project-card-wrap"><Link href={`/${country}/${lang}/project/${encodeURIComponent(project.id || project.slug)}`} className="clean-project-card"><div className="thumb"><img src={project.coverImage} alt="" /><span className={statusClass(project.status)}>{statusLabel(project.status)}</span></div><div className="body"><h3>{project.title}</h3><p>{project.city || project.governorate || 'غير محدد'}</p><div><small>👁 {project.views}</small><small>💬 {project.contacts}</small><small>⭐ {project.roi}%</small></div></div></Link>{editable && onEdit && <button type="button" onClick={() => onEdit(project.id)} className="clean-card-edit">تعديل</button>}</div>;
}

function ProjectRow({ project, country, lang, onEdit }: { project: DashboardProject; country: string; lang: string; onEdit: (id: string) => void }) {
  return <article className="clean-project-row"><img src={project.coverImage} alt="" /><div><span className={statusClass(project.status)}>{statusLabel(project.status)}</span><h3>{project.title}</h3><p>{getCategoryLabel(project.category, lang)} · {project.city || project.governorate || 'غير محدد'}</p><small>{formatMoney(project.price, lang)} · {project.views} مشاهدة · {project.contacts} تواصل</small></div><div className="row-actions"><Link href={`/${country}/${lang}/project/${encodeURIComponent(project.id || project.slug)}`}>مشاهدة</Link><button type="button" onClick={() => onEdit(project.id)}>تعديل</button></div></article>;
}

function InvestorPanel({ saved, contacted, country, lang }: { saved: MiniProject[]; contacted: MiniProject[]; country: string; lang: string }) {
  return <div className="clean-stack"><div className="clean-two-mini"><MiniProjects title="فرص محفوظة" items={saved} country={country} lang={lang} empty="لم تحفظ فرصًا بعد." /><MiniProjects title="تواصلت معها" items={contacted} country={country} lang={lang} empty="لم تتواصل مع فرص بعد." /></div><SavedSearchesPanel country={country} lang={lang} /></div>;
}

function MiniProjects({ title, items, country, lang, empty }: { title: string; items: MiniProject[]; country: string; lang: string; empty: string }) {
  return <div className="clean-card"><CardTitle title={title} />{items.length ? <div className="clean-mini-list">{items.map((item) => <Link key={item.id} href={`/${country}/${lang}/project/${encodeURIComponent(item.projectId || item.slug)}`}><img src={item.image} alt="" /><div><b>{item.title}</b><span>{item.city || 'غير محدد'} · {formatMoney(item.price, lang)}</span><small>العائد {item.roi || 0}%</small></div></Link>)}</div> : <Empty title={empty} />}</div>;
}

function ProgressPanel({ stats }: any) {
  const viewsMax = Math.max(Number(stats.views || 0), 200);
  const contactsMax = Math.max(Number(stats.contacts || 0), 20);
  const rows = [['المشاهدات', stats.views, viewsMax], ['طلبات التواصل', stats.contacts, contactsMax], ['المشاريع المنشورة', stats.published, Math.max(1, stats.projects)], ['قيد المراجعة', stats.pending, Math.max(1, stats.projects)]];
  return <div className="clean-card"><CardTitle title="إحصائيات سريعة" subtitle="ملخص النشاط الحالي." /> <div className="clean-progress-list">{rows.map(([label, value, max]) => <div key={String(label)}><p><span>{label}</span><b>{String(value)}</b></p><div><i style={{ width: `${Math.min(100, (Number(value) / Number(max)) * 100)}%` }} /></div></div>)}</div></div>;
}

function ActivityPanel({ title, items, empty, compact }: { title: string; items: ActivityItem[]; empty: string; compact?: boolean }) {
  return <div className="clean-card"><CardTitle title={title} />{items.length ? <div className="clean-activity-list">{items.map((item) => <div key={item.id} className={compact ? 'compact' : ''}><i className={item.tone || 'slate'} /><div><b>{item.title}</b><span>{item.subtitle}</span></div><small>{formatDate(item.date, 'ar')}</small></div>)}</div> : <Empty title={empty} />}</div>;
}

function ActionPanel({ title, text, href, cta, icon: Icon }: { title: string; text: string; href: string; cta: string; icon: any }) {
  return <div className="clean-action-card"><i><Icon size={30} /></i><h2>{title}</h2><p>{text}</p><Link href={href}>{cta}</Link></div>;
}

function InterestsPanel({ profile, lang, onSaved }: { profile: Profile; lang: string; onSaved: (profile: Profile) => void }) {
  const [form, setForm] = useState({
    budgetMin: profile.budgetMin ? String(profile.budgetMin) : '',
    budgetMax: profile.budgetMax ? String(profile.budgetMax) : '',
    location: profile.preferredLocation || '',
    categories: (profile.preferredCategories || []).join(', '),
    type: String(profile.investorPreferences?.opportunity_type || 'all'),
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const isAr = lang !== 'en';

  async function saveInterests() {
    setSaving(true);
    setMessage('');
    try {
      const categories = form.categories.split(',').map((item) => item.trim()).filter(Boolean);
      const payload = {
        budget_min: Number(form.budgetMin || 0),
        budget_max: Number(form.budgetMax || 0),
        preferred_location: form.location.trim(),
        preferred_categories: categories,
        investor_preferences: { opportunity_type: form.type, categories, location: form.location.trim(), updated_at: new Date().toISOString() },
      };
      await updateUserWithFallback(profile.id, payload);
      onSaved({ ...profile, budgetMin: Number(form.budgetMin || 0), budgetMax: Number(form.budgetMax || 0), preferredLocation: form.location.trim(), preferredCategories: categories, investorPreferences: { ...(profile.investorPreferences || {}), opportunity_type: form.type } });
      setMessage(isAr ? 'تم حفظ اهتمامات المستثمر.' : 'Investor preferences saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (isAr ? 'تعذر حفظ الاهتمامات.' : 'Could not save interests.'));
    } finally {
      setSaving(false);
    }
  }

  return <div className="clean-card"><CardTitle title={isAr ? 'اهتماماتي' : 'My interests'} subtitle={isAr ? 'احفظ الميزانية والقطاعات حتى تظهر لك فرص أنسب.' : 'Save your budget and sectors for better recommendations.'} />
    <div className="clean-form-grid"><label><span>{isAr ? 'الميزانية من' : 'Budget from'}</span><input value={form.budgetMin} onChange={(e) => setForm((p) => ({ ...p, budgetMin: e.target.value }))} inputMode="numeric" placeholder="1000" /></label><label><span>{isAr ? 'الميزانية إلى' : 'Budget to'}</span><input value={form.budgetMax} onChange={(e) => setForm((p) => ({ ...p, budgetMax: e.target.value }))} inputMode="numeric" placeholder="20000" /></label><label><span>{isAr ? 'المحافظة المفضلة' : 'Preferred location'}</span><input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder={isAr ? 'مسقط' : 'Muscat'} /></label><label><span>{isAr ? 'القطاعات' : 'Sectors'}</span><input value={form.categories} onChange={(e) => setForm((p) => ({ ...p, categories: e.target.value }))} placeholder={isAr ? 'مطاعم، تقنية، تجزئة' : 'Restaurants, tech, retail'} /></label><label><span>{isAr ? 'نوع الفرصة' : 'Opportunity type'}</span><select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}><option value="all">{isAr ? 'كل الفرص' : 'All'}</option><option value="sale">{isAr ? 'بيع مشروع' : 'Sale'}</option><option value="partnership">{isAr ? 'شراكة' : 'Partnership'}</option><option value="funding">{isAr ? 'تمويل' : 'Funding'}</option></select></label><button type="button" onClick={saveInterests} disabled={saving}>{saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الاهتمامات' : 'Save interests')}</button></div>{message && <p className="clean-save-message">{message}</p>}
  </div>;
}

function PackagesPanel({ currentPlan, remaining, profile, owner, investor }: { currentPlan: string; remaining: number; profile: Profile; owner: boolean; investor: boolean }) {
  const [message, setMessage] = useState('');
  const [requesting, setRequesting] = useState('');
  const ownerPlans = [
    { name: 'starter', price: 'مجانية', quota: '1 مشروع', note: 'نشر أساسي بدون توثيق مشاريع', badge: 'Free' },
    { name: 'growth', price: '10 ر.ع', quota: '2 مشاريع + توثيق مشروع', note: 'توثيق المشروع متاح داخل إضافة المشروع', badge: 'Owner' },
    { name: 'business', price: '25 ر.ع', quota: '6 مشاريع + أولوية مراجعة', note: 'مناسبة لأصحاب المشاريع النشطين', badge: 'Best' },
  ];
  const investorPlans = [
    { name: 'free', price: 'مجانية', quota: '3 فرص مقترحة', note: 'اقتراحات محدودة حسب الاهتمامات', badge: 'Investor' },
    { name: 'investor_pro', price: '7 ر.ع', quota: '25 فرصة مقترحة', note: 'مطابقة أذكى ومشاريع موثقة أولًا', badge: 'Pro' },
    { name: 'investor_elite', price: '15 ر.ع', quota: 'اقتراحات غير محدودة', note: 'AI matching + أولوية تنبيهات', badge: 'Elite' },
  ];
  const plans = [...(owner ? ownerPlans : []), ...(investor ? investorPlans : [])];
  async function requestPlan(planName: string) {
    if (normalizePlan(planName) === normalizePlan(currentPlan)) return;
    setRequesting(planName);
    setMessage('');
    try {
      const paidPlan = !['starter', 'free'].includes(normalizePlan(planName));
      if (paidPlan) {
        const { data: sessionData } = await supabaseBrowser.auth.getSession();
        const token = sessionData.session?.access_token || '';
        if (!token) throw new Error('سجل الدخول مرة أخرى لإكمال الدفع.');
        const response = await fetch('/api/payments/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ payment_type: 'package', plan_code: normalizePlan(planName), country: 'om', lang: 'ar' }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.paymentUrl) throw new Error(payload.error || 'تعذر إنشاء رابط الدفع.');
        window.location.href = payload.paymentUrl;
        return;
      }
      await insertRowWithFallback('notifications', { user_auth_id: profile.id, title: 'طلب باقة مجانية', body: `طلب تفعيل ${planName}`, type: 'package_request', is_read: false });
      setMessage('تم تسجيل طلب الباقة.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر فتح بوابة الدفع.');
    } finally {
      setRequesting('');
    }
  }
  return <div className="clean-card"><CardTitle title="الباقات" subtitle="باقات منفصلة للمستثمر وصاحب المشروع: الاقتراحات للمستثمر، والتوثيق المدفوع لصاحب المشروع." />
    <div className="clean-package-grid">{plans.map((plan) => <article key={plan.name} className={normalizePlan(currentPlan) === normalizePlan(plan.name) ? 'active' : ''}><span>{plan.badge}</span><b>{plan.name}</b><strong>{plan.price}</strong><em>{plan.quota}</em><p>{plan.note}</p><button type="button" disabled={normalizePlan(currentPlan) === normalizePlan(plan.name) || requesting === plan.name} onClick={() => requestPlan(plan.name)}>{normalizePlan(currentPlan) === normalizePlan(plan.name) ? `باقتك الحالية · ${remaining} رصيد` : requesting === plan.name ? 'جاري الإرسال...' : 'طلب الترقية'}</button></article>)}</div>{message && <p className="clean-save-message">{message}</p>}
  </div>;
}

function SuggestedPanel({ projects, profile, country, lang, setActive }: { projects: DashboardProject[]; profile: Profile; country: string; lang: string; setActive: (tab: Tab) => void }) {
  const limit = investorSuggestionLimit(profile.plan);
  const paid = isPaidPlan(profile.plan);
  const visible = projects.slice(0, limit);
  const locked = projects.slice(limit, limit + 6);
  const isAr = lang !== 'en';
  return <div className="clean-card"><CardTitle title={isAr ? 'الفرص المقترحة لك' : 'Suggested opportunities'} subtitle={isAr ? `تم ترتيب الفرص حسب اهتماماتك وميزانيتك. باقتك تسمح بـ ${limit >= 999 ? 'اقتراحات غير محدودة' : `${limit} اقتراحات`}.` : 'Ranked by your interests and budget.'} action={<button type="button" onClick={() => setActive('interests')}>{isAr ? 'تعديل الاهتمامات' : 'Edit interests'}</button>} />
    {!projects.length && <Empty title={isAr ? 'احفظ اهتماماتك أولًا أو انتظر توفر فرص مناسبة.' : 'Save your interests first or wait for matching opportunities.'} />}
    {!!visible.length && <div className="clean-project-grid suggested-grid">{visible.map((p, index) => <div key={p.id} className="suggested-card"><ProjectCard project={p} country={country} lang={lang} /><div className="match-score"><Sparkles size={14} /> {isAr ? 'مطابقة' : 'Match'} {Math.max(62, 96 - index * 3)}%</div></div>)}</div>}
    {!!locked.length && !paid && <div className="locked-suggestions"><div><LockKeyhole size={28} /><h3>{isAr ? 'افتح اقتراحات أكثر للمستثمر' : 'Unlock more investor matches'}</h3><p>{isAr ? 'الباقة المجانية تعرض 3 فرص فقط. ترقية باقة المستثمر تفتح حتى 25 فرصة أو اقتراحات غير محدودة.' : 'Free plan shows 3 matches only. Upgrade to unlock more.'}</p><button type="button" onClick={() => setActive('packages')}>{isAr ? 'ترقية باقة المستثمر' : 'Upgrade investor plan'}</button></div>{locked.map((p) => <article key={p.id}><img src={p.coverImage} alt="" /><span>{p.title}</span><LockKeyhole size={18} /></article>)}</div>}
  </div>;
}


function MessagesPanel({ contacted, country, lang, profile }: { contacted: MiniProject[]; country: string; lang: string; profile: Profile }) {
  const [selected, setSelected] = useState<MiniProject | null>(contacted[0] || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const isAr = lang !== 'en';

  useEffect(() => { if (!selected && contacted[0]) setSelected(contacted[0]); }, [contacted, selected]);

  useEffect(() => {
    let mounted = true;
    const convId = selected?.conversationId || '';
    setMessage('');
    setMessages([]);
    if (!convId) return undefined;

    async function loadMessages() {
      try {
        const { data, error } = await supabaseBrowser
          .from('messages')
          .select('*')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true })
          .limit(120);
        if (error) throw error;
        if (!mounted) return;
        setMessages((data || []).map((row: any) => ({
          id: String(row.id),
          conversationId: String(row.conversation_id || ''),
          senderId: String(row.sender_id || ''),
          body: String(row.body || ''),
          createdAt: String(row.created_at || ''),
          readAt: String(row.read_at || ''),
        })));

        try {
          await supabaseBrowser
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('conversation_id', convId)
            .neq('sender_id', profile.id)
            .is('read_at', null);
        } catch (readError) {
          console.warn('Mark messages as read skipped:', readError);
        }
      } catch (error) {
        if (mounted) setMessage(error instanceof Error ? error.message : (isAr ? 'تعذر تحميل الرسائل.' : 'Could not load messages.'));
      }
    }

    void loadMessages();
    const channel = supabaseBrowser
      .channel(`dashboard-conversation-${convId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` }, (payload) => {
        const row: any = payload.new;
        const next: ChatMessage = {
          id: String(row.id),
          conversationId: String(row.conversation_id || ''),
          senderId: String(row.sender_id || ''),
          body: String(row.body || ''),
          createdAt: String(row.created_at || new Date().toISOString()),
          readAt: String(row.read_at || ''),
        };
        setMessages((prev) => prev.some((item) => item.id === next.id) ? prev : [...prev, next]);
      })
      .subscribe();

    return () => {
      mounted = false;
      void supabaseBrowser.removeChannel(channel);
    };
  }, [selected?.conversationId, profile.id, isAr]);

  async function sendMessage() {
    const text = body.trim();
    if (!text || !selected?.conversationId) return;
    setSending(true);
    setMessage('');
    try {
      const inserted = await insertRowWithFallback('messages', { conversation_id: selected.conversationId, sender_id: profile.id, body: text, read_at: null });
      try { await supabaseBrowser.from('conversations').update({ last_message: text, last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', selected.conversationId); } catch {}
      if (inserted?.id) {
        const next: ChatMessage = { id: String(inserted.id), conversationId: selected.conversationId || '', senderId: profile.id, body: text, createdAt: String(inserted.created_at || new Date().toISOString()) };
        setMessages((prev) => prev.some((item) => item.id === next.id) ? prev : [...prev, next]);
      }
      setBody('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (isAr ? 'تعذر إرسال الرسالة.' : 'Could not send message.'));
    } finally {
      setSending(false);
    }
  }

  return <div className="clean-card"><CardTitle title={isAr ? 'الشات الداخلي' : 'Internal chat'} subtitle={isAr ? 'رسائل حقيقية مرتبطة بقاعدة البيانات والتحديث المباشر.' : 'Real database-backed messages with realtime updates.'} />
    <div className="clean-chat-shell"><aside>{contacted.length ? contacted.map((item) => <button key={item.id} onClick={() => setSelected(item)} className={selected?.id === item.id ? 'active' : ''}><img src={item.image} alt="" /><span><b>{item.title}</b><small>{item.city || (isAr ? 'فرصة استثمارية' : 'Investment opportunity')}</small></span></button>) : <Empty title={isAr ? 'لا توجد محادثات بعد.' : 'No conversations yet.'} />}</aside>
      <section>{selected ? <><div className="chat-head"><b>{selected.title}</b><Link href={`/${country}/${lang}/project/${encodeURIComponent(selected.projectId || selected.slug)}`}>{isAr ? 'فتح المشروع' : 'Open project'}</Link></div><div className="chat-body">{messages.length ? messages.map((item) => <p key={item.id} className={`bubble ${item.senderId === profile.id ? 'outgoing' : 'incoming'}`}>{item.body}<small>{formatDate(item.createdAt, lang)}</small></p>) : <p className="bubble incoming">{isAr ? 'ابدأ المحادثة حول هذه الفرصة من هنا.' : 'Start the conversation about this opportunity here.'}</p>}</div>{message && <p className="clean-save-message">{message}</p>}<div className="chat-compose"><input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void sendMessage(); }} placeholder={isAr ? 'اكتب رسالة...' : 'Write a message...'} /><button type="button" onClick={sendMessage} disabled={sending || !selected.conversationId}>{sending ? '...' : (isAr ? 'إرسال' : 'Send')}</button></div></> : <Empty title={isAr ? 'اختر محادثة لعرض التفاصيل.' : 'Choose a conversation.'} />}</section></div>
  </div>;
}

function VerificationPanel({ profile, owner, investor, onActivity }: { profile: Profile; owner: boolean; investor: boolean; onActivity: () => void }) {
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [sending, setSending] = useState('');
  const [message, setMessage] = useState('');

  async function uploadVerificationFile(file: File, type: 'investor' | 'project') {
    const bucket = process.env.NEXT_PUBLIC_VERIFICATION_BUCKET || 'verification-docs';
    const ext = file.name.split('.').pop() || 'pdf';
    const safeName = `${type}-${Date.now()}.${ext}`.replace(/[^a-zA-Z0-9.-]/g, '');
    const path = `${profile.id}/${safeName}`;
    const { error } = await supabaseBrowser.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw new Error(`فشل رفع الملف: ${error.message}`);
    const { data } = supabaseBrowser.storage.from(bucket).getPublicUrl(path);
    return { path, publicUrl: data.publicUrl };
  }

  async function submitVerification(type: 'investor' | 'project') {
    setSending(type);
    setMessage('');
    try {
      const file = files[type];
      if (!file) throw new Error(type === 'investor' ? 'اختر ملف الهوية أو كشف الحساب أولًا.' : 'اختر ملف السجل التجاري أو أوراق المشروع أولًا.');
      const uploaded = await uploadVerificationFile(file, type);
      await insertRowWithFallback('verification_requests', {
        user_auth_id: profile.id,
        request_type: type,
        status: 'pending',
        title: type === 'investor' ? 'توثيق مستثمر' : 'توثيق مشروع',
        document_name: file.name,
        document_url: uploaded.publicUrl,
        file_url: uploaded.publicUrl,
        file_path: uploaded.path,
        storage_path: uploaded.path,
        note: 'طلب توثيق من لوحة المستخدم',
      });
      setFiles((prev) => ({ ...prev, [type]: null }));
      setMessage(type === 'investor' ? 'تم رفع الملف وإرسال طلب توثيق المستثمر.' : 'تم رفع الملف وإرسال طلب توثيق المشروع.');
      await onActivity();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر إرسال طلب التوثيق.');
    } finally {
      setSending('');
    }
  }
  return <div className="clean-card"><CardTitle title="التوثيق" subtitle="ارفع مستنداتك للحصول على شارة موثق وزيادة الثقة." />
    <div className="clean-verify-grid"><article><ShieldCheck size={28} /><b>حالة الحساب</b><strong>{profile.verificationStatus === 'approved' ? 'موثق' : 'غير موثق'}</strong><p>التوثيق يزيد ثقة المستثمرين وأصحاب المشاريع.</p></article>{investor && <article><UserCircle size={28} /><b>توثيق مستثمر</b><p>ارفع الهوية وكشف حساب بنكي قوي للمراجعة.</p><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setFiles((p) => ({ ...p, investor: e.target.files?.[0] || null }))} />{files.investor && <small>{files.investor.name}</small>}<button type="button" onClick={() => submitVerification('investor')} disabled={sending === 'investor'}>{sending === 'investor' ? 'جاري الرفع...' : 'إرسال طلب توثيق مستثمر'}</button></article>}{owner && (isPaidPlan(profile.plan) ? <article><FileCheck2 size={28} /><b>توثيق مشروع</b><p>متاح ضمن باقتك المدفوعة. ارفع سجل تجاري أو أوراق المشروع للمراجعة.</p><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setFiles((p) => ({ ...p, project: e.target.files?.[0] || null }))} />{files.project && <small>{files.project.name}</small>}<button type="button" onClick={() => submitVerification('project')} disabled={sending === 'project'}>{sending === 'project' ? 'جاري الرفع...' : 'إرسال طلب توثيق مشروع'}</button></article> : <article className="locked-verify"><LockKeyhole size={28} /><b>توثيق المشاريع مدفوع</b><p>ترقية باقة صاحب المشروع مطلوبة لطلب شارة مشروع موثق.</p><button type="button" onClick={() => setMessage('افتح تبويب الباقات واختر باقة Growth أو Business لتفعيل توثيق المشاريع.')}>معرفة طريقة التفعيل</button></article>)}</div>{message && <p className="clean-save-message">{message}</p>}
  </div>;
}

function ProfilePanel({ profile, country, lang, onSaved, projects = [], saved = [], contacted = [], stats }: { profile: Profile; country: string; lang: string; onSaved: (profile: Profile) => void; projects?: DashboardProject[]; saved?: MiniProject[]; contacted?: MiniProject[]; stats?: any }) {
  const [form, setForm] = useState({
    name: profile.name,
    phone: profile.phone || '',
    whatsapp: profile.whatsapp || '',
    accountType: profile.accountType,
    bio: profile.bio || '',
    location: profile.location || '',
    avatarUrl: profile.avatarUrl || '',
    autoWelcomeMessage: profile.autoWelcomeMessage || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState('');

  async function uploadAvatar(file?: File | null) {
    if (!file) return;
    setUploadingAvatar(true);
    setMessage('');
    try {
      if (file.size > 3 * 1024 * 1024) throw new Error('حجم الصورة كبير. الحد الأقصى 3MB.');
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const cleanId = String(profile.id || 'user').replace(/[^a-zA-Z0-9-]/g, '-');
      const path = `${cleanId}/avatar-${Date.now()}.${ext}`;
      const bucketCandidates = ['profile-avatars', 'avatars', 'user-avatars'];
      let publicUrl = '';
      let lastError: any = null;
      for (const bucket of bucketCandidates) {
        const { error } = await supabaseBrowser.storage.from(bucket).upload(path, file, { upsert: true, cacheControl: '3600' });
        if (error) { lastError = error; continue; }
        const { data } = supabaseBrowser.storage.from(bucket).getPublicUrl(path);
        publicUrl = data.publicUrl;
        break;
      }
      if (!publicUrl) {
        const message = String(lastError?.message || '').toLowerCase().includes('bucket not found')
          ? 'Bucket not found: شغّل ملف SQL v47 لإنشاء bucket الصور الشخصية، أو أنشئ bucket باسم profile-avatars من Supabase Storage.'
          : (lastError?.message || 'تعذر رفع الصورة الشخصية.');
        throw new Error(message);
      }
      await updateUserWithFallback(profile.id, { avatar_url: publicUrl, photo_url: publicUrl });
      setForm((prev) => ({ ...prev, avatarUrl: publicUrl }));
      onSaved({ ...profile, avatarUrl: publicUrl });
      setMessage('تم تحديث الصورة الشخصية.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر رفع الصورة الشخصية. تأكد من تشغيل SQL الخاص بالبروفايل.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveProfile() {
    setSaving(true); setMessage('');
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        account_type: form.accountType,
        bio: form.bio.trim(),
        location: form.location.trim(),
        avatar_url: form.avatarUrl,
        auto_welcome_message: form.autoWelcomeMessage.trim(),
      };
      try {
        await updateUserWithFallback(profile.id, payload);
      } catch (error) {
        await insertRowWithFallback('users', { auth_id: profile.id, email: profile.email, role: 'user', subscription_status: profile.plan || 'free', ...payload });
      }
      const next = { ...profile, name: payload.name || profile.name, phone: payload.phone, whatsapp: payload.whatsapp, accountType: payload.account_type, bio: payload.bio, location: payload.location, avatarUrl: payload.avatar_url, autoWelcomeMessage: payload.auto_welcome_message };
      onSaved(next);
      setMessage('تم حفظ بيانات الملف الشخصي بنجاح.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ البيانات.');
    } finally { setSaving(false); }
  }

  const publicProfileHref = `/${country}/${lang}/profile/${encodeURIComponent(profile.id)}`;
  const completionItems = [Boolean(form.name), Boolean(form.location), Boolean(form.bio), Boolean(form.avatarUrl), Boolean(form.whatsapp || form.phone)];
  const completion = Math.round((completionItems.filter(Boolean).length / completionItems.length) * 100);
  return <div className="profile-dashboard-grid">
    <div className="clean-card profile-dashboard-main"><CardTitle title="الملف الشخصي" subtitle="تعديل بيانات الحساب العامة وصورة البروفايل." action={<Link href={publicProfileHref} className="clean-small-link">عرض صفحتي العامة</Link>} />
    <div className="profile-edit-avatar-row">
      <div className="profile-edit-avatar">{form.avatarUrl ? <img src={form.avatarUrl} alt={form.name} /> : <UserCircle size={46} />}<span><Camera size={16} /></span></div>
      <label className="profile-avatar-upload"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadAvatar(e.target.files?.[0])} />{uploadingAvatar ? 'جاري رفع الصورة...' : 'رفع صورة شخصية'}</label>
      <small>تظهر الصورة في صفحة البروفايل العامة وتفاصيل المشروع. إذا ظهر Bucket not found شغّل SQL v47.</small>
    </div>
    <div className="profile-completion"><span>اكتمال الملف</span><b>{completion}%</b><i style={{ width: `${completion}%` }} /></div>
    <div className="clean-form-grid">
      <label><span>الاسم</span><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></label>
      <label><span>رقم الهاتف</span><input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></label>
      <label><span>واتساب</span><input value={form.whatsapp} onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))} /></label>
      <label><span>الموقع</span><input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="مثال: مسقط، عمان" /></label>
      <label><span>نوع الحساب</span><select value={form.accountType} onChange={(e) => setForm((p) => ({ ...p, accountType: e.target.value }))}><option value="investor">مستثمر</option><option value="owner">صاحب مشروع</option><option value="both">مستثمر وصاحب مشروع</option></select></label>
      <label className="clean-form-full"><span>نبذة عامة</span><textarea value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} placeholder="اكتب نبذة قصيرة تظهر في صفحتك العامة" rows={4} /></label>
      <label className="clean-form-full"><span>رسالة ترحيب تلقائية للمستثمرين</span><textarea value={form.autoWelcomeMessage} onChange={(e) => setForm((p) => ({ ...p, autoWelcomeMessage: e.target.value }))} placeholder="مثال: أهلاً بك، يسعدني اهتمامك بالمشروع. أرسل لي أسئلتك وسأرد عليك قريباً." rows={3} /></label>
      <Info label="البريد" value="مخفي في الصفحة العامة" />
      <Info label="الباقة" value={profile.plan} />
      <button type="button" onClick={saveProfile} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</button>
    </div>{message && <p className="clean-save-message">{message}</p>}
    </div>
    <aside className="clean-card profile-dashboard-side">
      <CardTitle title="إحصائيات الحساب" subtitle="ملخص يظهر لك جاهزية ملفك العام." />
      <div className="profile-mini-stats-grid">
        <Info label="المشاريع" value={String(stats?.projects ?? projects.length)} />
        <Info label="منشور" value={String(stats?.published ?? projects.filter((p) => ['approved','active','published'].includes(normalizeStatus(p.status))).length)} />
        <Info label="المشاهدات" value={String(stats?.views ?? projects.reduce((sum, p) => sum + Number(p.views || 0), 0))} />
        <Info label="التواصل" value={String(stats?.contacts ?? projects.reduce((sum, p) => sum + Number(p.contacts || 0), 0))} />
        <Info label="المحفوظات" value={String(saved.length)} />
        <Info label="تواصلت معها" value={String(contacted.length)} />
      </div>
      <div className="profile-side-actions">
        <Link href={publicProfileHref}>فتح البروفايل العام</Link>
        <Link href={`/${country}/${lang}/dashboard?tab=my-projects`}>إدارة مشاريعي</Link>
        <Link href={`/${country}/${lang}/dashboard?tab=interests`}>تعديل الاهتمامات</Link>
      </div>
      <div className="profile-recent-box">
        <b>آخر مشاريعك</b>
        {projects.slice(0,3).map((project) => <Link key={project.id} href={`/${country}/${lang}/project/${encodeURIComponent(project.slug || project.id)}`}>{project.title}</Link>)}
        {!projects.length ? <small>لا توجد مشاريع مضافة بعد.</small> : null}
      </div>
    </aside>
  </div>;
}

function CardTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="clean-card-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="clean-info"><span>{label}</span><b>{value}</b></div>; }
function Empty({ title }: { title: string }) { return <div className="clean-empty">{title}</div>; }

function MobileDashboardBar({ profile, active, menu, setOpen, country, lang }: { profile: Profile; active: Tab; menu: MenuItem[]; setOpen: (open: boolean) => void; country: string; lang: string }) {
  const activeItem = menu.find((item) => item.id === active);
  return (
    <div className="clean-mobile-dashboard-bar">
      <button type="button" onClick={() => setOpen(true)} aria-label="فتح قائمة لوحة المستخدم">
        <Menu size={21} />
      </button>
      <div>
        <b>{activeItem?.label || 'لوحة المستخدم'}</b>
        <span>{profile.name}</span>
      </div>
      <Link href={`/${country}/${lang}`} aria-label="الرئيسية"><Home size={20} /></Link>
    </div>
  );
}

function MobileDashboardDrawer({ open, setOpen, profile, menu, active, setActive, country, lang }: { open: boolean; setOpen: (open: boolean) => void; profile: Profile; menu: MenuItem[]; active: Tab; setActive: (tab: Tab) => void; country: string; lang: string }) {
  return (
    <div className={`clean-mobile-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
      <button type="button" className="clean-mobile-drawer-backdrop" onClick={() => setOpen(false)} aria-label="إغلاق القائمة" />
      <aside className="clean-mobile-drawer-panel">
        <div className="clean-mobile-drawer-head">
          <div className="clean-avatar"><UserCircle size={24} /></div>
          <div><b>{profile.name}</b><small>{accountTypeLabel(profile.accountType, lang)}</small></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق"><X size={20} /></button>
        </div>
        <nav className="clean-mobile-drawer-menu">
          <Link href={`/${country}/${lang}`} onClick={() => setOpen(false)}><Home size={18} /><span>الرئيسية</span></Link>
          <Link href={`/${country}/${lang}/profile/${encodeURIComponent(profile.id)}`} onClick={() => setOpen(false)}><UserCircle size={18} /><span>صفحتي الشخصية</span></Link>
          <button type="button" onClick={async () => { await signOutEverywhere(); window.location.href = `/${country}/${lang}/login`; }}><LogOut size={18} /><span>تسجيل الخروج</span></button>
          {menu.filter((item) => !item.href).map((item, index) => {
            const Icon = item.icon;
            return <button key={`${item.id}-${index}`} type="button" onClick={() => setActive(item.id)} className={active === item.id ? 'active' : ''}><Icon size={18} /><span>{item.label}</span></button>;
          })}
        </nav>
      </aside>
    </div>
  );
}

function DashboardSkeleton() {
  return <div className="clean-dashboard-skeleton"><div /><main><section /><div>{Array.from({ length: 6 }).map((_, i) => <span key={i} />)}</div><article /></main></div>;
}
