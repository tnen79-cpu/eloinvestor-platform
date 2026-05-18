import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyFirebaseIdToken } from '@/lib/firebase-server';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function isAdminish(row: any) {
  const role = String(row?.admin_role || row?.role || row?.account_type || '').trim().toLowerCase();
  const status = String(row?.admin_status || 'active').trim().toLowerCase();
  return (row?.is_admin === true || ['admin', 'super_admin', 'verification_admin', 'content_admin', 'finance_admin', 'support_admin'].includes(role)) && !['suspended', 'revoked', 'inactive', 'blocked'].includes(status);
}

async function safeCollect(query: any, bucket: any[]) {
  const { data, error } = await query;
  if (!error && Array.isArray(data)) bucket.push(...data);
  if (!error && data && !Array.isArray(data)) bucket.push(data);
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ ok: false, allowed: false, error: 'SERVER_ENV_MISSING' }, { status: 500 });
    }

    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const firebaseUser = await verifyFirebaseIdToken(token);
    if (!firebaseUser) {
      return NextResponse.json({ ok: false, allowed: false, error: 'INVALID_FIREBASE_SESSION' }, { status: 401 });
    }

    const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const uid = String(firebaseUser.uid || firebaseUser.id || '').trim();
    const email = String(firebaseUser.email || '').trim().toLowerCase();
    const phone = String(firebaseUser.phone || '').trim();
    const rows: any[] = [];

    if (uid) await safeCollect(db.from('users').select('*').eq('firebase_uid', uid).limit(20), rows);
    if (email) {
      await safeCollect(db.from('users').select('*').eq('email', email).limit(20), rows);
      await safeCollect(db.from('users').select('*').ilike('email', email).limit(20), rows);
    }
    if (phone) await safeCollect(db.from('users').select('*').eq('phone', phone).limit(20), rows);

    const unique = new Map<string, any>();
    for (const row of rows) unique.set(String(row.id || row.firebase_uid || row.email || Math.random()), row);
    const profileRows = Array.from(unique.values());
    const adminProfile = profileRows.find(isAdminish) || null;

    // لو وجدنا صف أدمن بنفس الإيميل ولم يكن مربوطاً بـ firebase_uid، نربطه الآن تلقائياً.
    if (adminProfile?.id && uid && String(adminProfile.firebase_uid || '') !== uid) {
      await db.from('users').update({ firebase_uid: uid, updated_at: new Date().toISOString() }).eq('id', adminProfile.id);
      adminProfile.firebase_uid = uid;
    }

    return NextResponse.json({
      ok: true,
      allowed: Boolean(adminProfile),
      user: firebaseUser,
      profile: adminProfile,
      matched_rows: profileRows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ADMIN_CHECK_FAILED';
    return NextResponse.json({ ok: false, allowed: false, error: message }, { status: 500 });
  }
}
