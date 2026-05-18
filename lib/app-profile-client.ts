use client';

import { supabaseBrowser } from '@/lib/supabase-browser';
import { getFirebaseIdToken } from '@/lib/firebase-client';
import { getCurrentAppUser, firebaseCompatibleUserQuery } from '@/lib/auth-client';

export type AppProfileResult = {
  authUser: any | null;
  profile: any | null;
};

export async function getCurrentAppProfile(): Promise<AppProfileResult> {
  const authUser = await getCurrentAppUser(1800);
  if (!authUser) return { authUser: null, profile: null };

  // Firebase is the source of truth. Always sync/fetch profile through the service API
  // because browser RLS or duplicated old rows can return the wrong account_type.
  try {
    const token = await getFirebaseIdToken();
    if (token) {
      const response = await fetch('/api/auth/firebase-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ login_source: 'profile_lookup' }),
        cache: 'no-store',
      });
      const json = await response.json().catch(() => ({}));
      if (response.ok && json?.profile) return { authUser, profile: json.profile };
    }
  } catch (error) {
    console.warn('Firebase profile API lookup failed:', error);
  }

  // Legacy fallback only.
  try {
    const query = firebaseCompatibleUserQuery(authUser);
    if (query) {
      const { data } = await supabaseBrowser.from('users').select('*').or(query).limit(1).maybeSingle();
      if (data) return { authUser, profile: data };
    }
  } catch (error) {
    console.warn('Legacy profile lookup failed:', error);
  }

  return { authUser, profile: null };
}
