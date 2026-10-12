'use client';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { getCurrentAppUser } from '@/lib/auth-client';
export type AppProfileResult = { authUser: any | null; profile: any | null };
export async function getCurrentAppProfile(): Promise<AppProfileResult> {
  const authUser = await getCurrentAppUser();
  if (!authUser) return { authUser: null, profile: null };
  const { data, error } = await supabaseBrowser.from('users').select('*').eq('auth_id', authUser.id).maybeSingle();
  if (error) throw error;
  return { authUser, profile: data };
}
