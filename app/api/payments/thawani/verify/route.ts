import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizePaymentStatus, retrieveThawaniSession } from '@/lib/thawani';
import { activatePaidService, paidStatus } from '@/lib/payments-core';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = String(body?.sessionId || body?.session_id || '');
    const paymentId = String(body?.paymentId || body?.payment_id || '');
    if (!sessionId && !paymentId) return NextResponse.json({ error: 'MISSING_PAYMENT_OR_SESSION_ID' }, { status: 400 });

    let session: any = {};
    let status = 'pending';
    if (sessionId) {
      session = await retrieveThawaniSession(sessionId);
      status = normalizePaymentStatus(session);
    }

    const lookup = paymentId || sessionId;
    const updateQuery = paymentId
      ? supabaseAdmin.from('payments').update({ status, provider_payload: session, verified_at: new Date().toISOString(), webhook_status: 'verified' }).eq('id', paymentId)
      : supabaseAdmin.from('payments').update({ status, provider_payload: session, verified_at: new Date().toISOString(), webhook_status: 'verified' }).eq('provider_session_id', sessionId);
    await updateQuery;

    let activation: any = null;
    if (paidStatus(status)) activation = await activatePaidService(lookup, session);

    return NextResponse.json({ status, paymentId, sessionId, activation });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'THAWANI_VERIFY_FAILED' }, { status: 500 });
  }
}
