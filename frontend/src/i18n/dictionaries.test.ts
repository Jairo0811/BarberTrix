import { describe, expect, it } from 'vitest'
import { automaticLocales, mapDeviceLocale } from './I18nProvider'
import { dictionaries } from './dictionaries'

function sortedKeys(dictionary: Record<string, string>) {
  return Object.keys(dictionary).sort()
}

describe('i18n dictionary completeness', () => {
  it('keeps Japanese at full key parity with English', () => {
    expect(sortedKeys(dictionaries.ja)).toEqual(sortedKeys(dictionaries.en))
  })

  it('only auto-enables locales with complete production coverage', () => {
    expect([...automaticLocales]).toEqual(['es-419', 'en', 'es-ES', 'ja'])
  })

  it('detects complete locales from BCP 47 language tags', () => {
    expect(mapDeviceLocale('ja-JP')).toBe('ja')
    expect(mapDeviceLocale('en-US')).toBe('en')
    expect(mapDeviceLocale('es-DO')).toBe('es-419')
    expect(mapDeviceLocale('es-ES')).toBe('es-ES')
    expect(mapDeviceLocale('ja_JP')).toBe('ja')
  })

  it('does not auto-enable partial locales that would fall back to English', () => {
    expect(mapDeviceLocale('pt-BR')).toBeNull()
    expect(mapDeviceLocale('fr-FR')).toBeNull()
    expect(mapDeviceLocale('zh-CN')).toBeNull()
    expect(mapDeviceLocale('ar-SA')).toBeNull()
    expect(mapDeviceLocale('ko-KR')).toBeNull()
    expect(mapDeviceLocale('mi-NZ')).toBeNull()
  })
})
