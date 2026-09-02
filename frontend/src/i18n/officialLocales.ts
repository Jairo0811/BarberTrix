import type { Locale } from './types'

export const officialLocales = [
  'es-419',
  'en',
  'pt-BR',
  'fr',
  'ht',
  'de',
  'it',
  'ja',
  'ko',
  'zh-CN',
] as const satisfies readonly Locale[]

export type OfficialLocale = (typeof officialLocales)[number]

export const officialLocaleSet = new Set<Locale>(officialLocales)

export const officialLocaleLabels: Record<OfficialLocale, string> = {
  'es-419': 'Español',
  en: 'English',
  'pt-BR': 'Português',
  fr: 'Français',
  ht: 'Kreyòl ayisyen',
  de: 'Deutsch',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  'zh-CN': '简体中文',
}

export function normalizeStoredLocale(value: string | null): Locale | 'system' {
  if (!value) return 'system'
  if (value === 'es-ES') return 'es-419'
  const candidate = value as Locale
  return officialLocaleSet.has(candidate) ? candidate : 'system'
}
