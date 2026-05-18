'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Chrome, Mail, Smartphone } from 'lucide-react';
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

function digitsOnly(value: string) { return value.replace(/[^0-9]/g, ''); }
function normalizePhone(countryCode: string, phone: string) {
  const codeDigits = digitsOnly(countryCode);
  let phoneDigits = digitsOnly(phone).replace(/^0+/, '');
  if (phoneDigits.startsWith(codeDigits)) return `+${phoneDigits}`;
  return `+${codeDigits}${phoneDigits}`;
}

async function upsertCurrentProfile(payload: Record<string, unknown>) {
  const { data } = await supabaseBrowser.auth.getUser();
  const user = data?.user;
  if (!user) throw new Error('No active user');
  const meta = user.user_metadata || {};
  await supabaseBrowser.from('users').upsert({
    auth_id: user.id,
    email: user.email || payload.email || '',
    phone: user.phone || payload.phone || '',
    name: payload.name || meta.name || meta.full_name || meta.display_name || user.email || user.phone || 'مستخدم',
    account_type: payload.account_type || meta.account_type || 'investor',
    role: 'user',
    plan: 'free',
    subscription_status: 'free',
    provider: payload.provider || user.app_metadata?.provider || 'supabase',
    onboarding_completed: true,
    profile_completed: true,
  }, { onConflict: 'auth_id' });
}

export function RegisterForm({ country, lang }: { country: string; lang: string }) {
  const isAr = lang === 'ar';
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [countryCode, setCountryCode] = useState('+968');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<'investor' | 'owner' | 'both' | ''>('');
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fullPhone = useMemo(() => normalizePhone(countryCode, phone), [countryCode, phone]);

  async function finish(payload: Record<string, unknown>) {
    await upsertCurrentProfile(payload);
    router.push(`/${country}/${lang}/dashboard`);
    router.refresh();
  }

  async function registerWithGoogle() {
    setLoading(true);
    setMessage('');
    try {
      const redirectTo = `${window.location.origin}/${country}/${lang}/auth/callback?next=${encodeURIComponent(`/${country}/${lang}/dashboard`)}&account_type=${encodeURIComponent(accountType || 'investor')}`;
      const { error } = await supabaseBrowser.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, queryParams: { prompt: 'select_account' } } });
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
      const { error } = await supabaseBrowser.auth.signInWithOtp({
        phone: fullPhone,
        options: { shouldCreateUser: true, data: { name: name.trim(), account_type: accountType, phone: fullPhone, phone_country_code: countryCode, provider: 'phone' } },
      });
      if (error) throw error;
      setStep('otp');
      setMessage(isAr ? `تم إرسال رمز التحقق إلى ${fullPhone}` : `Verification code sent to ${fullPhone}`);
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
      await finish({ name: name.trim(), account_type: accountType, phone: fullPhone, phone_country_code: countryCode, provider: 'phone' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (isAr ? 'رمز غير صحيح.' : 'Invalid code.'));
      setLoading(false);
    }
  }

  async function registerWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { data, error } = await supabaseBrowser.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { name: name.trim(), account_type: accountType, provider: 'email' } },
      });
      if (error) throw error;
      if (data.user) await finish({ name: name.trim(), account_type: accountType, email: email.trim().toLowerCase(), provider: 'email' });
      else setMessage(isAr ? 'تحقق من بريدك لتأكيد الحساب.' : 'Check your email to confirm the account.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (isAr ? 'فشل إنشاء الحساب بالإيميل.' : 'Email registration failed.'));
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 space-y-4">
      <p className="text-center text-[11px] font-black text-blue-500/70">Supabase Auth · Phone first</p>
      <div className="space-y-4">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" placeholder={t('auth', 'full_name', isAr ? 'الاسم الكامل' : 'Full name')} required />
        <select value={accountType} onChange={(e) => setAccountType(e.target.value as any)} className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 font-bold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10">
          <option value="">{isAr ? 'اختر نوع الحساب' : 'Choose account type'}</option>
          <option value="investor">{t('auth', 'investor', isAr ? 'مستثمر' : 'Investor')}</option>
          <option value="owner">{t('auth', 'owner', isAr ? 'صاحب مشروع' : 'Project owner')}</option>
          <option value="both">{t('auth', 'both', isAr ? 'مستثمر وصاحب مشروع' : 'Investor and owner')}</option>
        </select>
      </div>

      <button type="button" onClick={registerWithGoogle} disabled={loading || !name.trim() || !accountType} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 font-black text-slate-900 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60">
        <Chrome size={21} />{isAr ? 'إنشاء/دخول بواسطة Google' : 'Continue with Google'}
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
          <button disabled={loading || !name.trim() || !accountType || phone.length < 6} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-6 py-4 font-black text-white shadow-lg shadow-blue-900/10 disabled:cursor-not-allowed disabled:opacity-60">
            <Smartphone size={19} />{loading ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'إرسال رمز التحقق' : 'Send verification code')}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">{isAr ? 'أدخل الرمز المرسل إلى' : 'Enter the code sent to'} <span dir="ltr" className="text-blue-700">{fullPhone}</span></div>
          <input value={otp} onChange={(e) => setOtp(digitsOnly(e.target.value).slice(0, 6))} inputMode="numeric" pattern="[0-9]*" maxLength={6} className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-center text-2xl font-black tracking-[0.35em] outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" placeholder="000000" required />
          {!!message && <p className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{message}</p>}
          <button disabled={loading || otp.length < 4} className="w-full rounded-2xl bg-blue-700 px-6 py-4 font-black text-white shadow-lg shadow-blue-900/10 disabled:cursor-not-allowed disabled:opacity-60">{loading ? (isAr ? 'جاري التحقق...' : 'Verifying...') : (isAr ? 'تأكيد وإنشاء الحساب' : 'Verify and create account')}</button>
          <button type="button" onClick={() => { setStep('phone'); setOtp(''); setMessage(''); }} className="w-full rounded-2xl bg-slate-100 px-6 py-3 font-black text-slate-700">{isAr ? 'تغيير رقم الهاتف' : 'Change phone number'}</button>
        </form>
      )}

      <button type="button" onClick={() => setShowEmail(!showEmail)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700"><Mail size={17} />{isAr ? 'إنشاء بالإيميل عند الحاجة' : 'Use email if needed'}</button>
      {showEmail && (
        <form onSubmit={registerWithEmail} className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none focus:border-blue-600" placeholder={isAr ? 'الإيميل' : 'Email'} required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none focus:border-blue-600" placeholder={isAr ? 'كلمة المرور' : 'Password'} required />
          <button disabled={loading || !name.trim() || !accountType || !email || password.length < 6} className="w-full rounded-2xl bg-slate-900 px-5 py-3 font-black text-white disabled:opacity-60">{isAr ? 'إنشاء بالإيميل' : 'Create with email'}</button>
        </form>
      )}

      <Link href={`/${country}/${lang}/login`} className="block text-center font-bold text-blue-700">{t('auth', 'already_have_account', isAr ? 'عندي حساب بالفعل' : 'I already have an account')}</Link>
    </div>
  );
}
