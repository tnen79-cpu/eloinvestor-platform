'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Chrome, Mail, Smartphone } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useI18n } from '@/components/I18nProvider';

type Step = 'phone' | 'otp';
type EmailMode = 'hidden' | 'login';

const COUNTRY_CODES = [
  { code: '+968', labelAr: 'عُمان', labelEn: 'Oman' },
  { code: '+971', labelAr: 'الإمارات', labelEn: 'UAE' },
  { code: '+966', labelAr: 'السعودية', labelEn: 'Saudi Arabia' },
  { code: '+974', labelAr: 'قطر', labelEn: 'Qatar' },
  { code: '+973', labelAr: 'البحرين', labelEn: 'Bahrain' },
  { code: '+965', labelAr: 'الكويت', labelEn: 'Kuwait' },
  { code: '+962', labelAr: 'الأردن', labelEn: 'Jordan' },
  { code: '+20', labelAr: 'مصر', labelEn: 'Egypt' },
  { code: '+963', labelAr: 'سوريا', labelEn: 'Syria' },
  { code: '+964', labelAr: 'العراق', labelEn: 'Iraq' },
];

function digitsOnly(value: string) { return value.replace(/[^0-9]/g, ''); }
function normalizePhone(countryCode: string, phone: string) {
  const codeDigits = digitsOnly(countryCode);
  let phoneDigits = digitsOnly(phone).replace(/^0+/, '');
  if (phoneDigits.startsWith(codeDigits)) return `+${phoneDigits}`;
  return `+${codeDigits}${phoneDigits}`;
}

async function upsertProfileFromSession(extra: Record<string, unknown> = {}) {
  const { data } = await supabaseBrowser.auth.getUser();
  const user = data?.user;
  if (!user) return { needs_onboarding: true };
  const meta = user.user_metadata || {};
  const email = user.email || '';
  const phone = user.phone || String(meta.phone || extra.phone || '');
  const displayName = String(meta.name || meta.full_name || meta.display_name || email || phone || 'مستخدم');
  const payload = {
    auth_id: user.id,
    name: displayName,
    email,
    phone,
    account_type: String(meta.account_type || 'investor'),
    role: 'user',
    plan: 'free',
    subscription_status: 'free',
    provider: String(meta.provider || user.app_metadata?.provider || 'supabase'),
    onboarding_completed: false,
    profile_completed: false,
    ...extra,
  };
  const { data: profile } = await supabaseBrowser.from('users').upsert(payload, { onConflict: 'auth_id' }).select('*').maybeSingle();
  return { profile, needs_onboarding: !profile?.onboarding_completed && !profile?.profile_completed };
}

