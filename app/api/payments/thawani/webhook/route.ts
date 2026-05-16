import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizePaymentStatus, retrieveThawaniSession } from '@/lib/thawani';
import { activatePaidService, paidStatus } from '@/lib/payments-core';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = String(body?.data?.session_id || body?.data?.id || body?.session_id || body?.id || '');
    const paymentIdFromMeta = String(body?.data?.metadata?.payment_id || body?.metadata?.payment_id || body?.client_reference_id || '');
    if (!sessionId && !paymentIdFromMeta) return NextResponse.json({ ok: true, ignored: 'missing_session_or_payment_id' });

    let session: any = {};
    let status = 'pending';
    if (sessionId) {
      session = await retrieveThawaniSession(sessionId);
      status = normalizePaymentStatus(session);
    }
    const paymentId = String(session?.client_reference_id || session?.metadata?.payment_id || paymentIdFromMeta || '');
    const lookup = paymentId || sessionId;

    const patch = { status, provider_payload: { webhook: body, session }, verified_at: new Date().toISOString(), webhook_status: 'received' };
    if (paymentId) await supabaseAdmin.from('payments').update(patch).eq('id', paymentId);
    else await supabaseAdmin.from('payments').update(patch).eq('provider_session_id', sessionId);

    if (paidStatus(status)) await activatePaidService(lookup, session);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'WEBHOOK_FAILED' }, { status: 500 });
  }
}
