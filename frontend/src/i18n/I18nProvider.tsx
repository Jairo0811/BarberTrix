import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { dictionaries } from './dictionaries'
import type { Locale, TranslationValues } from './types'

const storageKey = 'barberturn.locale'
export type LocalePreference = 'system' | Locale

type I18nContextValue = {
  locale: Locale
  localePreference: LocalePreference
  setLocale: (locale: Locale) => void
  setLocalePreference: (preference: LocalePreference) => void
  t: (key: string, values?: TranslationValues) => string
}

function mapDeviceLocale(deviceLocale?: string | null): Locale {
  const normalized = deviceLocale?.trim().toLowerCase().replace('_', '-') ?? ''

  if (normalized === 'es-es' || normalized.startsWith('es-es-')) return 'es-ES'
  if (normalized.startsWith('en')) return 'en'
  if (normalized.startsWith('es')) return 'es-419'

  return 'es-419'
}

function resolveSystemLocale(): Locale {
  const preferredLocales = navigator.languages?.length ? navigator.languages : [navigator.language]
  return mapDeviceLocale(preferredLocales.find(Boolean))
}

function resolveInitialPreference(): LocalePreference {
  const stored = localStorage.getItem(storageKey)
  if (stored === 'es-419' || stored === 'en' || stored === 'es-ES') return stored
  return 'system'
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
      const template = dictionaries[locale][key] ?? dictionaries['es-419'][key] ?? key
      if (!values) return template
      return Object.entries(values).reduce(
        (result, [name, replacement]) => result.replaceAll(`{{${name}}}`, String(replacement)),
        template,
      )
    },
  }), [locale, localePreference])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
