'use client';

import { useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function ProjectViewTracker({ projectId }: { projectId?: string }) {
  useEffect(() => {
    if (!projectId) return;
    const key = `elo-view-${projectId}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(key)) return;
    if (typeof window !== 'undefined') sessionStorage.setItem(key, '1');

    async function track() {
      try {
        const { data } = await supabaseBrowser.auth.getUser();
        const viewerId = data.user?.id || null;
        await supabaseBrowser.from('project_views_log').insert({ project_id: projectId, viewer_id: viewerId });
        const { data: current } = await supabaseBrowser.from('projects').select('views_count,views').eq('id', projectId).maybeSingle();
        const next = Number((current as any)?.views_count ?? (current as any)?.views ?? 0) + 1;
        await supabaseBrowser.from('projects').update({ views_count: next, views: next }).eq('id', projectId);
      } catch (error) {
        console.warn('Project view tracking skipped:', error);
      }
    }
    void track();
  }, [projectId]);

  return null;
}
