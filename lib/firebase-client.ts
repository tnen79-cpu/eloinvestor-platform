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

  // لا نفعل تعطيل التحقق إلا إذا أضفت المتغير صراحة للتجارب.
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
      name,
      full_name: name,
      display_name: name,
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
  return auth.currentUser.getIdToken();
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
    return 'فشل تحقق reCAPTCHA. تأكد أن الدومين مضاف في Firebase Authorized domains، ثم حدّث الصفحة وجرب مرة أخرى.';
  }
  if (lower.includes('captcha-check-failed')) return 'فشل تحقق reCAPTCHA. حدّث الصفحة وحاول مرة أخرى.';
  if (lower.includes('invalid-phone-number')) return 'رقم الهاتف غير صحيح. اكتب الرقم مع مفتاح الدولة.';
  if (lower.includes('too-many-requests')) return 'تم إرسال محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.';
  if (lower.includes('quota-exceeded')) return 'تم تجاوز حد رسائل الهاتف في Firebase.';
  if (lower.includes('operation-not-allowed')) return 'مزود الهاتف غير مفعّل في Firebase Authentication.';
  if (lower.includes('unauthorized-domain')) return 'الدومين غير مضاف في Firebase Authorized domains.';
  return error instanceof Error ? error.message : 'فشل إرسال رمز الدخول.';
}

export function clearRecaptcha(containerId: string) {
  if (typeof window === 'undefined') return;
  const w = window as any;
  const key = `__elo_recaptcha_${containerId}`;
  try { w[key]?.clear?.(); } catch {}
  delete w[key];
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';
}

export function getOrCreateRecaptcha(containerId: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase غير مهيأ. أضف مفاتيح Firebase في Vercel.');
  if (typeof window === 'undefined') throw new Error('Firebase Phone Auth يعمل من المتصفح فقط.');

  const w = window as any;
  const key = `__elo_recaptcha_${containerId}`;
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`عنصر reCAPTCHA غير موجود: ${containerId}`);

  if (w[key]) return w[key] as RecaptchaVerifier;

  // نستخدم reCAPTCHA مرئي صغير بدل invisible لأن بعض الدومينات/المتصفحات تفشل مع invisible وتظهر auth/error-code:-39.
  w[key] = new RecaptchaVerifier(auth, containerId, {
    size: 'normal',
    callback: () => undefined,
    'expired-callback': () => {
      clearRecaptcha(containerId);
    },
  });

  return w[key] as RecaptchaVerifier;
}

export async function sendFirebasePhoneOtp(phone: string, containerId = 'firebase-recaptcha-container'): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase غير مهيأ.');
  try {
    // verifier جديد لكل محاولة يمنع token قديم أو recaptcha stale.
    clearRecaptcha(containerId);
    const verifier = getOrCreateRecaptcha(containerId);
    await verifier.render();
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
  return signInWithPopup(auth, provider);
}

export async function signOutFirebase() {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await firebaseSignOut(auth);
}
