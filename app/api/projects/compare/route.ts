import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { normalizeComparisonIds } from '@/lib/marketplace-math';
export async function GET(req: NextRequest) {
  const ids = normalizeComparisonIds(req.nextUrl.searchParams.get('ids')?.split(','));
  const country = req.nextUrl.searchParams.get('country') || 'om';
  if (!ids.length || !/^[a-z]{2}$/.test(country)) return NextResponse.json({ error: 'Invalid comparison' }, { status: 400 });
  const { data, error } = await supabase.from('projects').select('id,slug,title,title_ar,title_en,price,monthly_profit,roi,city,category,is_verified,verification_status,country_code').in('id', ids).eq('country_code', country).in('status', ['approved','active','published']).or('is_active.eq.true,is_active.is.null');
  if (error) return NextResponse.json({ error: 'تعذر تحميل المقارنة. أعد المحاولة.' }, { status: 503 });
  return NextResponse.json({ projects: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
}
