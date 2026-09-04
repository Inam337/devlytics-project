import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { SupportedLocale } from '@/libs/i18n';

/** Simple `t(id, defaultMessage?, values?)` — replaces react-intl `formatMessage`. */
export function useT() {
  const { t: i18nT, i18n } = useTranslation();

  const t = useCallback(
    (id: string, defaultMessage?: string, values?: Record<string, string | number>) =>
      i18nT(id, { defaultValue: defaultMessage ?? id, ...values }),
    [i18nT],
  );

  const setLocale = useCallback(
    (locale: SupportedLocale) => {
      void i18n.changeLanguage(locale);
    },
    [i18n],
  );

  return {
    t,
    locale: i18n.language as SupportedLocale,
    setLocale,
  };
}
