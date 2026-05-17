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

export function firebaseCompatibleUserQuery(user: any) {
  const parts = [`firebase_uid.eq.${user.id}`, `auth_id.eq.${user.id}`, `id.eq.${user.id}`];
  if (user.email) parts.push(`email.eq.${user.email}`);
  if (user.phone) parts.push(`phone.eq.${user.phone}`);
  return parts.join(',');
}
