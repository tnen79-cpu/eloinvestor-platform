'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Building2, CheckCircle2, Clock3, FileUp, Loader2, ShieldCheck, UserCheck } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type ProjectOption = { id: string; title: string; status?: string };
type VerificationRow = {
  id: string;
  request_type?: string | null;
  type?: string | null;
  project_id?: string | null;
  status: string;
  admin_note?: string | null;
  document_url?: string | null;
  created_at?: string | null;
};

function statusMeta(status: string, isAr: boolean) {
  const normalized = String(status || 'pending').toLowerCase();
  if (['approved', 'accepted'].includes(normalized)) return { label: isAr ? 'مقبول' : 'Approved', cls: 'bg-blue-50 text-blue-700 ring-blue-100', icon: CheckCircle2 };
  if (['rejected', 'declined'].includes(normalized)) return { label: isAr ? 'مرفوض' : 'Rejected', cls: 'bg-red-50 text-red-700 ring-red-100', icon: AlertCircle };
  if (['revision', 'needs_revision'].includes(normalized)) return { label: isAr ? 'يحتاج تعديل' : 'Needs revision', cls: 'bg-orange-50 text-orange-700 ring-orange-100', icon: AlertCircle };
  return { label: isAr ? 'قيد المراجعة' : 'Pending review', cls: 'bg-amber-50 text-amber-700 ring-amber-100', icon: Clock3 };
}

