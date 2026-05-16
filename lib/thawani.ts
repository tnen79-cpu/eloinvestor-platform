export type ThawaniProduct = {
  name: string;
  quantity: number;
  unit_amount: number;
};

export type ThawaniCreateSessionPayload = {
  client_reference_id: string;
  mode: 'payment';
  products: ThawaniProduct[];
  success_url: string;
  cancel_url: string;
  metadata?: Record<string, string | number | boolean | null>;
};

import { supabaseAdmin } from '@/lib/supabase-admin';

export async function getThawaniConfig() {
  let dbSettings: any = null;
  try {
    const { data } = await supabaseAdmin
      .from('payment_gateway_settings')
      .select('*')
      .eq('provider', 'thawani')
      .maybeSingle();
    dbSettings = data;
  } catch {
    dbSettings = null;
  }

  const enabled = dbSettings?.is_enabled !== false;
  if (!enabled) throw new Error('Thawani payment gateway is disabled from admin settings');

  const secretKey = dbSettings?.secret_key || process.env.THAWANI_SECRET_KEY;
  const publishableKey = dbSettings?.publishable_key || process.env.NEXT_PUBLIC_THAWANI_PUBLISHABLE_KEY || process.env.THAWANI_PUBLISHABLE_KEY;
  const baseUrl = String(dbSettings?.base_url || process.env.THAWANI_BASE_URL || 'https://uatcheckout.thawani.om/api/v1').replace(/\/$/, '');
  const checkoutUrl = String(dbSettings?.checkout_url || process.env.THAWANI_CHECKOUT_URL || baseUrl.replace('/api/v1', '')).replace(/\/$/, '');

  if (!secretKey) throw new Error('Missing THAWANI_SECRET_KEY. Add it in Admin > بوابة الدفع or .env.local');
  if (!publishableKey) throw new Error('Missing THAWANI_PUBLISHABLE_KEY. Add it in Admin > بوابة الدفع or .env.local');

  return { secretKey, publishableKey, baseUrl, checkoutUrl };
}

export function omrToBaisa(amount: number) {
  return Math.max(0, Math.round(Number(amount || 0) * 1000));
}

export async function createThawaniSession(payload: ThawaniCreateSessionPayload) {
  const config = await getThawaniConfig();
  const response = await fetch(`${config.baseUrl}/checkout/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'thawani-api-key': config.secretKey,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.success === false) {
    throw new Error(json?.description || json?.message || 'Could not create Thawani checkout session');
  }
  return json?.data || json;
}

export async function retrieveThawaniSession(sessionId: string) {
  const config = await getThawaniConfig();
  const response = await fetch(`${config.baseUrl}/checkout/session/${encodeURIComponent(sessionId)}`, {
    method: 'GET',
    headers: { 'thawani-api-key': config.secretKey },
    cache: 'no-store',
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.success === false) {
    throw new Error(json?.description || json?.message || 'Could not retrieve Thawani checkout session');
  }
  return json?.data || json;
}

export async function thawaniPayUrl(sessionId: string) {
  const config = await getThawaniConfig();
  return `${config.checkoutUrl}/pay/${encodeURIComponent(sessionId)}?key=${encodeURIComponent(config.publishableKey || '')}`;
}

export function normalizePaymentStatus(session: any) {
  const raw = String(session?.payment_status || session?.status || session?.session_status || '').toLowerCase();
  if (['paid', 'complete', 'completed', 'success', 'successful'].includes(raw)) return 'paid';
  if (['unpaid', 'created', 'open', 'pending'].includes(raw)) return 'pending';
  if (['cancelled', 'canceled', 'expired', 'failed'].includes(raw)) return raw === 'expired' ? 'expired' : 'failed';
  return raw || 'pending';
}
