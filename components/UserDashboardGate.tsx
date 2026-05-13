'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCircle,
  Wallet,
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { AddProjectForm } from '@/components/AddProjectForm';
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
type ActivityItem = { id: string; title: string; subtitle: string; date: string; tone?: 'green' | 'amber' | 'rose' | 'slate' };
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
  if (['approved', 'active', 'published'].includes(s)) return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
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
  const { data } = await supabaseBrowser.auth.getUser();
  const authUser = data.user;
  if (!authUser) return null;
  let profile: any = null;
  try {
    const res = await supabaseBrowser.from('users').select('*').eq('auth_id', authUser.id).maybeSingle();
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
    for (const row of data || []) items.push({ id: String(row.id), title: row.request_type === 'investor' ? 'طلب توثيق مستثمر' : 'طلب توثيق مشروع', subtitle: String(row.status || 'pending'), date: String(row.created_at || ''), tone: row.status === 'approved' ? 'green' : row.status === 'rejected' ? 'rose' : 'amber' });
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
  let current = { ...payload };
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
  let current = { ...payload };
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
  if (admin) items.push({ id: 'admin-panel', label: label('لوحة الإدارة', 'Admin panel'), icon: LockKeyhole, href: '/admin' });
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
  const menu = useMemo(() => menuFor(owner, investor, admin, lang), [owner, investor, admin, lang]);

  function openTab(tab: Tab) {
    if (tab !== 'add-project') setEditingProjectId('');
    setActive(tab);
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
          <LockKeyhole className="mx-auto h-10 w-10 text-emerald-700" />
          <h1 className="mt-4 text-2xl font-black text-slate-950">تحتاج تسجيل الدخول</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">لوحة المستخدم متاحة للحسابات المسجلة فقط.</p>
          <Link href={`/${country}/${lang}/login`} className="mt-6 inline-flex rounded-2xl bg-emerald-700 px-7 py-3 font-black text-white">تسجيل الدخول</Link>
        </section>
      </main>
    );
  }

  return (
    <div className={`clean-dashboard ${isRtl ? 'is-rtl' : 'is-ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <DashboardSidebar profile={profile} menu={menu} active={active} setActive={openTab} country={country} lang={lang} />
      <main className="clean-main">
        <MobileTabs menu={menu} active={active} setActive={openTab} />
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
          {active === 'overview' && <OverviewPanel owner={owner} investor={investor} stats={stats} projects={projects} saved={saved} contacted={contacted} activity={activity} country={country} lang={lang} setActive={openTab} onEdit={editProject} />}
          {active === 'my-projects' && owner && <ProjectsPanel projects={filteredProjects} query={query} setQuery={setQuery} country={country} lang={lang} onEdit={editProject} />}
          {active === 'add-project' && owner && <AddProjectForm country={country} lang={lang} editProjectId={editingProjectId} onSaved={refreshDashboard} />}
          {active === 'requests' && owner && <ActivityPanel title="طلبات المستثمرين" items={activity.filter((i) => i.title.includes('تواصل') || i.subtitle.includes('contact'))} empty="لا توجد طلبات مستثمرين بعد." />}
          {active === 'packages' && (owner || investor) && <PackagesPanel currentPlan={profile.plan} remaining={profile.remainingProjects} profile={profile} owner={owner} investor={investor} />}
          {active === 'investor-center' && investor && <InvestorPanel saved={saved} contacted={contacted} country={country} lang={lang} />}
          {active === 'saved' && investor && <MiniProjects title="المحفوظات" items={saved} country={country} lang={lang} empty="لم تحفظ فرصًا بعد." />}
          {active === 'suggested' && investor && <SuggestedPanel projects={suggested} profile={profile} country={country} lang={lang} setActive={openTab} />}
          {active === 'interests' && investor && <InterestsPanel profile={profile} lang={lang} onSaved={(next) => { setProfile(next); void loadSuggestedProjects(next).then(setSuggested); }} />}
          {active === 'messages' && <MessagesPanel contacted={contacted} country={country} lang={lang} profile={profile} />}
          {active === 'verification' && <VerificationPanel profile={profile} owner={owner} investor={investor} onActivity={async () => setActivity(await loadActivity(profile.id))} />}
          {active === 'notifications' && <ActivityPanel title="الإشعارات" items={activity.filter((i) => i.id.startsWith('n-'))} empty="لا توجد إشعارات جديدة." />}
          {active === 'activity' && <ActivityPanel title="سجل النشاط" items={activity} empty="لا يوجد نشاط مسجل بعد." />}
          {active === 'profile' && <ProfilePanel profile={profile} lang={lang} onSaved={setProfile} />}
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
  return (
    <section className="clean-hero">
      <div>
        <p>مرحبًا بك</p>
        <h1>{profile.name}</h1>
        <span>حساب {owner && investor ? 'مستثمر وصاحب مشروع' : owner ? 'صاحب مشروع' : 'مستثمر'} — إدارة كل شيء من مكان واحد.</span>
      </div>
      <div className="clean-hero-actions">
        {owner && <button type="button" onClick={() => setActive('add-project')}>إضافة مشروع</button>}
        {investor && <Link href={`/${country}/${lang}/opportunities`}>فرص الاستثمار</Link>}
        <button type="button" onClick={() => setActive('verification')}>التوثيق</button>
      </div>
    </section>
  );
}

function Metric({ title, value, caption, icon: Icon, textValue }: { title: string; value: number | string; caption: string; icon: any; textValue?: boolean }) {
  return <div className="clean-metric"><div><span>{title}</span><strong className={textValue ? 'is-text' : ''}>{value}</strong><small>{caption}</small></div><i><Icon size={20} /></i></div>;
}

function OverviewPanel({ owner, investor, stats, projects, saved, contacted, activity, country, lang, setActive, onEdit }: any) {
  return (
    <div className="clean-two-col">
      <div className="clean-stack">
        {owner && <ProjectsPreview projects={projects.slice(0, 4)} country={country} lang={lang} setActive={setActive} onEdit={onEdit} />}
        {investor && <InvestorPanel saved={saved} contacted={contacted} country={country} lang={lang} />}
      </div>
      <div className="clean-stack">
        <ProgressPanel stats={stats} />
        <ActivityPanel title="آخر النشاط" items={activity.slice(0, 5)} empty="لا يوجد نشاط حديث." compact />
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
  return <div className="clean-two-mini"><MiniProjects title="فرص محفوظة" items={saved} country={country} lang={lang} empty="لم تحفظ فرصًا بعد." /><MiniProjects title="تواصلت معها" items={contacted} country={country} lang={lang} empty="لم تتواصل مع فرص بعد." /></div>;
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
      try {
        await insertRowWithFallback('package_upgrade_requests', { user_auth_id: profile.id, requested_plan: planName, current_plan: currentPlan || 'free', status: 'pending', note: `Upgrade request to ${planName}` });
      } catch {
        await insertRowWithFallback('notifications', { user_auth_id: profile.id, title: 'طلب ترقية باقة', body: `طلب ترقية إلى ${planName}`, type: 'package_request', is_read: false });
      }
      setMessage('تم إرسال طلب الترقية للإدارة. سيتم تفعيل الباقة بعد المراجعة.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر إرسال طلب الترقية.');
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

function ProfilePanel({ profile, lang, onSaved }: { profile: Profile; lang: string; onSaved: (profile: Profile) => void }) {
  const [form, setForm] = useState({ name: profile.name, phone: profile.phone || '', whatsapp: profile.whatsapp || '', accountType: profile.accountType });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  async function saveProfile() {
    setSaving(true); setMessage('');
    try {
      const payload = { name: form.name.trim(), phone: form.phone.trim(), whatsapp: form.whatsapp.trim(), account_type: form.accountType };
      try {
        await updateUserWithFallback(profile.id, payload);
      } catch (error) {
        await insertRowWithFallback('users', { auth_id: profile.id, email: profile.email, role: 'user', subscription_status: profile.plan || 'free', ...payload });
      }
      const next = { ...profile, name: payload.name || profile.name, phone: payload.phone, whatsapp: payload.whatsapp, accountType: payload.account_type };
      onSaved(next);
      setMessage('تم حفظ بيانات الملف الشخصي بنجاح.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ البيانات.');
    } finally { setSaving(false); }
  }
  return <div className="clean-card"><CardTitle title="الملف الشخصي" subtitle="تعديل بيانات الحساب الأساسية." />
    <div className="clean-form-grid"><label><span>الاسم</span><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></label><label><span>رقم الهاتف</span><input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></label><label><span>واتساب</span><input value={form.whatsapp} onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))} /></label><label><span>نوع الحساب</span><select value={form.accountType} onChange={(e) => setForm((p) => ({ ...p, accountType: e.target.value }))}><option value="investor">مستثمر</option><option value="owner">صاحب مشروع</option><option value="both">مستثمر وصاحب مشروع</option></select></label><Info label="البريد" value={profile.email} /><Info label="الباقة" value={profile.plan} /><button type="button" onClick={saveProfile} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</button></div>{message && <p className="clean-save-message">{message}</p>}
  </div>;
}

function CardTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="clean-card-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="clean-info"><span>{label}</span><b>{value}</b></div>; }
function Empty({ title }: { title: string }) { return <div className="clean-empty">{title}</div>; }

function MobileTabs({ menu, active, setActive }: { menu: MenuItem[]; active: Tab; setActive: (tab: Tab) => void }) {
  return <div className="clean-mobile-tabs">{menu.filter((item) => !item.href).map((item, i) => <button key={`${item.id}-${i}`} onClick={() => setActive(item.id)} className={active === item.id ? 'active' : ''}>{item.label}</button>)}</div>;
}

function DashboardSkeleton() {
  return <div className="clean-dashboard-skeleton"><div /><main><section /><div>{Array.from({ length: 6 }).map((_, i) => <span key={i} />)}</div><article /></main></div>;
}