export function LoginForm({ country, lang }: { country: string; lang: string }) {
  const isAr = lang === 'ar';
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || `/${country}/${lang}/dashboard`;
  const [step, setStep] = useState<Step>('phone');
  const [countryCode, setCountryCode] = useState('+968');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [emailMode, setEmailMode] = useState<EmailMode>('hidden');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fullPhone = useMemo(() => normalizePhone(countryCode, phone), [countryCode, phone]);

  async function finish(extra: Record<string, unknown> = {}) {
    const result = await upsertProfileFromSession(extra);
    router.push(result?.needs_onboarding ? `/${country}/${lang}/complete-profile?next=${encodeURIComponent(next)}` : next);
    router.refresh();
  }

  async function loginWithGoogle() {
    setLoading(true);
    setMessage('');
    try {
      const redirectTo = `${window.location.origin}/${country}/${lang}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabaseBrowser.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (isAr ? 'فشل الدخول بواسطة Google.' : 'Google login failed.'));
      setLoading(false);
    }
  }

  async function sendOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabaseBrowser.auth.signInWithOtp({ phone: fullPhone, options: { shouldCreateUser: true, data: { phone: fullPhone, phone_country_code: countryCode, provider: 'phone' } } });
      if (error) throw error;
      setStep('otp');
      setMessage(isAr ? `تم إرسال رمز الدخول إلى ${fullPhone}` : `OTP sent to ${fullPhone}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (isAr ? 'فشل إرسال الرمز.' : 'Failed to send OTP.'));
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabaseBrowser.auth.verifyOtp({ phone: fullPhone, token: digitsOnly(otp), type: 'sms' });
      if (error) throw error;
      await finish({ phone: fullPhone, phone_country_code: countryCode, provider: 'phone' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (isAr ? 'رمز غير صحيح.' : 'Invalid code.'));
      setLoading(false);
    }
  }

  async function loginWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabaseBrowser.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw error;
      await finish({ email: email.trim().toLowerCase(), provider: 'email' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (isAr ? 'فشل الدخول بالإيميل.' : 'Email login failed.'));
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 space-y-4">
      <p className="text-center text-[11px] font-black text-blue-500/70">Supabase Auth · Phone first</p>
      <button type="button" onClick={loginWithGoogle} disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 font-black text-slate-900 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60">
        <Chrome size={21} />
        {isAr ? 'الدخول بواسطة Google' : 'Continue with Google'}
      </button>

      <div className="flex items-center gap-3 text-xs font-black text-slate-400"><span className="h-px flex-1 bg-slate-200" />{isAr ? 'أو برقم الهاتف' : 'or with phone'}<span className="h-px flex-1 bg-slate-200" /></div>

      {step === 'phone' ? (
        <form onSubmit={sendOtp} className="space-y-4">
          <div className="grid grid-cols-[130px_1fr] gap-3">
            <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 font-bold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" aria-label={isAr ? 'مفتاح الدولة' : 'Country code'}>
              {COUNTRY_CODES.map((item) => <option key={item.code} value={item.code}>{item.code} · {isAr ? item.labelAr : item.labelEn}</option>)}
            </select>
            <input value={phone} onChange={(e) => setPhone(digitsOnly(e.target.value))} inputMode="numeric" pattern="[0-9]*" className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" placeholder={isAr ? 'رقم الهاتف' : 'Phone number'} required />
          </div>
          {!!message && <p className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{message}</p>}
          <button disabled={loading || phone.length < 6} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-6 py-4 font-black text-white shadow-lg shadow-blue-900/10 disabled:cursor-not-allowed disabled:opacity-60">
            <Smartphone size={19} />{loading ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'إرسال رمز الدخول' : 'Send login code')}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">{isAr ? 'أدخل الرمز المرسل إلى' : 'Enter the code sent to'} <span dir="ltr" className="text-blue-700">{fullPhone}</span></div>
          <input value={otp} onChange={(e) => setOtp(digitsOnly(e.target.value).slice(0, 6))} inputMode="numeric" pattern="[0-9]*" maxLength={6} className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-center text-2xl font-black tracking-[0.35em] outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" placeholder="000000" required />
          {!!message && <p className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{message}</p>}
          <button disabled={loading || otp.length < 4} className="w-full rounded-2xl bg-blue-700 px-6 py-4 font-black text-white shadow-lg shadow-blue-900/10 disabled:cursor-not-allowed disabled:opacity-60">{loading ? (isAr ? 'جاري التحقق...' : 'Verifying...') : (isAr ? 'تأكيد الدخول' : 'Verify and login')}</button>
          <button type="button" onClick={() => { setStep('phone'); setOtp(''); setMessage(''); }} className="w-full rounded-2xl bg-slate-100 px-6 py-3 font-black text-slate-700">{isAr ? 'تغيير رقم الهاتف' : 'Change phone number'}</button>
        </form>
      )}

      <button type="button" onClick={() => setEmailMode(emailMode === 'hidden' ? 'login' : 'hidden')} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700">
        <Mail size={17} /> {isAr ? 'الدخول بالإيميل عند الحاجة' : 'Use email if needed'}
      </button>
      {emailMode === 'login' && (
        <form onSubmit={loginWithEmail} className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none focus:border-blue-600" placeholder={isAr ? 'الإيميل' : 'Email'} required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none focus:border-blue-600" placeholder={isAr ? 'كلمة المرور' : 'Password'} required />
          <button disabled={loading || !email || !password} className="w-full rounded-2xl bg-slate-900 px-5 py-3 font-black text-white disabled:opacity-60">{isAr ? 'دخول بالإيميل' : 'Login with email'}</button>
        </form>
      )}

      <Link href={`/${country}/${lang}/register`} className="block text-center font-bold text-blue-700">{t('auth', 'create_new_account', isAr ? 'إنشاء حساب جديد' : 'Create new account')}</Link>
    </div>
  );
}
