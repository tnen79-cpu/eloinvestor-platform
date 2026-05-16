import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export function clients(token?: string) {
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const db = createClient(supabaseUrl, serviceRoleKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: serviceRoleKey || !token ? undefined : { headers: { Authorization: `Bearer ${token}` } },
  });
  return { authClient, db };
}

export async function getUser(req: NextRequest) {
  if (!supabaseUrl || !anonKey) throw new Error('إعدادات Supabase ناقصة في الخادم.');
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw Object.assign(new Error('يجب تسجيل الدخول أولًا.'), { status: 401 });
  const { authClient, db } = clients(token);
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) throw Object.assign(new Error('جلسة الدخول غير صالحة.'), { status: 401 });
  return { user: data.user, token, db };
}

export async function isAdmin(db: any, user: any) {
  const { data } = await db.from('users').select('role,account_type,admin_role,is_admin,admin_status,email').or(`auth_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email}`).maybeSingle();
  const role = String(data?.admin_role || data?.role || data?.account_type || user.user_metadata?.role || '').toLowerCase();
  const status = String(data?.admin_status || 'active').toLowerCase();
  return (data?.is_admin === true || ['admin','super_admin','owner','manager'].includes(role)) && !['suspended','revoked'].includes(status);
}

function missingColumn(message: string) {
  const patterns = [/column ['"]?([^'"\s]+)['"]? of relation/i, /Could not find the ['"]([^'"]+)['"] column/i, /Could not find column ['"]([^'"]+)['"]/i, /schema cache[^.]*['"]([^'"]+)['"]/i];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function notNullColumn(message: string) {
  const match = message.match(/null value in column ['"]([^'"]+)['"]/i);
  return match?.[1] || null;
}

export async function insertWithFallback(db: any, table: string, row: Record<string, any>, defaults: Record<string, any> = {}) {
  const current = { ...defaults, ...row };
  const removed: string[] = [];
  for (let i = 0; i < 25; i += 1) {
    const { data, error } = await db.from(table).insert(current).select('*').maybeSingle();
    if (!error) return { data, removed };
    const message = [error.message, error.details, error.hint, error.code].filter(Boolean).join(' ');
    const missing = missingColumn(message);
    if (missing && Object.prototype.hasOwnProperty.call(current, missing)) {
      delete current[missing];
      removed.push(missing);
      continue;
    }
    const notNull = notNullColumn(message);
    if (notNull) {
      current[notNull] = current[notNull] ?? defaults[notNull] ?? current.key ?? current.translation_key ?? current.title ?? current.reason ?? current.request_type ?? 'pending';
      continue;
    }
    throw new Error(message || `فشل الحفظ في ${table}`);
  }
  throw new Error(`تعذر الحفظ في ${table} بعد محاولات توافق متعددة.`);
}

export async function updateWithFallback(db: any, table: string, id: string, row: Record<string, any>) {
  const current = { ...row };
  for (let i = 0; i < 20; i += 1) {
    const { data, error } = await db.from(table).update(current).eq('id', id).select('*').maybeSingle();
    if (!error) return data;
    const message = [error.message, error.details, error.hint, error.code].filter(Boolean).join(' ');
    const missing = missingColumn(message);
    if (missing && Object.prototype.hasOwnProperty.call(current, missing)) {
      delete current[missing];
      continue;
    }
    throw new Error(message || `فشل التحديث في ${table}`);
  }
  throw new Error(`تعذر التحديث في ${table}.`);
}
