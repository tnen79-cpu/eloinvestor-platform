'use client';

import { createContext, useContext, useMemo } from 'react';
import { i18nText } from '@/lib/i18n';
import type { UiTranslations } from '@/lib/server-data';

type I18nContextValue = {
  lang: string;
  translations: UiTranslations;
  t: (namespace: string, key: string, fallback?: string) => string;
};

const I18nContext = createContext<I18nContextValue>({
  lang: 'ar',
  translations: {},
  t: (_namespace, key, fallback) => fallback || key,
});

export function I18nProvider({ lang, translations = {}, children }: { lang: string; translations?: UiTranslations; children: React.ReactNode }) {
  const value = useMemo<I18nContextValue>(() => ({
    lang,
    translations,
    t: (namespace, key, fallback = '') => i18nText(translations, namespace, key, lang, fallback),
  }), [lang, translations]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
