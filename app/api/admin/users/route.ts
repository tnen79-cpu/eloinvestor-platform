import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';
import { getSupabaseUserFromBearer } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'elo_admin_session';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSecret() { return process.env.ADMIN_PANEL_PASSWORD || process.env.ADMIN_ACCESS_PASSWORD || ''; }
function sign(value: string) { const secret = getSecret(); return secret ? createHmac('sha256', secret).update(value).digest('hex') : ''; }
function validAdminCookie(raw: string | undefined) {
  const secret = getSecret();
  if (!secret || !raw) return false;
  const [value, sig] = raw.split('.');
  if (!value || !sig) return false;
  try { return timingSafeEqual(Buffer.from(sig), Buffer.from(sign(value))); } catch { return false; }
}
function isAdminish(row: any) {
  const role = String(row?.admin_role || row?.role || row?.account_type || '').trim().toLowerCase();
  const status = String(row?.admin_status || 'active').trim().toLowerCase();
  return (row?.is_admin === true || ['admin', 'super_admin', 'verification_admin', 'content_admin', 'finance_admin', 'support_admin'].includes(role)) && !['suspended', 'revoked', 'inactive', 'blocked'].includes(status);
}
async function allowedBySupabase(request: NextRequest, db: any) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;
  const { user } = await getSupabaseUserFromBearer(token);
  if (!user) return false;
  const rows: any[] = [];
  async function collect(query: any) { const { data, error } = await query; if (!error && Array.isArray(data)) rows.push(...data); }
  await collect(db.from('users').select('*').eq('auth_id', user.id).limit(5));
  await collect(db.from('users').select('*').eq('id', user.id).limit(5));
  if (user.email) await collect(db.from('users').select('*').ilike('email', user.email).limit(5));
  if (user.phone) await collect(db.from('users').select('*').eq('phone', user.phone).limit(5));
  return rows.some(isAdminish);
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY_MISSING' }, { status: 500 });
    const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const cookieOk = validAdminCookie(request.cookies.get(COOKIE_NAME)?.value);
    const supabaseOk = cookieOk ? false : await allowedBySupabase(request, db).catch(() => false);
    if (!cookieOk && !supabaseOk) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
    const { data, error } = await db.from('users').select('*').order('created_at', { ascending: false }).limit(1000);
    if (error) throw error;
    return NextResponse.json({ ok: true, users: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ADMIN_USERS_FAILED';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
