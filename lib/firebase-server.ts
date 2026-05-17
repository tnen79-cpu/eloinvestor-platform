type FirebaseLookupUser = {
  localId: string;
  email?: string;
  phoneNumber?: string;
  displayName?: string;
  photoUrl?: string;
  providerUserInfo?: Array<{ providerId?: string; email?: string; phoneNumber?: string; displayName?: string; photoUrl?: string }>;
};

export type VerifiedFirebaseUser = {
  id: string;
  uid: string;
  email: string;
  phone: string;
  user_metadata: Record<string, any>;
  app_metadata: Record<string, any>;
};

export async function verifyFirebaseIdToken(token: string): Promise<VerifiedFirebaseUser | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';
  if (!apiKey || !token) return null;

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: token }),
    cache: 'no-store',
  });

  if (!response.ok) return null;
  const json = await response.json();
  const user = (json?.users?.[0] || null) as FirebaseLookupUser | null;
  if (!user?.localId) return null;

  const provider = user.providerUserInfo?.[0] || {};
  const name = user.displayName || provider.displayName || user.phoneNumber || user.email || 'User';
  const email = user.email || provider.email || '';
  const phone = user.phoneNumber || provider.phoneNumber || '';

  return {
    id: user.localId,
    uid: user.localId,
    email,
    phone,
    user_metadata: {
      name,
      full_name: name,
      display_name: name,
      avatar_url: user.photoUrl || provider.photoUrl || '',
      phone,
      firebase_uid: user.localId,
      provider: provider.providerId || 'firebase',
    },
    app_metadata: { provider: provider.providerId || 'firebase', providers: ['firebase'] },
  };
}

export async function getSupabaseOrFirebaseUser(authClient: any, token: string) {
  const { data, error } = await authClient.auth.getUser(token);
  if (!error && data?.user) return { user: data.user, provider: 'supabase' as const };

  const firebaseUser = await verifyFirebaseIdToken(token);
  if (firebaseUser) return { user: firebaseUser as any, provider: 'firebase' as const };
  return { user: null, provider: null as null, error };
}
