import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUserFromBearer } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function isAdminish(row: any) {
  const role = String(row?.admin_role || row?.role || row?.account_type || '').trim().toLowerCase();
  const status = String(row?.admin_status || 'active').trim().toLowerCase();
  return (row?.is_admin === true || ['admin', 'super_admin', 'verification_admin', 'content_admin', 'finance_admin', 'support_admin'].includes(role)) && !['suspended', 'revoked', 'inactive', 'blocked'].includes(status);
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY_MISSING' }, { status: 500 });
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const { user, error } = await getSupabaseUserFromBearer(token);
    if (!user || error) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });

    const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const rows: any[] = [];
    async function collect(query: any) {
      const { data, error } = await query;
      if (!error && Array.isArray(data)) rows.push(...data);
    }
    await collect(db.from('users').select('*').eq('auth_id', user.id).limit(5));
    await collect(db.from('users').select('*').eq('id', user.id).limit(5));
    if (user.email) await collect(db.from('users').select('*').ilike('email', user.email).limit(5));
    if (user.phone) await collect(db.from('users').select('*').eq('phone', user.phone).limit(5));

    const unique = new Map<string, any>();
    for (const row of rows) unique.set(String(row.id || row.auth_id || row.email || Math.random()), row);
    const profile = [...unique.values()].find(isAdminish) || null;
    return NextResponse.json({ ok: true, allowed: !!profile, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ADMIN_CHECK_FAILED';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
