import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { dictionaries } from './dictionaries'
import type { Locale, TranslationValues } from './types'

const storageKey = 'barberturn.locale'

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, values?: TranslationValues) => string
}

function resolveInitialLocale(): Locale {
  const stored = localStorage.getItem(storageKey)
  if (stored === 'es-419' || stored === 'en' || stored === 'es-ES') return stored
  const browserLocale = navigator.language.toLowerCase()
  if (browserLocale === 'es-es') return 'es-ES'
  if (browserLocale.startsWith('en')) return 'en'
  return 'es-419'
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(resolveInitialLocale)
  const setLocale = (nextLocale: Locale) => {
    localStorage.setItem(storageKey, nextLocale)
    setLocaleState(nextLocale)
  }

  useEffect(() => { document.documentElement.lang = locale }, [locale])

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t: (key, values) => {
      const template = dictionaries[locale][key] ?? dictionaries['es-419'][key] ?? key
      if (!values) return template
      return Object.entries(values).reduce(
        (result, [name, replacement]) => result.replaceAll(`{{${name}}}`, String(replacement)),
        template,
      )
    },
  }), [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
