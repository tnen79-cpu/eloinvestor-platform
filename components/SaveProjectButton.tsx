'use client';

import { useEffect, useState } from 'react';
import { Bookmark, Loader2 } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type Props = {
  projectId: string;
  project: Record<string, unknown>;
  lang: string;
  country: string;
  className?: string;
};

export function SaveProjectButton({ projectId, project, lang, country, className }: Props) {
  const isAr = lang === 'ar';
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data } = await supabaseBrowser.auth.getUser();
      const user = data.user;
      if (!mounted || !user) return;
      setUserId(user.id);
      try {
        const { data: row } = await supabaseBrowser
          .from('investor_saved_projects')
          .select('id')
          .eq('investor_auth_id', user.id)
          .eq('project_id', projectId)
          .maybeSingle();
        if (mounted) setSaved(Boolean(row));
      } catch (error) {
        console.warn('Saved state unavailable:', error);
      }
    }
    load();
    return () => { mounted = false; };
  }, [projectId]);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    try {
      let nextUserId = userId;
      if (!nextUserId) {
        const { data } = await supabaseBrowser.auth.getUser();
        nextUserId = data.user?.id || '';
        setUserId(nextUserId);
      }
      if (!nextUserId) {
        window.location.href = `/${country}/${lang}/login`;
        return;
      }

      if (saved) {
        const { error, data: removed } = await supabaseBrowser
          .from('investor_saved_projects')
          .delete()
          .eq('investor_auth_id', nextUserId)
          .eq('project_id', projectId).select('id');
        if (error) throw error;
        if(!removed?.length)throw new Error(isAr?'المشروع تغيّر أو لم تتم إزالته. أعد تحميل البيانات.':'Project changed or was not removed. Reload first.');
        setSaved(false);
      } else {
        const { error } = await supabaseBrowser
          .from('investor_saved_projects')
          .upsert({ investor_auth_id: nextUserId, project_id: projectId, project_snapshot: project }, { onConflict: 'investor_auth_id,project_id', ignoreDuplicates: true });
        if (error) throw error;
        setSaved(true);
      }
    } catch (error) {
      console.warn('Save project failed:', error);
      alert(isAr ? 'تعذر حفظ المشروع. تأكد من تشغيل جدول المحفوظات في Supabase.' : 'Could not save project. Check the saved projects table.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={toggle} disabled={loading} className={className || `project-soft-btn-v34 ${saved ? 'is-saved' : ''}`}>
      {loading ? <Loader2 className="animate-spin" size={16} /> : <Bookmark size={16} className={saved ? 'fill-current' : ''} />}
      {saved ? (isAr ? 'محفوظ' : 'Saved') : (isAr ? 'حفظ' : 'Save')}
    </button>
  );
}
