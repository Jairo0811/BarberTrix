import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { dictionaries } from './dictionaries'
import { normalizeStoredLocale, officialLocales, officialLocaleSet } from './officialLocales'
import type { Locale, TranslationValues } from './types'

const storageKey = 'barbertrix.locale'
export type LocalePreference = 'system' | Locale

export const automaticLocales = new Set<Locale>(officialLocales)
export const strictLocales = new Set<Locale>(officialLocales)

type I18nContextValue = {
  locale: Locale
  localePreference: LocalePreference
  setLocale: (locale: Locale) => void
  setLocalePreference: (preference: LocalePreference) => void
  t: (key: string, values?: TranslationValues) => string
}

function asAutomaticLocale(locale: Locale): Locale | null {
  return automaticLocales.has(locale) ? locale : null
}

export function mapDeviceLocale(deviceLocale?: string | null): Locale | null {
  const normalized = deviceLocale?.trim().toLowerCase().replaceAll('_', '-') ?? ''
  if (normalized === 'es' || normalized.startsWith('es-')) return asAutomaticLocale('es-419')
  if (normalized.startsWith('zh')) return asAutomaticLocale('zh-CN')

  const aliases: Array<[string[], Locale]> = [
    [['pt'], 'pt-BR'],
    [['fr'], 'fr'],
    [['ht'], 'ht'],
    [['de'], 'de'],
    [['it'], 'it'],
    [['ja'], 'ja'],
    [['ko'], 'ko'],
    [['en'], 'en'],
  ]

  for (const [prefixes, locale] of aliases) {
    if (prefixes.some(prefix => normalized === prefix || normalized.startsWith(`${prefix}-`))) {
      return asAutomaticLocale(locale)
    }
  }

  return null
}

function resolveSystemLocale(): Locale {
  const preferredLocales = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const candidate of preferredLocales) {
    const locale = mapDeviceLocale(candidate)
    if (locale) return locale
  }
  return 'es-419'
}

function resolveInitialPreference(): LocalePreference {
  const stored = localStorage.getItem(storageKey)
  const normalized = normalizeStoredLocale(stored)

  if (normalized === 'system') {
    if (stored) localStorage.removeItem(storageKey)
    return 'system'
  }

  if (stored !== normalized) localStorage.setItem(storageKey, normalized)
  return normalized
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [localePreference, setLocalePreferenceState] = useState<LocalePreference>(resolveInitialPreference)
  const [systemLocale, setSystemLocale] = useState<Locale>(resolveSystemLocale)
  const locale = localePreference === 'system' ? systemLocale : localePreference

  const setLocalePreference = (preference: LocalePreference) => {
    const normalized = preference === 'system' || officialLocaleSet.has(preference) ? preference : 'system'
    if (normalized === 'system') localStorage.removeItem(storageKey)
    else localStorage.setItem(storageKey, normalized)
    setLocalePreferenceState(normalized)
  }

  const setLocale = (nextLocale: Locale) => setLocalePreference(nextLocale)

  useEffect(() => {
    const syncSystemLocale = () => setSystemLocale(resolveSystemLocale())
    window.addEventListener('languagechange', syncSystemLocale)
    return () => window.removeEventListener('languagechange', syncSystemLocale)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = 'ltr'
  }, [locale])

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    localePreference,
    setLocale,
    setLocalePreference,
    t: (key, values) => {
      const template = dictionaries[locale][key] ?? key
      if (!values) return template
      return Object.entries(values).reduce((result, [name, replacement]) => result.replaceAll(`{{${name}}}`, String(replacement)), template)
    },
  }), [locale, localePreference])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
