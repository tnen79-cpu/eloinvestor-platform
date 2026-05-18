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
  const patterns = [
    /column ['\"]?([^'\"\\s]+)['\"]? of relation/i,
    /Could not find the ['\"]([^'\"]+)['\"] column/i,
    /Could not find column ['\"]([^'\"]+)['\"]/i,
    /schema cache[^.]*['\"]([^'\"]+)['\"]/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function normalizeAccountType(value: unknown, fallback = 'investor') {
  const raw = String(value || fallback || 'investor').trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  const map: Record<string, string> = {
    investor: 'investor', مستثمر: 'investor',
    owner: 'owner', seller: 'owner', founder: 'owner', project_owner: 'owner',
    صاحب_مشروع: 'owner', صاحب_المشروع: 'owner',
    both: 'both', owner_investor: 'both', investor_owner: 'both',
    investor_and_owner: 'both', project_owner_and_investor: 'both',
    مستثمر_وصاحب_مشروع: 'both', مستثمر_صاحب_مشروع: 'both',
  };
  return map[raw] || (['investor', 'owner', 'both'].includes(raw) ? raw : 'investor');
}

// ✅ FIX 1: isAdminish also checks firebase_uid-based admin records
function isAdminish(row: any) {
  if (!row) return false;
  const role = String(row?.admin_role || row?.role || '').toLowerCase();
  return (
    row?.is_admin === true ||
    ['admin', 'super_admin', 'verification_admin', 'content_admin', 'finance_admin', 'support_admin'].includes(role)
  );
}

async function findExistingUser(db: any, firebaseUser: any, body: AnyRow = {}) {
  const uid = firebaseUser.uid;
  const email = String(firebaseUser.email || body?.email || '').trim().toLowerCase();
  const phone = String(firebaseUser.phone || body?.phone || '').trim();

  // ✅ FIX 1: firebase_uid is checked FIRST — this is the primary admin lookup key
  const candidates: Array<{ col: string; val: string }> = [];
  if (uid) candidates.push({ col: 'firebase_uid', val: uid });
  if (email) candidates.push({ col: 'email', val: email });
  if (phone) candidates.push({ col: 'phone', val: phone });

  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(uid || ''));
  if (uuidLike) candidates.push({ col: 'auth_id', val: uid });

  for (const item of candidates) {
    const { data, error } = await db.from('users').select('*').eq(item.col, item.val).maybeSingle();
    if (!error && data) return data;
  }
  return null;
}

async function upsertUserCompat(db: any, row: AnyRow, existingRow?: AnyRow | null) {
  let existing: any = existingRow || null;
  const current: AnyRow = { ...row };

  for (let attempt = 0; attempt < 35; attempt += 1) {
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
      const retry = await findExistingUser(db, { uid: row.firebase_uid, email: row.email, phone: row.phone }, row);
      if (retry) { existing = retry; continue; }
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
    const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const existing = await findExistingUser(db, firebaseUser, body);

    // ✅ FIX 1: If existing user is admin, NEVER downgrade role — preserve all admin fields
    const existingIsAdmin = isAdminish(existing);

    const requestedComplete = body?.complete_onboarding === true || body?.onboarding_completed === true;
    const bodyName = String(body?.name || '').trim();
    const fallbackName = String(meta.name || meta.full_name || meta.display_name || firebaseUser.phone || firebaseUser.email || 'User').trim();
    const name = bodyName || existing?.name || fallbackName;

    // ✅ FIX 2: account_type — use submitted value first, then existing, never override admin's type
    // Only fall back to 'investor' if truly nothing is known
    const submittedAccountType = body?.account_type ?? body?.accountType;
    const resolvedAccountType = existingIsAdmin
      ? (existing?.account_type || 'both')
      : normalizeAccountType(submittedAccountType ?? existing?.account_type ?? null);

    const onboardingCompleted = requestedComplete || existing?.onboarding_completed === true || false;

    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firebaseUser.uid);

    const row: Record<string, any> = {
      ...(uuidLike ? { auth_id: firebaseUser.uid } : {}),
      firebase_uid: firebaseUser.uid,
      name,
      display_name: name,
      email: firebaseUser.email || body?.email || existing?.email || null,
      phone: firebaseUser.phone || body?.phone || existing?.phone || null,
      phone_country_code: body?.phone_country_code || body?.countryCode || existing?.phone_country_code || null,
      account_type: resolvedAccountType,

      // ✅ FIX 1: Fully preserve admin fields — never set role:'user' for admins
      role: existingIsAdmin
        ? (existing?.role || 'admin')
        : (existing?.role && String(existing.role).includes('admin') ? existing.role : 'user'),
      admin_role: existingIsAdmin ? (existing?.admin_role || existing?.role || 'admin') : (existing?.admin_role || null),
      is_admin: existingIsAdmin ? true : (existing?.is_admin || false),
      admin_status: existingIsAdmin ? (existing?.admin_status || 'active') : (existing?.admin_status || null),
      admin_permissions: existing?.admin_permissions || undefined,

      plan: existing?.plan || 'free',
      subscription_status: existing?.subscription_status || 'free',
      avatar_url: meta.avatar_url || existing?.avatar_url || null,
      provider: meta.provider || existing?.provider || 'firebase',
      onboarding_completed: onboardingCompleted,
      profile_completed: onboardingCompleted,
      updated_at: new Date().toISOString(),
    };

    // Never send undefined to Supabase
    Object.keys(row).forEach((key) => row[key] === undefined && delete row[key]);

    const profile = await upsertUserCompat(db, row, existing);

    const isGenericName = !String(profile?.name || '').trim()
      || /^\+?\d+$/.test(String(profile?.name || '').trim())
      || String(profile?.name || '').trim().toLowerCase() === 'user';

    // ✅ FIX 2: admins never need onboarding even if name looks generic
    const needs_onboarding = isAdminish(profile)
      ? false
      : (profile?.onboarding_completed !== true || isGenericName || !profile?.account_type);

    return NextResponse.json({ ok: true, user: firebaseUser, profile, needs_onboarding });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل حفظ الحساب.';
    return jsonError(message, 500);
  }
}
