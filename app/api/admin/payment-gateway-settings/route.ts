import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('UNAUTHENTICATED');
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) throw new Error('UNAUTHENTICATED');
  const user = userData.user;
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id,auth_id,email,role,admin_role,is_admin,admin_status,admin_permissions')
    .or(`auth_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle();
  const role = String((profile as any)?.admin_role || (profile as any)?.role || user.user_metadata?.admin_role || user.user_metadata?.role || '').toLowerCase();
  const status = String((profile as any)?.admin_status || 'active').toLowerCase();
  const allowed = ((profile as any)?.is_admin === true || ['admin', 'super_admin', 'finance_admin'].includes(role)) && !['suspended', 'revoked', 'inactive'].includes(status);
  if (!allowed) throw new Error('FORBIDDEN');
  return user;
}

function sanitize(row: any, origin = '') {
  const webhook = row?.webhook_url || (origin ? `${origin}/api/payments/thawani/webhook` : '');
  return {
    provider: row?.provider || 'thawani',
    is_enabled: row?.is_enabled !== false,
    mode: row?.mode || 'test',
    base_url: row?.base_url || 'https://uatcheckout.thawani.om/api/v1',
    checkout_url: row?.checkout_url || 'https://uatcheckout.thawani.om',
    publishable_key: row?.publishable_key || '',
    secret_key: '',
    webhook_url: webhook,
    has_secret_key: Boolean(row?.secret_key),
    updated_at: row?.updated_at || null,
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const provider = request.nextUrl.searchParams.get('provider') || 'thawani';
    const { data, error } = await supabaseAdmin.from('payment_gateway_settings').select('*').eq('provider', provider).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ settings: sanitize(data || { provider }, request.nextUrl.origin) });
  } catch (error: any) {
    const message = error?.message || 'PAYMENT_SETTINGS_GET_FAILED';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    const provider = String(body?.provider || body?.settings?.provider || 'thawani').toLowerCase();
    const settings = body?.settings || {};
    const { data: existing } = await supabaseAdmin.from('payment_gateway_settings').select('*').eq('provider', provider).maybeSingle();
    const mode = settings.mode === 'live' ? 'live' : 'test';
    const payload: any = {
      provider,
      is_enabled: settings.is_enabled !== false,
      mode,
      base_url: String(settings.base_url || (mode === 'live' ? 'https://checkout.thawani.om/api/v1' : 'https://uatcheckout.thawani.om/api/v1')).replace(/\/$/, ''),
      checkout_url: String(settings.checkout_url || (mode === 'live' ? 'https://checkout.thawani.om' : 'https://uatcheckout.thawani.om')).replace(/\/$/, ''),
      publishable_key: String(settings.publishable_key || ''),
      webhook_url: String(settings.webhook_url || `${request.nextUrl.origin}/api/payments/thawani/webhook`),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };
    const secret = String(settings.secret_key || '').trim();
    if (secret) payload.secret_key = secret;
    else if (existing?.secret_key) payload.secret_key = existing.secret_key;

    const { data, error } = await supabaseAdmin.from('payment_gateway_settings').upsert(payload, { onConflict: 'provider' }).select('*').single();
    if (error) throw error;
    try {
      await supabaseAdmin.from('admin_action_logs').insert({ admin_auth_id: user.id, action: 'save_payment_gateway_settings', target_type: 'payment_gateway_settings', target_id: provider, details: { mode: payload.mode, is_enabled: payload.is_enabled } });
    } catch {
      // لا نوقف حفظ الإعدادات إذا فشل تسجيل نشاط الإدارة.
    }
    return NextResponse.json({ settings: sanitize(data, request.nextUrl.origin) });
  } catch (error: any) {
    const message = error?.message || 'PAYMENT_SETTINGS_SAVE_FAILED';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 500 });
  }
}
