import { describe, expect, it } from 'vitest'
import { automaticLocales, mapDeviceLocale, strictLocales } from './I18nProvider'
import { dictionaries } from './dictionaries'
import type { Locale } from './types'

function sortedKeys(dictionary: Record<string, string>) {
  return Object.keys(dictionary).sort()
}

const strictCoreLocales: Locale[] = ['es-419', 'en', 'es-ES', 'pt-BR', 'fr', 'de', 'it', 'nl', 'ht', 'ja']
const automaticProductionLocales: Locale[] = ['es-419', 'en', 'es-ES', 'ja']

describe('i18n dictionary completeness', () => {
  it.each(strictCoreLocales)('keeps %s at full key parity with English', locale => {
    expect(sortedKeys(dictionaries[locale])).toEqual(sortedKeys(dictionaries.en))
  })

  it('keeps audited core locales strict so they cannot fall back to English', () => {
    expect([...strictLocales]).toEqual(strictCoreLocales)
  })

  it('only auto-enables locales with end-to-end production coverage', () => {
    expect([...automaticLocales]).toEqual(automaticProductionLocales)
  })

  it('detects only production-ready locales from BCP 47 language tags', () => {
    expect(mapDeviceLocale('ja-JP')).toBe('ja')
    expect(mapDeviceLocale('en-US')).toBe('en')
    expect(mapDeviceLocale('es-DO')).toBe('es-419')
    expect(mapDeviceLocale('es-ES')).toBe('es-ES')
    expect(mapDeviceLocale('ja_JP')).toBe('ja')
  })

  it('does not auto-enable locales that still have unaudited product surfaces', () => {
    expect(mapDeviceLocale('pt-BR')).toBeNull()
    expect(mapDeviceLocale('fr-FR')).toBeNull()
    expect(mapDeviceLocale('de-DE')).toBeNull()
    expect(mapDeviceLocale('it-IT')).toBeNull()
    expect(mapDeviceLocale('nl-NL')).toBeNull()
    expect(mapDeviceLocale('ht-HT')).toBeNull()
    expect(mapDeviceLocale('pl-PL')).toBeNull()
    expect(mapDeviceLocale('zh-CN')).toBeNull()
    expect(mapDeviceLocale('ar-SA')).toBeNull()
    expect(mapDeviceLocale('ko-KR')).toBeNull()
    expect(mapDeviceLocale('mi-NZ')).toBeNull()
  })
})
