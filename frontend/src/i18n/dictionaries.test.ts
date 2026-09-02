import { describe, expect, it } from 'vitest'
import { automaticLocales, mapDeviceLocale, strictLocales } from './I18nProvider'
import { dictionaries } from './dictionaries'
import { normalizeStoredLocale, officialLocales } from './officialLocales'
import type { Locale } from './types'

function sortedKeys(dictionary: Record<string, string>) {
  return Object.keys(dictionary).sort()
}

const strictCoreLocales: Locale[] = ['es-419', 'en', 'pt-BR', 'fr', 'de', 'it', 'ht', 'ja', 'ko', 'zh-CN']
const automaticProductionLocales: Locale[] = ['es-419', 'en', 'ja']
const officialProductLocales: Locale[] = ['es-419', 'en', 'pt-BR', 'fr', 'ht', 'de', 'it', 'ja', 'ko', 'zh-CN']

describe('i18n dictionary completeness', () => {
  it.each(strictCoreLocales)('keeps %s at full key parity with English', locale => {
    expect(sortedKeys(dictionaries[locale])).toEqual(sortedKeys(dictionaries.en))
  })

  it('keeps audited core locales strict so they cannot fall back to English', () => {
    expect([...strictLocales]).toEqual(strictCoreLocales)
  })

  it('keeps Korean and Simplified Chinese core UI native', () => {
    expect(dictionaries.ko['login.welcome']).toBe('다시 오신 것을 환영합니다')
    expect(dictionaries.ko['dashboard']).toBe('대시보드')
    expect(dictionaries.ko['booking.title']).toBe('당신의 시간도 중요합니다')
    expect(dictionaries['zh-CN']['login.welcome']).toBe('欢迎回来')
    expect(dictionaries['zh-CN']['dashboard']).toBe('控制面板')
    expect(dictionaries['zh-CN']['booking.title']).toBe('你的时间同样重要')
  })

  it('exposes only the ten official BarberTurn product locales', () => {
    expect([...officialLocales]).toEqual(officialProductLocales)
  })

  it('only auto-enables locales with end-to-end production coverage', () => {
    expect([...automaticLocales]).toEqual(automaticProductionLocales)
  })

  it('treats every Spanish device locale as the same Spanish product locale', () => {
    expect(mapDeviceLocale('es-DO')).toBe('es-419')
    expect(mapDeviceLocale('es-ES')).toBe('es-419')
    expect(mapDeviceLocale('es-MX')).toBe('es-419')
    expect(normalizeStoredLocale('es-ES')).toBe('es-419')
  })

  it('detects only production-ready locales from BCP 47 language tags', () => {
    expect(mapDeviceLocale('ja-JP')).toBe('ja')
    expect(mapDeviceLocale('en-US')).toBe('en')
    expect(mapDeviceLocale('ja_JP')).toBe('ja')
  })

  it('drops obsolete stored locale choices that are no longer official', () => {
    expect(normalizeStoredLocale('nl')).toBe('system')
    expect(normalizeStoredLocale('pl')).toBe('system')
    expect(normalizeStoredLocale(null)).toBe('system')
  })

  it('does not auto-enable official locales that still have unaudited product surfaces', () => {
    expect(mapDeviceLocale('pt-BR')).toBeNull()
    expect(mapDeviceLocale('fr-FR')).toBeNull()
    expect(mapDeviceLocale('de-DE')).toBeNull()
    expect(mapDeviceLocale('it-IT')).toBeNull()
    expect(mapDeviceLocale('ht-HT')).toBeNull()
    expect(mapDeviceLocale('zh-CN')).toBeNull()
    expect(mapDeviceLocale('ko-KR')).toBeNull()
  })

  it('ignores device locales that are no longer part of the product catalog', () => {
    expect(mapDeviceLocale('nl-NL')).toBeNull()
    expect(mapDeviceLocale('pl-PL')).toBeNull()
    expect(mapDeviceLocale('ar-SA')).toBeNull()
    expect(mapDeviceLocale('mi-NZ')).toBeNull()
  })
})
