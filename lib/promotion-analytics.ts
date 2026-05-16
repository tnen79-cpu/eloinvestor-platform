'use client';

import { supabaseBrowser } from '@/lib/supabase-browser';

type PromotionMetric = 'view' | 'click' | 'contact';

async function incrementAtomicFallback(projectId: string, metric: PromotionMetric) {
  const { error } = await supabaseBrowser.rpc('increment_active_promotion_metric_atomic', {
    p_project_id: projectId,
    metric_name: metric,
  });
  if (error) {
    console.warn('Promotion analytics atomic fallback skipped:', error.message);
  }
}

export async function trackPromotionMetric(projectId?: string | null, metric?: PromotionMetric) {
  if (!projectId || !metric) return;
  try {
    const { error } = await supabaseBrowser.rpc('increment_active_promotion_metric', {
      p_project_id: projectId,
      metric_name: metric,
    });
    if (error) await incrementAtomicFallback(projectId, metric);
  } catch (error) {
    console.warn('Promotion analytics RPC skipped, using atomic fallback:', error);
    await incrementAtomicFallback(projectId, metric);
  }
}
