'use client';

import { supabaseBrowser } from '@/lib/supabase-browser';
import { firebaseUserToSupabaseLike, getFirebaseAuth, signOutFirebase } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';

export async function getCurrentAppUser(timeoutMs = 900): Promise<any | null> {
  try {
    const { data } = await supabaseBrowser.auth.getUser();
    if (data?.user) return data.user;
  } catch {}

  const auth = getFirebaseAuth();
  if (!auth) return null;
  if (auth.currentUser) return firebaseUserToSupabaseLike(auth.currentUser);

  return await new Promise((resolve) => {
    let done = false;
    let unsub = () => undefined;
    const finish = (user: any | null) => {
      if (done) return;
      done = true;
      try { unsub(); } catch {}
      resolve(firebaseUserToSupabaseLike(user));
    };
    unsub = onAuthStateChanged(auth, (user) => finish(user));
    setTimeout(() => finish(null), timeoutMs);
  });
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
