import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { dictionaries } from './dictionaries'
import type { Locale, TranslationValues } from './types'

const storageKey = 'barberturn.locale'
export type LocalePreference = 'system' | Locale

const supportedLocales: Locale[] = [
  'es-419', 'en', 'es-ES', 'pt-BR', 'fr', 'de', 'it', 'nl', 'ht',
  'pl', 'ro', 'sv', 'da', 'nb', 'fi', 'cs', 'el', 'tr', 'uk', 'ru',
  'et', 'lv', 'lt', 'sk', 'sl', 'hr', 'sr', 'bs', 'bg', 'sq', 'mk', 'hu', 'is', 'ga', 'mt', 'ca', 'ka', 'hy', 'az',
]

type I18nContextValue = {
  locale: Locale
  localePreference: LocalePreference
  setLocale: (locale: Locale) => void
  setLocalePreference: (preference: LocalePreference) => void
  t: (key: string, values?: TranslationValues) => string
}

function mapDeviceLocale(deviceLocale?: string | null): Locale | null {
  const normalized = deviceLocale?.trim().toLowerCase().replace('_', '-') ?? ''
  if (normalized === 'es-es' || normalized.startsWith('es-es-')) return 'es-ES'
  const aliases: Array<[string[], Locale]> = [
    [['pt'], 'pt-BR'], [['fr'], 'fr'], [['de'], 'de'], [['it'], 'it'], [['nl'], 'nl'], [['ht'], 'ht'],
    [['pl'], 'pl'], [['ro'], 'ro'], [['sv'], 'sv'], [['da'], 'da'], [['nb','nn','no'], 'nb'], [['fi'], 'fi'], [['cs'], 'cs'], [['el'], 'el'], [['tr'], 'tr'], [['uk'], 'uk'], [['ru'], 'ru'],
    [['et'], 'et'], [['lv'], 'lv'], [['lt'], 'lt'], [['sk'], 'sk'], [['sl'], 'sl'], [['hr'], 'hr'], [['sr'], 'sr'], [['bs'], 'bs'], [['bg'], 'bg'], [['sq'], 'sq'], [['mk'], 'mk'], [['hu'], 'hu'], [['is'], 'is'], [['ga'], 'ga'], [['mt'], 'mt'], [['ca'], 'ca'], [['ka'], 'ka'], [['hy'], 'hy'], [['az'], 'az'],
    [['en'], 'en'], [['es'], 'es-419'],
  ]
  for (const [prefixes, locale] of aliases) {
    if (prefixes.some(prefix => normalized.startsWith(prefix))) return locale
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
  return supportedLocales.includes(stored as Locale) ? stored as Locale : 'system'
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [localePreference, setLocalePreferenceState] = useState<LocalePreference>(resolveInitialPreference)
  const [systemLocale, setSystemLocale] = useState<Locale>(resolveSystemLocale)
  const locale = localePreference === 'system' ? systemLocale : localePreference

  const setLocalePreference = (preference: LocalePreference) => {
    if (preference === 'system') localStorage.removeItem(storageKey)
    else localStorage.setItem(storageKey, preference)
    setLocalePreferenceState(preference)
  }

  const setLocale = (nextLocale: Locale) => setLocalePreference(nextLocale)

  useEffect(() => {
    const syncSystemLocale = () => setSystemLocale(resolveSystemLocale())
    window.addEventListener('languagechange', syncSystemLocale)
    return () => window.removeEventListener('languagechange', syncSystemLocale)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    localePreference,
    setLocale,
    setLocalePreference,
    t: (key, values) => {
      const template = dictionaries[locale][key] ?? dictionaries.en[key] ?? dictionaries['es-419'][key] ?? key
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
