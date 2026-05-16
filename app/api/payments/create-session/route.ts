import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createThawaniSession, omrToBaisa, thawaniPayUrl } from '@/lib/thawani';
import { normalizePurpose } from '@/lib/payments-core';

const PLAN_PRICES: Record<string, { amount: number; name: string; projects?: number; days?: number; type?: string }> = {
  growth: { amount: 10, name: 'Growth Package', projects: 2, days: 30, type: 'owner' },
  business: { amount: 25, name: 'Business Package', projects: 6, days: 30, type: 'owner' },
  investor_pro: { amount: 7, name: 'Investor Pro', projects: 0, days: 30, type: 'investor' },
  investor_elite: { amount: 15, name: 'Investor Elite', projects: 0, days: 30, type: 'investor' },
  boost_24h: { amount: 2, name: 'Boost 24 Hours', projects: 0, days: 1, type: 'promotion' },
};

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const purpose = normalizePurpose(body?.payment_type || body?.purpose || body?.type || 'promotion');
    const country = String(body?.country || 'om');
    const lang = String(body?.lang || 'ar');
    const origin = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    let amount = 0;
    let itemName = 'EloInvestor Payment';
    let referenceId = String(body?.reference_id || body?.referenceId || '');
    let projectId = String(body?.project_id || body?.projectId || '');
    let promotionRequestId = String(body?.promotion_request_id || body?.promotionRequestId || '');
    const planCode = String(body?.plan_code || body?.planCode || '').toLowerCase();
    let metadata: Record<string, any> = { purpose, user_auth_id: user.id };

    if (purpose === 'promotion') {
      promotionRequestId = promotionRequestId || referenceId;
      if (!promotionRequestId) return NextResponse.json({ error: 'MISSING_PROMOTION_REQUEST_ID' }, { status: 400 });
      const { data: promotion, error } = await supabaseAdmin.from('promotion_requests').select('*').eq('id', promotionRequestId).maybeSingle();
      if (error || !promotion) return NextResponse.json({ error: 'PROMOTION_REQUEST_NOT_FOUND' }, { status: 404 });
      const ownerId = promotion.user_auth_id || promotion.owner_auth_id;
      if (ownerId !== user.id) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
      amount = Number(promotion.price || promotion.amount || 0);
      itemName = String(promotion.title || promotion.plan_name || promotion.plan_key || 'ترويج مشروع');
      projectId = String(promotion.project_id || projectId || '');
      referenceId = promotionRequestId;
      metadata = { ...metadata, promotion_request_id: promotionRequestId, project_id: projectId, reference_type: 'promotion_request' };
    }

    if (purpose === 'boost') {
      projectId = projectId || referenceId;
      if (!projectId) return NextResponse.json({ error: 'MISSING_PROJECT_ID' }, { status: 400 });
      const { data: project, error } = await supabaseAdmin.from('projects').select('id,title,owner_auth_id,user_auth_id,created_by').eq('id', projectId).maybeSingle();
      if (error || !project) return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
      const ownerId = project.owner_auth_id || project.user_auth_id || project.created_by;
      if (ownerId && ownerId !== user.id) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
      const plan = PLAN_PRICES.boost_24h;
      amount = Number(body?.amount || plan.amount);
      itemName = `Boost 24 ساعة - ${project.title || project.id}`;
      referenceId = projectId;
      metadata = { ...metadata, project_id: projectId, reference_type: 'project', boost_hours: 24 };
    }

    if (purpose === 'package' || purpose === 'subscription') {
      if (!planCode) return NextResponse.json({ error: 'MISSING_PLAN_CODE' }, { status: 400 });
      const fallback = PLAN_PRICES[planCode] || { amount: Number(body?.amount || 0), name: planCode, projects: 0, days: 30, type: 'owner' };
      let pkg: any = null;
      try {
        const result = await supabaseAdmin
          .from('subscription_packages')
          .select('*')
          .or(`code.eq.${planCode},name_en.eq.${planCode},name_ar.eq.${planCode}`)
          .maybeSingle();
        pkg = result.data;
      } catch {
        pkg = null;
      }
      amount = Number(pkg?.price ?? fallback.amount ?? body?.amount ?? 0);
      itemName = String(pkg?.name_ar || pkg?.name_en || fallback.name || planCode);
      referenceId = planCode;
      metadata = {
        ...metadata,
        plan_code: planCode,
        reference_type: 'subscription_package',
        package_type: pkg?.package_type || pkg?.target_account_type || fallback.type || 'owner',
        project_limit: Number(pkg?.projects_limit || pkg?.project_limit || fallback.projects || 0),
        duration_days: Number(pkg?.duration_days || fallback.days || 30),
      };
    }

    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'INVALID_AMOUNT' }, { status: 400 });

    const paymentInsert: any = {
      provider: 'thawani',
      payment_type: purpose,
      purpose,
      reference_type: purpose === 'package' || purpose === 'subscription' ? 'subscription_package' : purpose === 'boost' ? 'project' : 'promotion_request',
      reference_id: referenceId,
      user_auth_id: user.id,
      project_id: projectId || null,
      promotion_request_id: promotionRequestId || null,
      plan_code: planCode || null,
      amount,
      currency: String(body?.currency || 'OMR'),
      status: 'pending',
      metadata,
    };

    const { data: payment, error: paymentError } = await supabaseAdmin.from('payments').insert(paymentInsert).select('*').single();
    if (paymentError) throw paymentError;

    const successUrl = `${origin}/${country}/${lang}/payment/success?provider=thawani&payment_id=${encodeURIComponent(payment.id)}&session_id={checkout_session_id}`;
    const cancelUrl = `${origin}/${country}/${lang}/payment/cancel?provider=thawani&payment_id=${encodeURIComponent(payment.id)}&session_id={checkout_session_id}`;

    const session = await createThawaniSession({
      client_reference_id: String(payment.id),
      mode: 'payment',
      products: [{ name: itemName, quantity: 1, unit_amount: omrToBaisa(amount) }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { ...metadata, payment_id: payment.id, amount, currency: paymentInsert.currency },
    });

    const sessionId = session?.session_id || session?.id;
    if (!sessionId) throw new Error('Thawani session_id missing from response');

    await supabaseAdmin.from('payments').update({ provider_session_id: sessionId, provider_payload: session }).eq('id', payment.id);

    if (purpose === 'promotion' && promotionRequestId) {
      await supabaseAdmin.from('promotion_requests').update({ status: 'pending_payment', payment_provider: 'thawani', payment_session_id: sessionId }).eq('id', promotionRequestId);
    }

    return NextResponse.json({ paymentId: payment.id, sessionId, paymentUrl: await thawaniPayUrl(sessionId), purpose });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'PAYMENT_SESSION_FAILED' }, { status: 500 });
  }
}
