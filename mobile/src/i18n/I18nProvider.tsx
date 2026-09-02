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
  if (rawLocale.startsWith('pt')) return 'pt-BR';
  if (rawLocale.startsWith('fr')) return 'fr';
  if (rawLocale.startsWith('de')) return 'de';
  if (rawLocale.startsWith('it')) return 'it';
  if (rawLocale.startsWith('nl')) return 'nl';
  if (rawLocale.startsWith('ht')) return 'ht';
  if (rawLocale.startsWith('en')) return 'en';
  if (rawLocale.startsWith('es')) return 'es-419';
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
      return Object.entries(values).reduce(
        (result, [name, replacement]) => result.replaceAll(`{{${name}}}`, String(replacement)),
        template,
      );
    },
  }), [locale, localePreference]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
