'use client';

import { createClient } from '@supabase/supabase-js';
import { firebaseUserToSupabaseLike, getFirebaseAuth, getFirebaseIdToken, signOutFirebase, watchFirebaseAuth } from '@/lib/firebase-client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env variables. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local');
}

export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

// Firebase Auth Bridge
// يحافظ على باقي كود المنصة الذي يستخدم supabaseBrowser.auth.getUser/getSession
// ويجعل Firebase phone/google يعمل بدون إعادة كتابة كل المكونات الآن.
const originalAuth: any = supabaseBrowser.auth;
const originalGetUser = originalAuth.getUser.bind(originalAuth);
const originalGetSession = originalAuth.getSession.bind(originalAuth);
const originalOnAuthStateChange = originalAuth.onAuthStateChange.bind(originalAuth);
const originalSignOut = originalAuth.signOut.bind(originalAuth);

function currentFirebaseUserLike() {
  const auth = getFirebaseAuth();
  return firebaseUserToSupabaseLike(auth?.currentUser || null);
}

async function firebaseSessionLike() {
  const auth = getFirebaseAuth();
  const current = auth?.currentUser || null;
  const user = firebaseUserToSupabaseLike(current);
  if (!current || !user) return null;
  const accessToken = await getFirebaseIdToken();
  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: '',
    user,
  } as any;
}

(originalAuth as any).getUser = async (...args: any[]) => {
  const firebaseUser = currentFirebaseUserLike();
  if (firebaseUser) return { data: { user: firebaseUser }, error: null };
  return originalGetUser(...args);
};

(originalAuth as any).getSession = async (...args: any[]) => {
  const session = await firebaseSessionLike();
  if (session) return { data: { session }, error: null };
  return originalGetSession(...args);
};

(originalAuth as any).onAuthStateChange = (callback: any) => {
  const supabaseListener = originalOnAuthStateChange(callback);
  const unsubscribeFirebase = watchFirebaseAuth(async (firebaseUser) => {
    const session = firebaseUser ? await firebaseSessionLike() : null;
    callback(firebaseUser ? 'SIGNED_IN' : 'SIGNED_OUT', session);
  });
  return {
    data: {
      subscription: {
        unsubscribe() {
          try { unsubscribeFirebase(); } catch {}
          try { supabaseListener?.data?.subscription?.unsubscribe?.(); } catch {}
        },
      },
    },
  };
};

(originalAuth as any).signOut = async (...args: any[]) => {
  await signOutFirebase().catch(() => undefined);
  return originalSignOut(...args);
};
