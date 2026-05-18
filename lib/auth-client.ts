'use client';

import { supabaseBrowser } from '@/lib/supabase-browser';
import { firebaseUserToSupabaseLike, getFirebaseAuth, signOutFirebase } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';

export async function getCurrentAppUser(timeoutMs = 900): Promise<any | null> {
  // IMPORTANT: EloInvestor now uses Firebase as the primary auth layer.
  // Keep Supabase auth as a legacy fallback only. If we read Supabase first,
  // old sessions/user_metadata can incorrectly force account_type='investor'
  // while the real Firebase-linked profile in public.users is owner/both.
  const auth = getFirebaseAuth();
  if (auth?.currentUser) return firebaseUserToSupabaseLike(auth.currentUser);

  if (auth) {
    const firebaseUser = await new Promise<any | null>((resolve) => {
      let done = false;
      let unsub = () => undefined;
      const finish = (user: any | null) => {
        if (done) return;
        done = true;
        try { unsub(); } catch {}
        resolve(user);
      };
      unsub = onAuthStateChanged(auth, (user) => finish(user));
      setTimeout(() => finish(null), timeoutMs);
    });
    if (firebaseUser) return firebaseUserToSupabaseLike(firebaseUser);
  }

  try {
    const { data } = await supabaseBrowser.auth.getUser();
    if (data?.user) return data.user;
  } catch {}

  return null;
}

export async function signOutEverywhere() {
  try { await supabaseBrowser.auth.signOut(); } catch {}
  try { await signOutFirebase(); } catch {}
}


export function isUuidLike(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function escapePostgrestValue(value: unknown) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/\)/g, '\\)').replace(/\(/g, '\\(');
}

export function firebaseCompatibleUserQuery(user: any) {
  const uid = escapePostgrestValue(user?.id || user?.uid || user?.user_metadata?.firebase_uid || '');
  const parts: string[] = [];
  if (uid) parts.push(`firebase_uid.eq.${uid}`);

  // auth_id / id are UUID columns in many old EloInvestor databases.
  // Firebase UID is not UUID, so comparing it to UUID columns breaks PostgREST with 22P02.
  if (uid && isUuidLike(uid)) {
    parts.push(`auth_id.eq.${uid}`);
    parts.push(`id.eq.${uid}`);
  }

  if (user?.email) parts.push(`email.eq.${escapePostgrestValue(String(user.email).toLowerCase())}`);
  if (user?.phone) parts.push(`phone.eq.${escapePostgrestValue(user.phone)}`);
  return parts.join(',');
}
