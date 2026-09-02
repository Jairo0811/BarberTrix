import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { dictionaries } from './dictionaries'
import type { Locale, TranslationValues } from './types'

const storageKey = 'barberturn.locale'
export type LocalePreference = 'system' | Locale

const supportedLocales: Locale[] = [
  'es-419','en','es-ES','pt-BR','fr','de','it','nl','ht','pl','ro','sv','da','nb','fi','cs','el','tr','uk','ru','et','lv','lt','sk','sl','hr','sr','bs','bg','sq','mk','hu','is','ga','mt','ca','ka','hy','az','ar','sw','af','am','so','ha','yo','ig','zu','xh','wo','ln','rw','rn','st','tn','sn','ny','mg','ti','om','ak','zh-CN','zh-TW','ja','ko','hi','bn','ur','id','ms','vi','th','fil','fa','ta','te','mr','gu','pa','kn','ml','ne','si','my','km','lo','mn','kk','uz','ky','tg','mi','sm','to','fj','bi','tpi','ho','gil','mh','na','pau','tvl',
]

const rtlLocales = new Set<Locale>(['ar', 'ur', 'fa'])
const strictLocales = new Set<Locale>(['ja'])

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
  if (normalized.startsWith('zh-tw') || normalized.startsWith('zh-hk') || normalized.startsWith('zh-mo') || normalized.startsWith('zh-hant')) return 'zh-TW'
  if (normalized.startsWith('zh')) return 'zh-CN'
  const aliases: Array<[string[], Locale]> = [
    [['pt'],'pt-BR'],[['fr'],'fr'],[['de'],'de'],[['it'],'it'],[['nl'],'nl'],[['ht'],'ht'],[['pl'],'pl'],[['ro'],'ro'],[['sv'],'sv'],[['da'],'da'],[['nb','nn','no'],'nb'],[['fi'],'fi'],[['cs'],'cs'],[['el'],'el'],[['tr'],'tr'],[['uk'],'uk'],[['ru'],'ru'],[['et'],'et'],[['lv'],'lv'],[['lt'],'lt'],[['sk'],'sk'],[['sl'],'sl'],[['hr'],'hr'],[['sr'],'sr'],[['bs'],'bs'],[['bg'],'bg'],[['sq'],'sq'],[['mk'],'mk'],[['hu'],'hu'],[['is'],'is'],[['ga'],'ga'],[['mt'],'mt'],[['ca'],'ca'],[['ka'],'ka'],[['hy'],'hy'],[['az'],'az'],
    [['ar'],'ar'],[['sw'],'sw'],[['af'],'af'],[['am'],'am'],[['so'],'so'],[['ha'],'ha'],[['yo'],'yo'],[['ig'],'ig'],[['zu'],'zu'],[['xh'],'xh'],[['wo'],'wo'],[['ln'],'ln'],[['rw'],'rw'],[['rn'],'rn'],[['st'],'st'],[['tn'],'tn'],[['sn'],'sn'],[['ny'],'ny'],[['mg'],'mg'],[['ti'],'ti'],[['om'],'om'],[['ak'],'ak'],
    [['ja'],'ja'],[['ko'],'ko'],[['hi'],'hi'],[['bn'],'bn'],[['ur'],'ur'],[['id'],'id'],[['ms'],'ms'],[['vi'],'vi'],[['th'],'th'],[['fil','tl'],'fil'],[['fa'],'fa'],[['ta'],'ta'],[['te'],'te'],[['mr'],'mr'],[['gu'],'gu'],[['pa'],'pa'],[['kn'],'kn'],[['ml'],'ml'],[['ne'],'ne'],[['si'],'si'],[['my'],'my'],[['km'],'km'],[['lo'],'lo'],[['mn'],'mn'],[['kk'],'kk'],[['uz'],'uz'],[['ky'],'ky'],[['tg'],'tg'],
    [['mi'],'mi'],[['sm'],'sm'],[['to'],'to'],[['fj'],'fj'],[['bi'],'bi'],[['tpi'],'tpi'],[['ho'],'ho'],[['gil'],'gil'],[['mh'],'mh'],[['na'],'na'],[['pau'],'pau'],[['tvl'],'tvl'],[['en'],'en'],[['es'],'es-419'],
  ]
  for (const [prefixes, locale] of aliases) if (prefixes.some(prefix => normalized === prefix || normalized.startsWith(`${prefix}-`))) return locale
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
    document.documentElement.dir = rtlLocales.has(locale) ? 'rtl' : 'ltr'
  }, [locale])

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    localePreference,
    setLocale,
    setLocalePreference,
    t: (key, values) => {
      const localized = dictionaries[locale][key]
      const template = strictLocales.has(locale)
        ? localized ?? key
        : localized ?? dictionaries.en[key] ?? dictionaries['es-419'][key] ?? key
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
