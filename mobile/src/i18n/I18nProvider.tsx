import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { dictionaries } from './dictionaries';
import { officialLocales, officialLocaleSet } from './officialLocales';
import type { Locale, LocalePreference, TranslationValues } from './types';

type I18nContextValue = {
  locale: Locale;
  localePreference: LocalePreference;
  setLocalePreference: (preference: LocalePreference) => void;
  t: (key: string, values?: TranslationValues) => string;
};

export const automaticLocales = new Set<Locale>(officialLocales);
export const strictLocales = new Set<Locale>(officialLocales);

function asAutomaticLocale(locale: Locale): Locale | null {
  return automaticLocales.has(locale) ? locale : null;
}

export function mapDeviceLocale(deviceLocale?: string | null): Locale | null {
  const normalized = deviceLocale?.trim().toLowerCase().replaceAll('_', '-') ?? '';
  if (normalized === 'es' || normalized.startsWith('es-')) return asAutomaticLocale('es-419');
  if (normalized.startsWith('zh')) return asAutomaticLocale('zh-CN');

  const aliases: Array<[string[], Locale]> = [
    [['pt'], 'pt-BR'],
    [['fr'], 'fr'],
    [['ht'], 'ht'],
    [['de'], 'de'],
    [['it'], 'it'],
    [['ja'], 'ja'],
    [['ko'], 'ko'],
    [['en'], 'en'],
  ];

  for (const [prefixes, locale] of aliases) {
    if (prefixes.some(prefix => normalized === prefix || normalized.startsWith(`${prefix}-`))) {
      return asAutomaticLocale(locale);
    }
  }

  return null;
}

function resolveDeviceLocale(): Locale {
  const detected = mapDeviceLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  return detected ?? 'es-419';
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [localePreference, setLocalePreferenceState] = useState<LocalePreference>('system');
  const [systemLocale, setSystemLocale] = useState<Locale>(resolveDeviceLocale);
  const locale = localePreference === 'system' ? systemLocale : localePreference;

  const setLocalePreference = (preference: LocalePreference) => {
    const normalized = preference === 'system' || officialLocaleSet.has(preference) ? preference : 'system';
    setLocalePreferenceState(normalized);
    if (Platform.OS !== 'web') void SecureStore.setItemAsync('barbertrix.locale', normalized).catch(() => undefined);
  };

  useEffect(() => {
    let active = true;
    if (Platform.OS !== 'web') void SecureStore.getItemAsync('barbertrix.locale').then(saved => {
      if (active && saved && (saved === 'system' || officialLocaleSet.has(saved as Locale))) setLocalePreferenceState(saved as LocalePreference);
    }).catch(() => undefined);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setSystemLocale(resolveDeviceLocale());
    });
    return () => { active = false; subscription.remove(); };
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    localePreference,
    setLocalePreference,
    t: (key, values) => {
      const template = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
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
