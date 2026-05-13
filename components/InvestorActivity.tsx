'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bookmark, CheckCircle2, Loader2, MessageCircle, Search, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type Item = {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  image: string;
  price: number;
  roi: number;
  city: string;
  createdAt: string;
};

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1200&auto=format&fit=crop';

function pickString(row: Record<string, any>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value);
  }
  return fallback;
}

function pickNumber(row: Record<string, any>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
  }
  return fallback;
}

function mapProject(row: Record<string, any>, idPrefix = ''): Item {
  const snapshot = typeof row.project_snapshot === 'object' && row.project_snapshot ? row.project_snapshot : {};
  const project = typeof row.projects === 'object' && row.projects ? row.projects : {};
  const source = { ...snapshot, ...project, ...row };
  const projectId = pickString(source, ['project_id', 'id'], '');
  const title = pickString(source, ['title_ar', 'title', 'project_title', 'name_ar'], 'فرصة استثمارية');
  return {
    id: `${idPrefix}${pickString(row, ['id'], projectId || title)}`,
    projectId,
    title,
    slug: pickString(source, ['slug'], projectId),
    image: pickString(source, ['cover_image_url', 'cover_image', 'image_url', 'thumbnail', 'image'], DEFAULT_IMAGE),
    price: pickNumber(source, ['price', 'project_price', 'asking_price', 'sale_price'], 0),
    roi: pickNumber(source, ['roi', 'profit_percentage', 'return_percentage'], 0),
    city: pickString(source, ['city', 'governorate', 'location', 'region'], ''),
    createdAt: pickString(row, ['created_at', 'last_message_at'], ''),
  };
}

function formatMoney(value: number, lang: string) {
  return `${new Intl.NumberFormat(lang === 'ar' ? 'ar-OM' : 'en-US').format(value || 0)} ${lang === 'ar' ? 'ر.ع' : 'OMR'}`;
}

async function loadSaved(userId: string) {
  try {
    const { data, error } = await supabaseBrowser
      .from('investor_saved_projects')
      .select('id,project_id,project_snapshot,created_at,projects(*)')
      .eq('investor_auth_id', userId)
      .order('created_at', { ascending: false })
      .limit(6);
    if (error) throw error;
    return (data || []).map((row: any) => mapProject(row, 'saved-'));
  } catch (error) {
    console.warn('Saved projects unavailable:', error);
    return [];
  }
}

