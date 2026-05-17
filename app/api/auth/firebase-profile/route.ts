import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyFirebaseIdToken } from '@/lib/firebase-server';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type AnyRow = Record<string, any>;

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

function missingColumn(message: string) {
  const patterns = [/column ['"]?([^'"\s]+)['"]? of relation/i, /Could not find the ['"]([^'"]+)['"] column/i, /Could not find column ['"]([^'"]+)['"]/i, /schema cache[^.]*['"]([^'"]+)['"]/i];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

async function upsertUserCompat(db: any, row: AnyRow) {
  const uid = row.auth_id || row.firebase_uid;
  let existing: any = null;

  const byAuth = await db.from('users').select('*').eq('auth_id', uid).maybeSingle();
  if (!byAuth.error && byAuth.data) existing = byAuth.data;

  if (!existing && row.email) {
    const byEmail = await db.from('users').select('*').eq('email', row.email).maybeSingle();
    if (!byEmail.error && byEmail.data) existing = byEmail.data;
  }

  if (!existing && row.phone) {
    const byPhone = await db.from('users').select('*').eq('phone', row.phone).maybeSingle();
    if (!byPhone.error && byPhone.data) existing = byPhone.data;
  }

  const current: AnyRow = { ...row };
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const query = existing?.id
      ? db.from('users').update(current).eq('id', existing.id).select('*').maybeSingle()
      : db.from('users').insert(current).select('*').maybeSingle();
    const { data, error } = await query;
    if (!error) return data;

    const message = [error.message, error.details, error.hint, error.code].filter(Boolean).join(' ');
    const missing = missingColumn(message);
    if (missing && Object.prototype.hasOwnProperty.call(current, missing)) {
      delete current[missing];
      continue;
    }
    if (/duplicate key|violates unique constraint/i.test(message) && !existing) {
      const retry = await db.from('users').select('*').eq('auth_id', uid).maybeSingle();
      if (!retry.error && retry.data) existing = retry.data;
      continue;
    }
    throw new Error(message || 'Profile save failed');
  }
  throw new Error('تعذر حفظ حساب المستخدم.');
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseUrl || !serviceRoleKey) return jsonError('إعدادات الخادم ناقصة.', 500);
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const firebaseUser = await verifyFirebaseIdToken(token);
    if (!firebaseUser) return jsonError('جلسة Firebase غير صالحة.', 401);

    const body = await req.json().catch(() => ({}));
    const meta = firebaseUser.user_metadata || {};
    const name = body?.name || meta.name || firebaseUser.phone || firebaseUser.email || 'User';
    const accountType = body?.account_type || body?.accountType || 'investor';

    const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const row = {
      auth_id: firebaseUser.uid,
      firebase_uid: firebaseUser.uid,
      name,
      display_name: name,
      email: firebaseUser.email || body?.email || null,
      phone: firebaseUser.phone || body?.phone || null,
      phone_country_code: body?.phone_country_code || body?.countryCode || null,
      account_type: accountType,
      role: body?.role || 'user',
      plan: 'free',
      subscription_status: 'free',
      avatar_url: meta.avatar_url || null,
      provider: meta.provider || 'firebase',
      updated_at: new Date().toISOString(),
    };

    const profile = await upsertUserCompat(db, row);
    return NextResponse.json({ ok: true, user: firebaseUser, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل حفظ الحساب.';
    return jsonError(message, 500);
  }
}
