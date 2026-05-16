import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getThawaniConfig } from '@/lib/thawani';

async function requireAdmin(request: NextRequest) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('UNAUTHENTICATED');
  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData.user) throw new Error('UNAUTHENTICATED');
  const user = userData.user;
  const { data: profile } = await supabaseAdmin.from('users').select('role,admin_role,is_admin,admin_status').or(`auth_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email}`).maybeSingle();
  const role = String((profile as any)?.admin_role || (profile as any)?.role || user.user_metadata?.role || '').toLowerCase();
  const status = String((profile as any)?.admin_status || 'active').toLowerCase();
  if (!((profile as any)?.is_admin === true || ['admin', 'super_admin', 'finance_admin'].includes(role)) || ['suspended', 'revoked', 'inactive'].includes(status)) throw new Error('FORBIDDEN');
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const config = await getThawaniConfig();
    const response = await fetch(`${config.baseUrl}/checkout/session/not-real-test-id`, { headers: { 'thawani-api-key': config.secretKey }, cache: 'no-store' });
    if (response.status === 401 || response.status === 403) return NextResponse.json({ error: 'المفتاح السري غير صحيح أو غير مسموح.' }, { status: 400 });
    return NextResponse.json({ ok: true, message: 'تم الوصول إلى Thawani. حتى لو كان Session التجربة غير موجود، المفاتيح والرابط يعملان.' });
  } catch (error: any) {
    const message = error?.message || 'PAYMENT_SETTINGS_TEST_FAILED';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 500 });
  }
}
