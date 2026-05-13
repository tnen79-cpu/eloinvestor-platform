'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, FileText, Loader2, LockKeyhole, RefreshCcw, Search, ShieldCheck, XCircle } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { isAdminRole } from '@/lib/account';

type VerificationRow = {
  id: string;
  user_auth_id: string;
  request_type?: string | null;
  type?: string | null;
  project_id?: string | null;
  project_title?: string | null;
  status: string;
  document_url?: string | null;
  note?: string | null;
  notes?: string | null;
  admin_note?: string | null;
  country_code?: string | null;
  created_at?: string | null;
};

function statusMeta(status: string) {
  const s = String(status || 'pending').toLowerCase();
  if (s === 'approved') return { label: 'مقبول', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-100', icon: CheckCircle2 };
  if (s === 'rejected') return { label: 'مرفوض', cls: 'bg-red-50 text-red-700 ring-red-100', icon: XCircle };
  if (['revision', 'needs_revision'].includes(s)) return { label: 'يحتاج تعديل', cls: 'bg-orange-50 text-orange-700 ring-orange-100', icon: AlertCircle };
  return { label: 'قيد المراجعة', cls: 'bg-amber-50 text-amber-700 ring-amber-100', icon: Clock3 };
}

export function AdminVerifications() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [items, setItems] = useState<VerificationRow[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [notice, setNotice] = useState('');

  async function checkAdmin() {
    const { data } = await supabaseBrowser.auth.getUser();
    const user = data.user;
    if (!user) return false;
    const { data: profile } = await supabaseBrowser
      .from('users')
      .select('role,account_type,email')
      .or(`auth_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle();
    const role = String((profile as any)?.role || (profile as any)?.account_type || user.user_metadata?.role || '').toLowerCase();
    return isAdminRole(role);
  }

  async function load() {
    setLoading(true);
    setNotice('');
    const ok = await checkAdmin();
    if (!ok) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }
    const { data, error } = await supabaseBrowser
      .from('verification_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) setNotice(error.message);
    setItems((data || []) as any);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchStatus = status === 'all' || String(item.status || 'pending') === status;
      const text = [item.request_type || item.type, item.project_title, item.country_code, item.note, item.notes, item.admin_note].join(' ').toLowerCase();
      return matchStatus && (!q || text.includes(q));
    });
  }, [items, query, status]);

  async function updateRequest(item: VerificationRow, nextStatus: string) {
    const admin_note = prompt('ملاحظة الإدارة (اختياري):', item.admin_note || '') || '';
    setSaving(true);
    setNotice('');
    const { error } = await supabaseBrowser
      .from('verification_requests')
      .update({ status: nextStatus, admin_note, reviewed_at: new Date().toISOString() })
      .eq('id', item.id);

    if (error) {
      setNotice(error.message);
      setSaving(false);
      return;
    }

    if (nextStatus === 'approved') {
      if ((item.request_type || item.type) === 'project' && item.project_id) {
        await supabaseBrowser.from('projects').update({ is_verified: true, verification_status: 'approved' }).eq('id', item.project_id);
      }
      if (item.request_type === 'investor' && item.user_auth_id) {
        await supabaseBrowser.from('users').update({ is_verified: true, verification_status: 'approved' }).or(`auth_id.eq.${item.user_auth_id},id.eq.${item.user_auth_id}`);
      }
    }

    setSaving(false);
    await load();
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div>;
  if (accessDenied) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white" dir="rtl">
        <div className="max-w-lg rounded-[2rem] bg-white/10 p-8 text-center backdrop-blur">
          <LockKeyhole className="mx-auto h-12 w-12 text-amber-300" />
          <h1 className="mt-4 text-3xl font-black">صلاحية الإدارة مطلوبة</h1>
          <Link href="/om/ar/login" className="mt-6 inline-flex rounded-full bg-emerald-500 px-6 py-3 font-black text-slate-950">تسجيل الدخول</Link>
        </div>
      </div>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-emerald-600">EloInvestor Admin</p>
            <h1 className="mt-1 text-3xl font-black md:text-4xl">طلبات التوثيق</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">مراجعة توثيق المشاريع والمستثمرين.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={load} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-200"><RefreshCcw className="h-4 w-4" /> تحديث</button>
            <Link href="/admin" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white">لوحة الإدارة</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6">
        {notice ? <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">{notice}</div> : null}
        {saving ? <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm"><Loader2 className="h-4 w-4 animate-spin" /> جاري الحفظ...</div> : null}

        <div className="mb-5 flex flex-col gap-3 rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث في الطلبات..." className="h-12 w-full rounded-full border border-slate-200 bg-white pr-10 pl-4 text-sm font-bold outline-none focus:border-emerald-500" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-12 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-emerald-500">
            <option value="all">كل الحالات</option>
            <option value="pending">قيد المراجعة</option>
            <option value="approved">مقبول</option>
            <option value="rejected">مرفوض</option>
            <option value="revision">يحتاج تعديل</option>
          </select>
        </div>

        <div className="grid gap-4">
          {filtered.length ? filtered.map((item) => {
            const meta = statusMeta(item.status);
            return (
              <article key={item.id} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ring-1 ${meta.cls}`}><meta.icon className="h-4 w-4" /> {meta.label}</span>
                    <h2 className="mt-3 text-xl font-black text-slate-950">{(item.request_type || item.type) === 'project' ? 'توثيق مشروع' : 'توثيق مستثمر'} {item.project_title ? `— ${item.project_title}` : ''}</h2>
                    <p className="mt-2 text-sm font-bold text-slate-500">الدولة: {item.country_code || '—'} · المستخدم: {item.user_auth_id}</p>
                    {(item.note || item.notes) ? <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-600">{item.note || item.notes}</p> : null}
                    {item.admin_note ? <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">ملاحظة الإدارة: {item.admin_note}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.document_url ? <a href={item.document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"><FileText className="h-4 w-4" /> الملف</a> : null}
                    <button onClick={() => updateRequest(item, 'approved')} className="rounded-full bg-emerald-600 px-4 py-3 text-sm font-black text-white">قبول</button>
                    <button onClick={() => updateRequest(item, 'revision')} className="rounded-full bg-amber-100 px-4 py-3 text-sm font-black text-amber-800">طلب تعديل</button>
                    <button onClick={() => updateRequest(item, 'rejected')} className="rounded-full bg-red-100 px-4 py-3 text-sm font-black text-red-700">رفض</button>
                  </div>
                </div>
              </article>
            );
          }) : <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center font-black text-slate-500">لا توجد طلبات توثيق.</div>}
        </div>
      </section>
    </main>
  );
}
