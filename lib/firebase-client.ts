'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

export function hasFirebaseConfig() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!hasFirebaseConfig()) return null;
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  const auth = getAuth(app);
  try { auth.useDeviceLanguage(); } catch {}
  auth.languageCode = 'ar';
  if (process.env.NEXT_PUBLIC_FIREBASE_DISABLE_APP_VERIFICATION === 'true') {
    try { auth.settings.appVerificationDisabledForTesting = true; } catch {}
  }
  return auth;
}

export function firebaseUserToSupabaseLike(user: User | null) {
  if (!user) return null;
  const providerData = user.providerData?.[0] || null;
  const name = user.displayName || providerData?.displayName || user.phoneNumber || user.email || 'User';
  return {
    id: user.uid,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email || '',
    phone: user.phoneNumber || '',
    user_metadata: {
      name, full_name: name, display_name: name,
      avatar_url: user.photoURL || providerData?.photoURL || '',
      phone: user.phoneNumber || '',
      firebase_uid: user.uid,
      provider: providerData?.providerId || 'firebase',
    },
    app_metadata: { provider: providerData?.providerId || 'firebase', providers: ['firebase'] },
  } as any;
}

export async function getFirebaseIdToken() {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) return '';
  try {
    // ✅ FIX 3: Force refresh to avoid stale tokens causing reCAPTCHA/OTP failures
    return await auth.currentUser.getIdToken(false);
  } catch {
    return '';
  }
}

export function watchFirebaseAuth(callback: (user: User | null) => void) {
  const auth = getFirebaseAuth();
  if (!auth) return () => undefined;
  return onAuthStateChanged(auth, callback);
}

function friendlyFirebaseAuthError(error: any) {
  const raw = String(error?.code || error?.message || error || '');
  const lower = raw.toLowerCase();
  if (lower.includes('invalid-app-credential') || lower.includes('error-code:-39')) {
    return 'فشل تحقق reCAPTCHA. تأكد أن الدومين مضاف في Firebase → Authentication → Settings → Authorized domains، ثم حدّث الصفحة.';
  }
  if (lower.includes('captcha-check-failed')) return 'فشل reCAPTCHA. حدّث الصفحة وحاول مرة أخرى.';
  if (lower.includes('invalid-phone-number')) return 'رقم الهاتف غير صحيح. اكتب الرقم مع مفتاح الدولة (+968...).';
  if (lower.includes('too-many-requests')) return 'محاولات كثيرة جداً. انتظر دقيقة وحاول مرة أخرى.';
  if (lower.includes('quota-exceeded')) return 'تجاوزت حد رسائل SMS في Firebase.';
  if (lower.includes('operation-not-allowed')) return 'تسجيل الدخول بالهاتف غير مفعّل في Firebase Authentication.';
  if (lower.includes('unauthorized-domain')) return 'الدومين غير مضاف في Firebase Authorized domains.';
  if (lower.includes('missing-phone-number')) return 'أدخل رقم الهاتف مع مفتاح الدولة.';
  if (lower.includes('network-request-failed')) return 'فشل الاتصال. تحقق من الإنترنت وحاول مرة أخرى.';
  return error instanceof Error ? error.message : 'فشل إرسال رمز الدخول.';
}

// ✅ FIX 3: Improved reCAPTCHA — full cleanup before every attempt
export function clearRecaptcha(containerId: string) {
  if (typeof window === 'undefined') return;
  const w = window as any;
  const key = `__elo_recaptcha_${containerId}`;
  try { w[key]?.clear?.(); } catch {}
  try { w[key]?._reset?.(); } catch {}
  delete w[key];
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';
}

export function getOrCreateRecaptcha(containerId: string, size: 'normal' | 'invisible' = 'normal') {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase غير مهيأ. أضف مفاتيح Firebase في Vercel → Environment Variables.');
  if (typeof window === 'undefined') throw new Error('Firebase Phone Auth يعمل من المتصفح فقط.');

  const w = window as any;
  const key = `__elo_recaptcha_${containerId}`;
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`عنصر reCAPTCHA غير موجود في الصفحة: #${containerId}`);

  // ✅ Return existing only if still valid
  if (w[key] && container.children.length > 0) return w[key] as RecaptchaVerifier;

  // Always clear stale instance before creating new one
  clearRecaptcha(containerId);

  w[key] = new RecaptchaVerifier(auth, containerId, {
    size,
    callback: () => undefined,
    'expired-callback': () => { clearRecaptcha(containerId); },
  });

  return w[key] as RecaptchaVerifier;
}

export async function sendFirebasePhoneOtp(
  phone: string,
  containerId = 'firebase-recaptcha-container'
): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase غير مهيأ.');

  // ✅ FIX 3: Always clear + recreate verifier for each OTP attempt to avoid stale token errors
  clearRecaptcha(containerId);

  let verifier: RecaptchaVerifier;
  try {
    verifier = getOrCreateRecaptcha(containerId, 'normal');
    await verifier.render();
  } catch (renderError) {
    clearRecaptcha(containerId);
    throw new Error(friendlyFirebaseAuthError(renderError));
  }

  try {
    return await signInWithPhoneNumber(auth, phone, verifier);
  } catch (error) {
    clearRecaptcha(containerId);
    throw new Error(friendlyFirebaseAuthError(error));
  }
}

export async function signInWithFirebaseGoogle() {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase غير مهيأ.');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    throw new Error(friendlyFirebaseAuthError(error));
  }
}

export async function signOutFirebase() {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await firebaseSignOut(auth);
}