function safeFileName(file: File) {
  const ext = file.name.split('.').pop() || 'file';
  return `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

export function VerificationCenter({ country, lang }: { country: string; lang: string }) {
  const router = useRouter();
  const isAr = lang === 'ar';
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [requests, setRequests] = useState<VerificationRow[]>([]);
  const [requestType, setRequestType] = useState<'project' | 'investor'>('project');
  const [projectId, setProjectId] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setMessage('');
    const { data: authData } = await supabaseBrowser.auth.getUser();
    const authUser = authData.user;
    if (!authUser) {
      router.push(`/${country}/${lang}/login`);
      return;
    }
    setUser(authUser);

    const { data: projectRows, error: projectError } = await supabaseBrowser
      .from('projects')
      .select('id,title,status,user_id,country_code')
      .eq('user_id', authUser.id)
      .limit(100);

    if (projectError) console.warn('Projects load failed:', projectError);

    const projectList = (projectRows || []).map((row: any) => ({
      id: String(row.id),
      title: String(row.title || 'مشروع بدون عنوان'),
      status: String(row.status || ''),
    }));
    setProjects(projectList);
    if (!projectId && projectList[0]) setProjectId(projectList[0].id);

    const { data: requestData, error } = await supabaseBrowser
      .from('verification_requests')
      .select('*')
      .eq('user_auth_id', authUser.id)
      .order('created_at', { ascending: false });

    if (error) console.warn('Verification requests load failed:', error);
    setRequests((requestData || []) as any);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, lang]);

  const currentProject = useMemo(() => projects.find((item) => item.id === projectId), [projects, projectId]);

  async function uploadFile(authUserId: string) {
    if (!file) return '';
    const path = `${authUserId}/${requestType}/${safeFileName(file)}`;
    const { error } = await supabaseBrowser.storage.from('verification-files').upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = supabaseBrowser.storage.from('verification-files').getPublicUrl(path);
    return data.publicUrl || path;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    if (!user) return;
    if (requestType === 'project' && !projectId) {
      setMessage(isAr ? 'اختر المشروع المراد توثيقه.' : 'Select a project to verify.');
      return;
    }
    if (!file) {
      setMessage(isAr ? 'ارفع ملف التوثيق أولًا.' : 'Upload a verification document first.');
      return;
    }

    setSubmitting(true);
    try {
      const documentUrl = await uploadFile(user.id);
      const payload = {
        user_auth_id: user.id,
        request_type: requestType,
        type: requestType,
        project_id: requestType === 'project' ? projectId : null,
        project_title: requestType === 'project' ? currentProject?.title || '' : '',
        status: 'pending',
        document_url: documentUrl,
        document_type: file?.type || '',
        note,
        notes: note,
        country_code: country.toLowerCase(),
      };
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token || '';
      const response = await fetch('/api/trust/verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          requestType,
          projectId: requestType === 'project' ? projectId : null,
          projectTitle: requestType === 'project' ? currentProject?.title || '' : '',
          documentUrl,
          documentType: file?.type || '',
          note,
          country: country.toLowerCase(),
        }),
      });
      const apiPayload = await response.json().catch(() => ({}));
      if (!response.ok || !apiPayload.ok) throw new Error(apiPayload.error || (isAr ? 'تعذر إرسال طلب التوثيق.' : 'Failed to submit verification request.'));
      setMessage(isAr ? 'تم إرسال طلب التوثيق بنجاح.' : 'Verification request submitted.');
      setFile(null);
      setNote('');
      await load();
    } catch (error: any) {
      setMessage(error?.message || (isAr ? 'حدث خطأ أثناء إرسال الطلب.' : 'Failed to submit request.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl rounded-[2rem] bg-white p-8 text-center shadow-sm">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-700" />
        <p className="mt-4 font-black text-slate-700">{isAr ? 'جاري تحميل مركز التوثيق...' : 'Loading verification center...'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-800 ring-1 ring-blue-100">
              <ShieldCheck className="h-4 w-4" /> {isAr ? 'مركز التوثيق' : 'Verification Center'}
            </span>
            <h1 className="mt-4 text-3xl font-black text-slate-950 md:text-5xl">{isAr ? 'وثّق مشروعك أو حسابك' : 'Verify your project or account'}</h1>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-slate-500 md:text-base">
              {isAr ? 'ارفع مستندات المشروع أو إثبات الجدية المالية للمستثمر. ستراجع الإدارة الطلب وتظهر الشارات بعد الموافقة.' : 'Upload project documents or investor proof. Admins will review your request and verification badges will appear after approval.'}
            </p>
          </div>
          <Link href={`/${country}/${lang}/dashboard`} className="rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-black text-white">{isAr ? 'لوحة التحكم' : 'Dashboard'}</Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <form onSubmit={submit} className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-black text-slate-950">{isAr ? 'طلب توثيق جديد' : 'New verification request'}</h2>
          {message ? <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800 ring-1 ring-amber-100">{message}</div> : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <button type="button" onClick={() => setRequestType('project')} className={`rounded-[1.5rem] border p-5 text-start transition ${requestType === 'project' ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-600'}`}>
              <Building2 className="h-6 w-6" />
              <p className="mt-3 font-black">{isAr ? 'توثيق مشروع' : 'Project verification'}</p>
              <p className="mt-1 text-xs font-bold opacity-70">{isAr ? 'سجل تجاري / إثبات ملكية / مستندات المشروع' : 'CR / ownership proof / project documents'}</p>
            </button>
            <button type="button" onClick={() => setRequestType('investor')} className={`rounded-[1.5rem] border p-5 text-start transition ${requestType === 'investor' ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-600'}`}>
              <UserCheck className="h-6 w-6" />
              <p className="mt-3 font-black">{isAr ? 'توثيق مستثمر' : 'Investor verification'}</p>
              <p className="mt-1 text-xs font-bold opacity-70">{isAr ? 'هوية / إثبات مالي / كشف حساب' : 'ID / proof of funds / bank statement'}</p>
            </button>
          </div>

          {requestType === 'project' && (
            <label className="mt-6 block">
              <span className="text-sm font-black text-slate-700">{isAr ? 'اختر المشروع' : 'Select project'}</span>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 font-bold outline-none focus:border-blue-500">
                {projects.length ? projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>) : <option value="">{isAr ? 'لا توجد مشاريع' : 'No projects'}</option>}
              </select>
            </label>
          )}

          <label className="mt-6 block">
            <span className="text-sm font-black text-slate-700">{isAr ? 'ملف التوثيق' : 'Verification file'}</span>
            <div className="mt-2 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <FileUp className="mx-auto h-8 w-8 text-blue-700" />
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-4 w-full rounded-2xl bg-white p-3 text-sm font-bold" accept=".pdf,.png,.jpg,.jpeg,.webp" />
              <p className="mt-2 text-xs font-bold text-slate-500">PDF, JPG, PNG, WEBP</p>
            </div>
          </label>

          <label className="mt-6 block">
            <span className="text-sm font-black text-slate-700">{isAr ? 'ملاحظات اختيارية' : 'Optional notes'}</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-2 min-h-32 w-full rounded-2xl border border-slate-200 bg-white p-4 font-bold outline-none focus:border-blue-500" placeholder={isAr ? 'اكتب أي ملاحظة تساعد الإدارة على مراجعة الطلب...' : 'Add notes for admin review...'} />
          </label>

          <button disabled={submitting} className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-6 font-black text-white shadow-lg shadow-blue-900/10 disabled:opacity-60">
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
            {isAr ? 'إرسال طلب التوثيق' : 'Submit verification request'}
          </button>
        </form>

        <aside className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-black text-slate-950">{isAr ? 'طلباتي' : 'My requests'}</h2>
          <div className="mt-5 space-y-3">
            {requests.length ? requests.map((request) => {
              const meta = statusMeta(request.status, isAr);
              return (
                <div key={request.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-slate-900">{request.request_type === 'project' ? (isAr ? 'توثيق مشروع' : 'Project') : (isAr ? 'توثيق مستثمر' : 'Investor')}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ring-1 ${meta.cls}`}><meta.icon className="h-4 w-4" /> {meta.label}</span>
                  </div>
                  {request.admin_note ? <p className="mt-3 text-xs font-bold leading-6 text-slate-500">{request.admin_note}</p> : null}
                  {request.document_url ? <a href={request.document_url} target="_blank" className="mt-3 inline-flex text-xs font-black text-blue-700" rel="noreferrer">{isAr ? 'عرض الملف' : 'View file'}</a> : null}
                </div>
              );
            }) : <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">{isAr ? 'لا توجد طلبات توثيق بعد.' : 'No verification requests yet.'}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
