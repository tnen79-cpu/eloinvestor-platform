import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type AnyRecord = Record<string, any>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

function getMissingColumn(message: string) {
  const patterns = [
    /column ['"]?([^'"\s]+)['"]? of relation/i,
    /Could not find the ['"]([^'"]+)['"] column/i,
    /Could not find column ['"]([^'"]+)['"]/i,
    /schema cache[^.]*['"]([^'"]+)['"]/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function getNotNullColumn(message: string) {
  const match = message.match(/null value in column ['"]([^'"]+)['"]/i);
  return match?.[1] || null;
}

function fillRequiredProjectColumn(current: AnyRecord, column: string, userId: string) {
  const title = String(current.title || current.name || current.title_ar || 'مشروع جديد');
  const description = String(current.description || current.description_ar || 'تفاصيل المشروع متاحة عند التواصل مع صاحب المشروع.');
  const map: AnyRecord = {
    title,
    name: title,
    title_ar: title,
    title_en: title,
    description,
    description_ar: description,
    description_en: description,
    category: current.category || current.sector || 'services',
    sector: current.sector || current.category || 'services',
    status: current.status || 'approved',
    moderation_status: current.moderation_status || current.status || 'approved',
    publish_status: current.publish_status || current.status || 'approved',
    approval_status: current.approval_status || 'auto_approved',
    country_code: current.country_code || 'om',
    phone_country_code: current.phone_country_code || '+968',
    whatsapp_country_code: current.whatsapp_country_code || '+968',
    slug: current.slug || `project-${Date.now().toString(36)}`,
    price: current.price || 0,
    roi: current.roi || 0,
    monthly_profit: current.monthly_profit || 0,
    is_active: current.is_active ?? true,
    is_verified: current.is_verified ?? false,
    verified: current.verified ?? false,
    verification_status: current.verification_status || 'pending',
    owner_auth_id: userId,
    user_auth_id: userId,
    auth_id: userId,
    user_id: userId,
    owner_id: userId,
    created_by: userId,
  };
  if (Object.prototype.hasOwnProperty.call(map, column)) {
    current[column] = map[column];
    return true;
  }
  return false;
}

function normalizePayload(payload: AnyRecord, userId: string) {
  const current = { ...payload };
  const title = String(current.title || current.name || current.title_ar || '').trim() || 'مشروع جديد';
  const description = String(current.description || current.description_ar || '').trim() || 'تفاصيل المشروع متاحة عند التواصل مع صاحب المشروع.';
  return {
    ...current,
    title,
    name: current.name || title,
    title_ar: current.title_ar || title,
    title_en: current.title_en || title,
    description,
    description_ar: current.description_ar || description,
    description_en: current.description_en || description,
    status: current.status || 'approved',
    moderation_status: current.moderation_status || current.status || 'approved',
    publish_status: current.publish_status || current.status || 'approved',
    approval_status: current.approval_status || 'auto_approved',
    is_active: current.is_active ?? true,
    verification_status: current.verification_status || 'pending',
    is_verified: current.is_verified ?? false,
    verified: current.verified ?? false,
    country_code: current.country_code || 'om',
    phone_country_code: current.phone_country_code || '+968',
    whatsapp_country_code: current.whatsapp_country_code || '+968',
    owner_auth_id: userId,
    user_auth_id: userId,
    auth_id: userId,
    user_id: userId,
    owner_id: userId,
    created_by: userId,
  };
}

async function saveWithFallback(db: any, payload: AnyRecord, userId: string, projectId?: string) {
  const current: AnyRecord = normalizePayload(payload, userId);
  const removed: string[] = [];

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const query = projectId
      ? db.from('projects').update(current).eq('id', projectId).select('id').maybeSingle()
      : db.from('projects').insert(current).select('id').maybeSingle();

    const { data, error } = await query;
    if (!error) return { data, removed };

    const message = [error.message, error.details, error.hint, error.code].filter(Boolean).join(' ');
    const missing = getMissingColumn(message);
    if (missing && Object.prototype.hasOwnProperty.call(current, missing)) {
      delete current[missing];
      removed.push(missing);
      continue;
    }

    const notNull = getNotNullColumn(message);
    if (notNull && fillRequiredProjectColumn(current, notNull, userId)) continue;

    throw new Error(message || 'Project save failed');
  }

  throw new Error('تعذر حفظ المشروع بعد محاولات توافق متعددة مع بنية قاعدة البيانات.');
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseUrl || !anonKey) return jsonError('إعدادات Supabase ناقصة في الخادم.', 500);

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return jsonError('يجب تسجيل الدخول قبل حفظ المشروع.', 401);

    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData.user) return jsonError('جلسة الدخول غير صالحة. سجّل الدخول من جديد.', 401, userError?.message);

    const body = await req.json();
    const payload = body?.payload || {};
    const projectId = typeof body?.projectId === 'string' && body.projectId ? body.projectId : undefined;

    const db = createClient(supabaseUrl, serviceRoleKey || anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: serviceRoleKey ? undefined : { headers: { Authorization: `Bearer ${token}` } },
    });

    const result = await saveWithFallback(db, payload, userData.user.id, projectId);
    return NextResponse.json({ ok: true, project: result.data, removed_columns: result.removed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ المشروع.';
    return jsonError(message, 500);
  }
}
