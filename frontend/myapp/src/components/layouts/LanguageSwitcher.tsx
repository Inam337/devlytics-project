import { useT } from '@/hooks/use-t';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/libs/i18n';

const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'EN',
  ur: 'اردو',
};

export default function LanguageSwitcher() {
  const { t, locale, setLocale } = useT();

  return (
    <div className="flex items-center">
      <label className="sr-only" htmlFor="language-switcher">
        {t('i18n.language', 'Language')}
      </label>
      <select
      id="language-switcher"
      value={locale}
      onChange={e => setLocale(e.target.value as SupportedLocale)}
      className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700"
      aria-label={t('i18n.language', 'Language')}
    >
      {SUPPORTED_LOCALES.map(code => (
        <option
          key={code}
          value={code}
        >
          {LOCALE_LABELS[code]}
        </option>
      ))}
      </select>
    </div>
  );
}
