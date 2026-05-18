'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Chrome, Smartphone } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
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

function digitsOnly(value: string) {
  return value.replace(/[^0-9]/g, '');
}

function normalizePhone(countryCode: string, phone: string) {
  const codeDigits = digitsOnly(countryCode);
  let phoneDigits = digitsOnly(phone);
  phoneDigits = phoneDigits.replace(/^0+/, '');
  if (phoneDigits.startsWith(codeDigits)) return `+${phoneDigits}`;
  return `+${codeDigits}${phoneDigits}`;
}

export function LoginForm({ country, lang }: { country: string; lang: string }) {
  const isAr = lang === 'ar';
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [countryCode, setCountryCode] = useState('+968');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fullPhone = useMemo(() => normalizePhone(countryCode, phone), [countryCode, phone]);

  function isProfileComplete(profile: any) {
    const name = String(profile?.name || '').trim();
    const accountType = String(profile?.account_type || '').trim();
    return Boolean(accountType && name && name !== fullPhone);
  }

  async function ensureProfile(userId: string) {
    try {
      const { data: existing } = await supabaseBrowser.from('users').select('name,account_type').eq('auth_id', userId).maybeSingle();
      if (!existing) {
        await supabaseBrowser.from('users').upsert({
          auth_id: userId,
          phone: fullPhone,
          phone_country_code: countryCode,
          role: 'user',
          plan: 'free',
          subscription_status: 'free',
        }, { onConflict: 'auth_id' });
        return false;
      }
      await supabaseBrowser.from('users').update({ phone: fullPhone, phone_country_code: countryCode }).eq('auth_id', userId);
      return isProfileComplete(existing);
    } catch (error) {
      console.warn('Profile upsert after phone login failed:', error);
      return false;
    }
  }

  async function sendOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabaseBrowser.auth.signInWithOtp({
      phone: fullPhone,
      options: { shouldCreateUser: true },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setStep('otp');
    setMessage(isAr ? `تم إرسال رمز الدخول إلى ${fullPhone}` : `OTP sent to ${fullPhone}`);
  }

  async function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const { data, error } = await supabaseBrowser.auth.verifyOtp({
      phone: fullPhone,
      token: digitsOnly(otp),
      type: 'sms',
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    const complete = data.user ? await ensureProfile(data.user.id) : false;
    setLoading(false);
    router.push(complete ? `/${country}/${lang}/dashboard` : `/${country}/${lang}/onboarding?next=${encodeURIComponent(`/${country}/${lang}/dashboard`)}`);
    router.refresh();
  }

  async function loginWithGoogle() {
    setLoading(true);
    setMessage('');
    const redirectTo = `${window.location.origin}/${country}/${lang}/auth/callback?next=/${country}/${lang}/dashboard`;
    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      setLoading(false);
      setMessage(error.message);
    }
  }

  return (
    <div className="mt-8 space-y-4">
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
              {COUNTRY_CODES.map((item) => (
                <option key={item.code} value={item.code}>{item.code} · {isAr ? item.labelAr : item.labelEn}</option>
              ))}
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
