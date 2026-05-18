'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Chrome, Smartphone } from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';
import { sendFirebasePhoneOtp, signInWithFirebaseGoogle, getFirebaseIdToken, hasFirebaseConfig } from '@/lib/firebase-client';
import { useI18n } from '@/components/I18nProvider';

type Step = 'phone' | 'otp';

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

async function syncFirebaseProfile(payload: Record<string, unknown> = {}) {
  const token = await getFirebaseIdToken();
  if (!token) return { ok: false, needs_onboarding: true };
  const response = await fetch('/api/auth/firebase-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.ok === false) throw new Error(json?.error || 'Profile sync failed');
  return json;
}

export function LoginForm({ country, lang }: { country: string; lang: string }) {
  const isAr = lang === 'ar';
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [countryCode, setCountryCode] = useState('+968');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fullPhone = useMemo(() => normalizePhone(countryCode, phone), [countryCode, phone]);

  async function finishLogin(payload: Record<string, unknown> = {}) {
    const result = await syncFirebaseProfile({ ...payload, login_source: 'login' });
    const next = `/${country}/${lang}/dashboard`;
    if (result?.needs_onboarding) {
      router.push(`/${country}/${lang}/complete-profile?next=${encodeURIComponent(next)}`);
    } else {
      router.push(next);
    }
    router.refresh();
  }

  async function sendOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      if (!hasFirebaseConfig()) throw new Error(isAr ? 'مفاتيح Firebase غير مضافة.' : 'Firebase keys are missing.');
      const result = await sendFirebasePhoneOtp(fullPhone, 'firebase-recaptcha-container-login');
      setConfirmation(result);
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
      if (!confirmation) throw new Error(isAr ? 'أعد إرسال رمز الدخول.' : 'Please resend the code.');
      await confirmation.confirm(digitsOnly(otp));
      await finishLogin({ phone: fullPhone, phone_country_code: countryCode });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (isAr ? 'رمز غير صحيح.' : 'Invalid code.'));
      setLoading(false);
    }
  }

  async function loginWithGoogle() {
    setLoading(true);
    setMessage('');
    try {
      if (!hasFirebaseConfig()) throw new Error(isAr ? 'مفاتيح Firebase غير مضافة.' : 'Firebase keys are missing.');
      await signInWithFirebaseGoogle();
      await finishLogin();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (isAr ? 'فشل الدخول بواسطة Google.' : 'Google login failed.'));
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 space-y-4">
      <p className="text-center text-[11px] font-black text-blue-500/70">Firebase Auth v88</p>
      <div id="firebase-recaptcha-container-login" className="flex min-h-[78px] justify-center overflow-hidden rounded-2xl bg-slate-50 p-2" />
      <button type="button" onClick={loginWithGoogle} disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 font-black text-slate-900 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60">
        <Chrome size={21} />
        {isAr ? 'الدخول بواسطة Google' : 'Continue with Google'}
      </button>

      <div className="flex items-center gap-3 text-xs font-black text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        {isAr ? 'أو برقم الهاتف' : 'or with phone'}
        <span className="h-px flex-1 bg-slate-200" />
      </div>

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
            <Smartphone size={19} />
            {loading ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'إرسال رمز الدخول' : 'Send login code')}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
            {isAr ? 'أدخل الرمز المرسل إلى' : 'Enter the code sent to'} <span dir="ltr" className="text-blue-700">{fullPhone}</span>
          </div>
          <input value={otp} onChange={(e) => setOtp(digitsOnly(e.target.value).slice(0, 6))} inputMode="numeric" pattern="[0-9]*" maxLength={6} className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-center text-2xl font-black tracking-[0.35em] outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" placeholder="000000" required />
          {!!message && <p className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{message}</p>}
          <button disabled={loading || otp.length < 4} className="w-full rounded-2xl bg-blue-700 px-6 py-4 font-black text-white shadow-lg shadow-blue-900/10 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? (isAr ? 'جاري التحقق...' : 'Verifying...') : (isAr ? 'تأكيد الدخول' : 'Verify and login')}
          </button>
          <button type="button" onClick={() => { setStep('phone'); setOtp(''); setMessage(''); }} className="w-full rounded-2xl bg-slate-100 px-6 py-3 font-black text-slate-700">
            {isAr ? 'تغيير رقم الهاتف' : 'Change phone number'}
          </button>
        </form>
      )}

      <Link href={`/${country}/${lang}/register`} className="block text-center font-bold text-blue-700">{t('auth', 'create_new_account', isAr ? 'إنشاء حساب جديد' : 'Create new account')}</Link>
    </div>
  );
}
