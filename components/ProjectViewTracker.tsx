'use client';

import { useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { trackPromotionMetric } from '@/lib/promotion-analytics';

export function ProjectViewTracker({ projectId, isSponsored = false }: { projectId?: string; isSponsored?: boolean }) {
  useEffect(() => {
    if (!projectId) return;

    const projectViewKey = `elo-view-${projectId}`;
    const promotionViewKey = `elo-promo-view-${projectId}`;

    async function trackPromotionView() {
      if (!isSponsored) return;
      if (typeof window !== 'undefined' && sessionStorage.getItem(promotionViewKey)) return;
      try {
        await trackPromotionMetric(projectId, 'view');
        if (typeof window !== 'undefined') sessionStorage.setItem(promotionViewKey, '1');
      } catch (error) {
        console.warn('Promotion view tracking skipped:', error);
      }
    }

    async function trackProjectView() {
      if (typeof window !== 'undefined' && sessionStorage.getItem(projectViewKey)) return;
      try {
        const { data: sessionData } = await supabaseBrowser.auth.getSession();
        await fetch('/api/projects/view', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
          },
          body: JSON.stringify({ projectId }),
        });
        if (typeof window !== 'undefined') sessionStorage.setItem(projectViewKey, '1');
      } catch (error) {
        console.warn('Project view tracking skipped:', error);
      }
    }

    void trackPromotionView();
    void trackProjectView();
  }, [projectId, isSponsored]);

  return null;
}
