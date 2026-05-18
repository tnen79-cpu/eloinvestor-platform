import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export function createServerAuthClient() {
  return createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function getSupabaseUserFromBearer(token?: string) {
  if (!supabaseUrl || !anonKey) return { user: null, error: new Error('SUPABASE_ENV_MISSING') };
  const cleanToken = String(token || '').replace(/^Bearer\s+/i, '').trim();
  if (!cleanToken) return { user: null, error: new Error('MISSING_TOKEN') };
  const authClient = createServerAuthClient();
  const { data, error } = await authClient.auth.getUser(cleanToken);
  return { user: data?.user || null, error };
}
