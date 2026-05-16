import { supabaseAdmin } from '@/lib/supabase-admin';

export type PaymentPurpose = 'promotion' | 'package' | 'subscription' | 'boost';

export function normalizePurpose(value: any): PaymentPurpose {
  const raw = String(value || '').toLowerCase();
  if (raw === 'package_upgrade' || raw === 'plan' || raw === 'membership') return 'package';
  if (raw === 'subscription') return 'subscription';
  if (raw === 'boost' || raw === 'boost_24h') return 'boost';
  return 'promotion';
}

export function paidStatus(status: string) {
  return ['paid', 'success', 'successful', 'completed', 'complete'].includes(String(status || '').toLowerCase());
}

export function parsePlanAmount(input: any) {
  const amount = Number(input);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export async function activatePromotionRequest(promotionRequestId: string, session: any = {}) {
  const { data: requestRow } = await supabaseAdmin
    .from('promotion_requests')
    .select('*')
    .eq('id', promotionRequestId)
    .maybeSingle();

  if (!requestRow) return { activated: false, reason: 'promotion_request_not_found' };

  const durationDays = Number(requestRow?.duration_days || 7);
  const startsAt = requestRow?.starts_at ? new Date(requestRow.starts_at) : new Date();
  const endsAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  const patch = {
    status: 'active',
    payment_status: 'paid',
    paid_at: new Date().toISOString(),
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    payment_payload: session,
  };

  await supabaseAdmin.from('promotion_requests').update(patch).eq('id', promotionRequestId);

  if (requestRow?.project_id) {
    await supabaseAdmin
      .from('projects')
      .update({
        is_sponsored: true,
        sponsored_until: endsAt.toISOString(),
        sponsor_weight: Number(requestRow?.sponsor_weight || 25),
      })
      .eq('id', requestRow.project_id);
  }

  return { activated: true, type: 'promotion', ends_at: endsAt.toISOString() };
}

export async function activateBoost(projectId: string, userAuthId: string, session: any = {}) {
  if (!projectId) return { activated: false, reason: 'missing_project_id' };
  const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await supabaseAdmin
    .from('projects')
    .update({ is_sponsored: true, sponsored_until: endsAt.toISOString(), sponsor_weight: 100 })
    .eq('id', projectId);

  try {
    await supabaseAdmin.from('promotion_requests').insert({
      user_auth_id: userAuthId,
      owner_auth_id: userAuthId,
      project_id: projectId,
      title: 'Boost سريع 24 ساعة',
      plan_key: 'boost_24h',
      plan_name: 'Boost 24 ساعة',
      placement: 'top_results',
      duration_days: 1,
      price: Number(session?.amount_total || session?.amount || 0) / 1000 || 0,
      status: 'active',
      payment_status: 'paid',
      starts_at: new Date().toISOString(),
      ends_at: endsAt.toISOString(),
      sponsor_weight: 100,
      payment_payload: session,
    });
  } catch {
    // Older databases may not accept every optional column. Boost still activates project sponsorship.
  }

  return { activated: true, type: 'boost', ends_at: endsAt.toISOString() };
}

export async function activatePackage(payment: any, session: any = {}) {
  const userAuthId = payment?.user_auth_id;
  const planCode = String(payment?.plan_code || payment?.metadata?.plan_code || payment?.reference_id || '').toLowerCase();
  if (!userAuthId || !planCode) return { activated: false, reason: 'missing_user_or_plan' };

  let projectLimit = Number(payment?.metadata?.project_limit || 0);
  let durationDays = Number(payment?.metadata?.duration_days || 30);
  let packageType = String(payment?.metadata?.package_type || 'owner');

  try {
    const { data: pkg } = await supabaseAdmin
      .from('subscription_packages')
      .select('*')
      .or(`code.eq.${planCode},name_en.eq.${planCode},name_ar.eq.${planCode}`)
      .maybeSingle();
    if (pkg) {
      projectLimit = Number(pkg.projects_limit || pkg.project_limit || projectLimit || 0);
      durationDays = Number(pkg.duration_days || durationDays || 30);
      packageType = String(pkg.target_account_type || pkg.package_type || packageType);
    }
  } catch {
    // Keep dashboard fallback plans working even before package table is fully standardized.
  }

  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
  const remainingIncrement = projectLimit > 0 ? projectLimit : (['growth', 'business'].includes(planCode) ? (planCode === 'business' ? 6 : 2) : 0);

  try {
    const { data: current } = await supabaseAdmin
      .from('users')
      .select('remaining_projects')
      .or(`auth_id.eq.${userAuthId},id.eq.${userAuthId}`)
      .maybeSingle();
    await supabaseAdmin
      .from('users')
      .update({
        plan: planCode,
        subscription_status: planCode,
        subscription_expires_at: expiresAt,
        remaining_projects: Number(current?.remaining_projects || 0) + remainingIncrement,
      })
      .or(`auth_id.eq.${userAuthId},id.eq.${userAuthId}`);
  } catch {
    await supabaseAdmin
      .from('users')
      .update({ plan: planCode, subscription_status: planCode, subscription_expires_at: expiresAt })
      .or(`auth_id.eq.${userAuthId},id.eq.${userAuthId}`);
  }

  try {
    await supabaseAdmin.from('subscription_requests').insert({
      user_auth_id: userAuthId,
      package_code: planCode,
      package_type: packageType,
      status: 'approved',
      payment_reference: payment?.provider_session_id || payment?.id,
      admin_note: 'تم التفعيل تلقائياً بعد نجاح الدفع',
    });
  } catch {
    // Table/columns differ across old migrations; payment activation is still stored in payments + users.
  }

  return { activated: true, type: 'package', plan_code: planCode, expires_at: expiresAt };
}

export async function activatePaidService(paymentIdOrSessionId: string, session: any = {}) {
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('*')
    .or(`id.eq.${paymentIdOrSessionId},provider_session_id.eq.${paymentIdOrSessionId}`)
    .maybeSingle();

  if (!payment) return { activated: false, reason: 'payment_not_found' };
  const purpose = normalizePurpose(payment.payment_type || payment.purpose || payment.reference_type);
  const refId = String(payment.reference_id || payment.promotion_request_id || payment.project_id || '');

  if (purpose === 'promotion') return activatePromotionRequest(String(payment.promotion_request_id || refId), session);
  if (purpose === 'boost') return activateBoost(String(payment.project_id || refId), String(payment.user_auth_id || ''), session);
  if (purpose === 'package' || purpose === 'subscription') return activatePackage(payment, session);
  return { activated: false, reason: 'unsupported_purpose' };
}
