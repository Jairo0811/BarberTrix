import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { dictionaries } from './dictionaries';
import type { Locale, LocalePreference, TranslationValues } from './types';

type I18nContextValue = {
  locale: Locale;
  localePreference: LocalePreference;
  setLocalePreference: (preference: LocalePreference) => void;
  t: (key: string, values?: TranslationValues) => string;
};

function resolveDeviceLocale(): Locale {
  const rawLocale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().replace('_', '-');
  if (rawLocale === 'es-es' || rawLocale.startsWith('es-es-')) return 'es-ES';
  const aliases: Array<[string[], Locale]> = [
    [['pt'], 'pt-BR'], [['fr'], 'fr'], [['de'], 'de'], [['it'], 'it'], [['nl'], 'nl'], [['ht'], 'ht'],
    [['pl'], 'pl'], [['ro'], 'ro'], [['sv'], 'sv'], [['da'], 'da'], [['nb','nn','no'], 'nb'], [['fi'], 'fi'], [['cs'], 'cs'], [['el'], 'el'], [['tr'], 'tr'], [['uk'], 'uk'], [['ru'], 'ru'],
    [['et'], 'et'], [['lv'], 'lv'], [['lt'], 'lt'], [['sk'], 'sk'], [['sl'], 'sl'], [['hr'], 'hr'], [['sr'], 'sr'], [['bs'], 'bs'], [['bg'], 'bg'], [['sq'], 'sq'], [['mk'], 'mk'], [['hu'], 'hu'], [['is'], 'is'], [['ga'], 'ga'], [['mt'], 'mt'], [['ca'], 'ca'], [['ka'], 'ka'], [['hy'], 'hy'], [['az'], 'az'],
    [['en'], 'en'], [['es'], 'es-419'],
  ];
  for (const [prefixes, locale] of aliases) {
    if (prefixes.some(prefix => rawLocale.startsWith(prefix))) return locale;
  }
  return 'es-419';
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [localePreference, setLocalePreference] = useState<LocalePreference>('system');
  const [systemLocale, setSystemLocale] = useState<Locale>(resolveDeviceLocale);
  const locale = localePreference === 'system' ? systemLocale : localePreference;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setSystemLocale(resolveDeviceLocale());
    });
    return () => subscription.remove();
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    localePreference,
    setLocalePreference,
    t: (key, values) => {
      const template = dictionaries[locale][key] ?? dictionaries.en[key] ?? dictionaries['es-419'][key] ?? key;
      if (!values) return template;
      return Object.entries(values).reduce((result, [name, replacement]) => result.replaceAll(`{{${name}}}`, String(replacement)), template);
    },
  }), [locale, localePreference]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