async function loadContacted(userId: string) {
  try {
    const { data, error } = await supabaseBrowser
      .from('investor_contacted_projects')
      .select('id,project_id,project_snapshot,created_at,projects(*)')
      .eq('investor_auth_id', userId)
      .order('created_at', { ascending: false })
      .limit(6);
    if (error) throw error;
    return (data || []).map((row: any) => mapProject(row, 'contacted-'));
  } catch (primaryError) {
    try {
      const { data, error } = await supabaseBrowser
        .from('conversations')
        .select('id,project_id,last_message_at,projects(*)')
        .eq('buyer_id', userId)
        .order('last_message_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data || []).map((row: any) => mapProject(row, 'conversation-'));
    } catch (fallbackError) {
      console.warn('Contacted projects unavailable:', primaryError, fallbackError);
      return [];
    }
  }
}

async function loadPreferences(userId: string) {
  try {
    const { data } = await supabaseBrowser
      .from('users')
      .select('subscription_status,budget_min,budget_max,preferred_location,preferred_categories,investor_preferences')
      .eq('auth_id', userId)
      .maybeSingle();
    return data as any;
  } catch (error) {
    console.warn('Investor preferences unavailable:', error);
    return null;
  }
}

export function InvestorActivity({ userId, country, lang }: { userId: string; country: string; lang: string }) {
  const isAr = lang === 'ar';
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<Item[]>([]);
  const [contacted, setContacted] = useState<Item[]>([]);
  const [preferences, setPreferences] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      const [savedRows, contactedRows, prefs] = await Promise.all([loadSaved(userId), loadContacted(userId), loadPreferences(userId)]);
      if (!mounted) return;
      setSaved(savedRows);
      setContacted(contactedRows);
      setPreferences(prefs);
      setLoading(false);
    }
    run();
    return () => { mounted = false; };
  }, [userId]);

  const budget = useMemo(() => {
    const min = Number(preferences?.budget_min || 0);
    const max = Number(preferences?.budget_max || 0);
    if (!min && !max) return isAr ? 'غير محدد' : 'Not set';
    return `${formatMoney(min, lang)} - ${formatMoney(max, lang)}`;
  }, [preferences, lang, isAr]);

  return (
    <section className="rounded-[2.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-950">{isAr ? 'مركز المستثمر' : 'Investor center'}</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">{isAr ? 'محفوظاتك، تواصلاتك، وتفضيلات الترشيح الذكي.' : 'Saved opportunities, contacted projects, and matching preferences.'}</p>
        </div>
        <Link href={`/${country}/${lang}/opportunities`} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 font-black text-white">
          <Search size={18} /> {isAr ? 'تصفح الفرص' : 'Browse'}
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MiniPanel icon={Bookmark} label={isAr ? 'المحفوظة' : 'Saved'} value={saved.length} />
        <MiniPanel icon={MessageCircle} label={isAr ? 'تم التواصل' : 'Contacted'} value={contacted.length} />
        <MiniPanel icon={Sparkles} label={isAr ? 'حالة الاشتراك' : 'Plan'} value={preferences?.subscription_status || 'free'} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_320px]">
        <ActivityList title={isAr ? 'المشاريع المحفوظة' : 'Saved projects'} empty={isAr ? 'لم تحفظ أي مشروع بعد.' : 'No saved projects yet.'} items={saved} country={country} lang={lang} loading={loading} />
        <ActivityList title={isAr ? 'المشاريع التي تواصلت معها' : 'Contacted projects'} empty={isAr ? 'لا توجد طلبات تواصل بعد.' : 'No contact requests yet.'} items={contacted} country={country} lang={lang} loading={loading} />
        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
          <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-800"><Wallet size={20} /></div>
          <h3 className="text-lg font-black text-slate-950">{isAr ? 'تفضيلات الترشيح' : 'Matching preferences'}</h3>
          <div className="mt-4 space-y-3 text-sm font-bold text-slate-600">
            <p><span className="text-slate-950">{isAr ? 'الميزانية:' : 'Budget:'}</span> {budget}</p>
            <p><span className="text-slate-950">{isAr ? 'الموقع:' : 'Location:'}</span> {preferences?.preferred_location || (isAr ? 'غير محدد' : 'Not set')}</p>
            <p><span className="text-slate-950">{isAr ? 'القطاعات:' : 'Sectors:'}</span> {Array.isArray(preferences?.preferred_categories) && preferences.preferred_categories.length ? preferences.preferred_categories.join('، ') : (isAr ? 'غير محدد' : 'Not set')}</p>
          </div>
          <Link href={`/${country}/${lang}/verification`} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-3 font-black text-emerald-900">
            <CheckCircle2 size={18} /> {isAr ? 'التوثيق والترقية' : 'Verify account'}
          </Link>
        </div>
      </div>
    </section>
  );
}

function MiniPanel({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
      <Icon className="text-emerald-700" size={22} />
      <p className="mt-3 text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function ActivityList({ title, empty, items, country, lang, loading }: { title: string; empty: string; items: Item[]; country: string; lang: string; loading: boolean }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-lg font-black text-slate-950">{title}</h3>
      {loading ? (
        <div className="grid place-items-center rounded-2xl bg-slate-50 p-8 text-slate-500"><Loader2 className="animate-spin" /></div>
      ) : items.length ? (
        <div className="space-y-3">
          {items.map((item) => <SmallProject key={item.id} item={item} country={country} lang={lang} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">{empty}</div>
      )}
    </div>
  );
}

function SmallProject({ item, country, lang }: { item: Item; country: string; lang: string }) {
  return (
    <Link href={`/${country}/${lang}/project/${encodeURIComponent(item.slug || item.projectId)}`} className="flex gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-emerald-200 hover:bg-emerald-50/40">
      <img src={item.image} alt={item.title} className="h-20 w-20 rounded-2xl object-cover" />
      <div className="min-w-0 flex-1">
        <h4 className="line-clamp-1 font-black text-slate-950">{item.title}</h4>
        <p className="mt-1 text-xs font-bold text-slate-500">{item.city || '—'}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-black text-emerald-800">
          <span>{formatMoney(item.price, lang)}</span>
          <span className="inline-flex items-center gap-1"><TrendingUp size={13} /> {item.roi || 0}%</span>
        </div>
      </div>
    </Link>
  );
}
