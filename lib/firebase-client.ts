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
  return app ? getAuth(app) : null;
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

export function getOrCreateRecaptcha(containerId: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase غير مهيأ. أضف مفاتيح Firebase في .env و Vercel.');
  const w = window as any;
  const key = `__elo_recaptcha_${containerId}`;
  if (w[key]) return w[key] as RecaptchaVerifier;
  w[key] = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => undefined,
  });
  return w[key] as RecaptchaVerifier;
}

export async function sendFirebasePhoneOtp(phone: string, containerId = 'firebase-recaptcha-container'): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase غير مهيأ.');
  const verifier = getOrCreateRecaptcha(containerId);
  return signInWithPhoneNumber(auth, phone, verifier);
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
