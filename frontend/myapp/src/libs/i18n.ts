import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import ur from '@/locales/ur.json';

export const SUPPORTED_LOCALES = ['en', 'ur'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const STORAGE_KEY = 'zentro-locale';

function getInitialLocale(): SupportedLocale {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored === 'en' || stored === 'ur') {
    return stored;
  }

  return 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ur: { translation: ur },
  },
  lng: getInitialLocale(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
    prefix: '{',
    suffix: '}',
  },
});

function applyDocumentLocale(lng: string) {
  localStorage.setItem(STORAGE_KEY, lng);
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'ur' ? 'rtl' : 'ltr';
}

i18n.on('languageChanged', applyDocumentLocale);

applyDocumentLocale(i18n.language);

export default i18n;
