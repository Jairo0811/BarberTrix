import { describe, expect, it } from 'vitest'
import { automaticLocales, mapDeviceLocale } from './I18nProvider'
import { dictionaries } from './dictionaries'
import type { Locale } from './types'

function sortedKeys(dictionary: Record<string, string>) {
  return Object.keys(dictionary).sort()
}

const completeLocales: Locale[] = ['es-419', 'en', 'es-ES', 'pt-BR', 'fr', 'de', 'it', 'nl', 'ht', 'ja']

describe('i18n dictionary completeness', () => {
  it.each(completeLocales)('keeps %s at full key parity with English', locale => {
    expect(sortedKeys(dictionaries[locale])).toEqual(sortedKeys(dictionaries.en))
  })

  it('only auto-enables locales with complete production coverage', () => {
    expect([...automaticLocales]).toEqual(completeLocales)
  })

  it('detects complete locales from BCP 47 language tags', () => {
    expect(mapDeviceLocale('ja-JP')).toBe('ja')
    expect(mapDeviceLocale('en-US')).toBe('en')
    expect(mapDeviceLocale('es-DO')).toBe('es-419')
    expect(mapDeviceLocale('es-ES')).toBe('es-ES')
    expect(mapDeviceLocale('pt-BR')).toBe('pt-BR')
    expect(mapDeviceLocale('fr-FR')).toBe('fr')
    expect(mapDeviceLocale('de-DE')).toBe('de')
    expect(mapDeviceLocale('it-IT')).toBe('it')
    expect(mapDeviceLocale('nl-NL')).toBe('nl')
    expect(mapDeviceLocale('ht-HT')).toBe('ht')
    expect(mapDeviceLocale('ja_JP')).toBe('ja')
  })

  it('does not auto-enable partial locales that would fall back to English', () => {
    expect(mapDeviceLocale('pl-PL')).toBeNull()
    expect(mapDeviceLocale('zh-CN')).toBeNull()
    expect(mapDeviceLocale('ar-SA')).toBeNull()
    expect(mapDeviceLocale('ko-KR')).toBeNull()
    expect(mapDeviceLocale('mi-NZ')).toBeNull()
  })
})
