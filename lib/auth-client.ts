'use client';

import { supabaseBrowser } from '@/lib/supabase-browser';

export async function getCurrentAppUser(_timeoutMs = 900): Promise<any | null> {
  try {
    const { data } = await supabaseBrowser.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

export async function getSupabaseAccessToken() {
  try {
    const { data } = await supabaseBrowser.auth.getSession();
    return data?.session?.access_token || '';
  } catch {
    return '';
  }
}

export async function signOutEverywhere() {
  try { await supabaseBrowser.auth.signOut(); } catch {}
}

export function isUuidLike(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function escapePostgrestValue(value: unknown) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/\)/g, '\\)').replace(/\(/g, '\\(');
}

export function userProfileQuery(user: any) {
  const uid = escapePostgrestValue(user?.id || user?.uid || '');
  const parts: string[] = [];
  if (uid && isUuidLike(uid)) {
    parts.push(`auth_id.eq.${uid}`);
    parts.push(`id.eq.${uid}`);
  }
  if (user?.email) parts.push(`email.eq.${escapePostgrestValue(String(user.email).toLowerCase())}`);
  if (user?.phone) parts.push(`phone.eq.${escapePostgrestValue(user.phone)}`);
  return parts.join(',');
}
