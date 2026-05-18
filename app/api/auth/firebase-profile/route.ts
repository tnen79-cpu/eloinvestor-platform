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

function normalizeAccountType(value: unknown, fallback = 'investor') {
  const raw = String(value || fallback || 'investor').trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  const map: Record<string, string> = {
    investor: 'investor',
    مستثمر: 'investor',
    owner: 'owner',
    seller: 'owner',
    founder: 'owner',
    project_owner: 'owner',
    صاحب_مشروع: 'owner',
    صاحب_المشروع: 'owner',
    both: 'both',
    owner_investor: 'both',
    investor_owner: 'both',
    investor_and_owner: 'both',
    project_owner_and_investor: 'both',
    مستثمر_وصاحب_مشروع: 'both',
    مستثمر_صاحب_مشروع: 'both',
  };
  return map[raw] || (['investor', 'owner', 'both'].includes(raw) ? raw : 'investor');
}

function isAdminish(row: any) {
  const role = String(row?.admin_role || row?.role || '').toLowerCase();
  return row?.is_admin === true || ['admin', 'super_admin', 'verification_admin', 'content_admin', 'finance_admin', 'support_admin'].includes(role);
}

async function findExistingUser(db: any, firebaseUser: any, body: AnyRow = {}) {
  const uid = String(firebaseUser.uid || firebaseUser.id || '').trim();
  const email = String(firebaseUser.email || body?.email || '').trim().toLowerCase();
  const phone = String(firebaseUser.phone || body?.phone || '').trim();
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(uid || ''));
  const found: any[] = [];

  async function collect(query: any) {
    const { data, error } = await query;
    if (!error && Array.isArray(data)) found.push(...data);
    if (!error && data && !Array.isArray(data)) found.push(data);
  }

  if (uid) await collect(db.from('users').select('*').eq('firebase_uid', uid).limit(10));
  if (email) {
    await collect(db.from('users').select('*').eq('email', email).limit(10));
    // بعض الحسابات القديمة محفوظة بحروف كبيرة/مختلطة، لذلك نستخدم ilike كاحتياط.
    await collect(db.from('users').select('*').ilike('email', email).limit(10));
  }
  if (phone) await collect(db.from('users').select('*').eq('phone', phone).limit(10));
  if (uuidLike) await collect(db.from('users').select('*').eq('auth_id', uid).limit(10));

  const unique = new Map<string, any>();
  for (const row of found) unique.set(String(row.id || row.firebase_uid || row.auth_id || row.email || Math.random()), row);
  const rows = Array.from(unique.values());
  if (!rows.length) return null;

  // إذا هناك حساب إداري قديم بنفس الإيميل، هو الأهم من أي صف user جديد أنشئ تلقائياً.
  const adminRow = rows.find(isAdminish);
  if (adminRow) return adminRow;
  const firebaseRow = rows.find((row) => String(row.firebase_uid || '') === uid);
  if (firebaseRow) return firebaseRow;
  return rows[0];
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
      if (retry) {
        existing = retry;
        continue;
      }
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

    const requestedComplete = body?.complete_onboarding === true || body?.onboarding_completed === true;
    const bodyName = String(body?.name || '').trim();
    const fallbackName = String(meta.name || meta.full_name || meta.display_name || firebaseUser.phone || firebaseUser.email || 'User').trim();
    const name = bodyName || existing?.name || fallbackName;

    const submittedAccountType = body?.account_type ?? body?.accountType;
    const hasSubmittedAccountType = typeof submittedAccountType === 'string' && submittedAccountType.trim().length > 0;
    // أثناء إكمال الحساب يجب احترام اختيار المستخدم حرفياً.
    // أثناء login العادي لا نرجع الحساب إلى investor إذا كان محفوظ owner/both سابقاً.
    const accountType = hasSubmittedAccountType
      ? normalizeAccountType(submittedAccountType)
      : normalizeAccountType(existing?.account_type || 'investor');
    const onboardingCompleted = requestedComplete || existing?.onboarding_completed === true || false;

    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firebaseUser.uid);
    const existingIsAdmin = isAdminish(existing);
    const existingRole = existing?.role || null;
    const existingAdminRole = existing?.admin_role || null;
    const existingAdminStatus = existing?.admin_status || null;

    const row: Record<string, any> = {
      ...(uuidLike ? { auth_id: firebaseUser.uid } : {}),
      firebase_uid: firebaseUser.uid,
      name,
      display_name: name,
      email: firebaseUser.email || body?.email || existing?.email || null,
      phone: firebaseUser.phone || body?.phone || existing?.phone || null,
      phone_country_code: body?.phone_country_code || body?.countryCode || existing?.phone_country_code || null,
      account_type: existingIsAdmin ? (existing?.account_type || existing?.type || 'both') : accountType,
      type: existingIsAdmin ? (existing?.type || existing?.account_type || 'both') : accountType,
      role: existingIsAdmin ? (existingRole || 'admin') : (existingRole && String(existingRole).includes('admin') ? existingRole : 'user'),
      admin_role: existingIsAdmin ? (existingAdminRole || existingRole || 'admin') : existingAdminRole,
      is_admin: existingIsAdmin ? true : existing?.is_admin,
      admin_status: existingIsAdmin ? (existingAdminStatus || 'active') : existingAdminStatus,
      admin_permissions: existing?.admin_permissions || undefined,
      plan: existing?.plan || 'free',
      subscription_status: existing?.subscription_status || 'free',
      avatar_url: meta.avatar_url || existing?.avatar_url || null,
      provider: meta.provider || existing?.provider || 'firebase',
      onboarding_completed: onboardingCompleted,
      profile_completed: onboardingCompleted,
      updated_at: new Date().toISOString(),
    };

    // لا نرسل undefined في Supabase payload
    Object.keys(row).forEach((key) => row[key] === undefined && delete row[key]);

    let profile = await upsertUserCompat(db, row, existing);

    // IMPORTANT: Early Firebase attempts could create duplicate rows:
    // one row by email/phone and another by firebase_uid. This made Admin show type=both
    // while Dashboard loaded the firebase_uid row as investor. When onboarding is completed,
    // update every matching row so all app surfaces read the same account_type/role.
    if (requestedComplete && hasSubmittedAccountType) {
      const patch: Record<string, any> = {
        name,
        display_name: name,
        account_type: accountType,
        type: accountType,
        onboarding_completed: true,
        profile_completed: true,
        updated_at: new Date().toISOString(),
      };
      const matches = [
        { column: 'firebase_uid', value: firebaseUser.uid },
        { column: 'email', value: firebaseUser.email || body?.email || '' },
        { column: 'phone', value: firebaseUser.phone || body?.phone || '' },
      ].filter((item) => String(item.value || '').trim());

      for (const item of matches) {
        try { await db.from('users').update(patch).eq(item.column, item.value); } catch {}
      }
      const refreshed = await findExistingUser(db, firebaseUser, body);
      if (refreshed) profile = refreshed;
    }

    const isGenericName = !String(profile?.name || '').trim() || /^\+?\d+$/.test(String(profile?.name || '').trim()) || String(profile?.name || '').trim().toLowerCase() === 'user';
    const needs_onboarding = profile?.onboarding_completed !== true || isGenericName || !profile?.account_type;

    return NextResponse.json({ ok: true, user: firebaseUser, profile, needs_onboarding });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل حفظ الحساب.';
    return jsonError(message, 500);
  }
}
