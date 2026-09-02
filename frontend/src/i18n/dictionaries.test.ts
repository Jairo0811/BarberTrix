import { describe, expect, it } from 'vitest'
import { automaticLocales, mapDeviceLocale, strictLocales } from './I18nProvider'
import { dictionaries } from './dictionaries'
import { normalizeStoredLocale, officialLocales } from './officialLocales'
import type { Locale } from './types'

function sortedKeys(dictionary: Record<string, string>) {
  return Object.keys(dictionary).sort()
}

const officialProductLocales: Locale[] = ['es-419', 'en', 'pt-BR', 'fr', 'ht', 'de', 'it', 'ja', 'ko', 'zh-CN']

describe('i18n dictionary completeness', () => {
  it.each(officialProductLocales)('keeps %s at full key parity with English', locale => {
    expect(sortedKeys(dictionaries[locale])).toEqual(sortedKeys(dictionaries.en))
  })

  it('keeps every official locale strict so no product locale can fall back to English', () => {
    expect([...strictLocales]).toEqual(officialProductLocales)
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

  it('auto-enables every official locale with end-to-end production coverage', () => {
    expect([...automaticLocales]).toEqual(officialProductLocales)
  })

  it('treats every Spanish device locale as the same Spanish product locale', () => {
    expect(mapDeviceLocale('es-DO')).toBe('es-419')
    expect(mapDeviceLocale('es-ES')).toBe('es-419')
    expect(mapDeviceLocale('es-MX')).toBe('es-419')
    expect(normalizeStoredLocale('es-ES')).toBe('es-419')
  })

  it('detects every official locale from BCP 47 language tags', () => {
    expect(mapDeviceLocale('en-US')).toBe('en')
    expect(mapDeviceLocale('pt-BR')).toBe('pt-BR')
    expect(mapDeviceLocale('fr-FR')).toBe('fr')
    expect(mapDeviceLocale('ht-HT')).toBe('ht')
    expect(mapDeviceLocale('de-DE')).toBe('de')
    expect(mapDeviceLocale('it-IT')).toBe('it')
    expect(mapDeviceLocale('ja-JP')).toBe('ja')
    expect(mapDeviceLocale('ja_JP')).toBe('ja')
    expect(mapDeviceLocale('ko-KR')).toBe('ko')
    expect(mapDeviceLocale('zh-CN')).toBe('zh-CN')
  })

  it('drops obsolete stored locale choices that are no longer official', () => {
    expect(normalizeStoredLocale('nl')).toBe('system')
    expect(normalizeStoredLocale('pl')).toBe('system')
    expect(normalizeStoredLocale(null)).toBe('system')
  })

  it('ignores device locales that are no longer part of the product catalog', () => {
    expect(mapDeviceLocale('nl-NL')).toBeNull()
    expect(mapDeviceLocale('pl-PL')).toBeNull()
    expect(mapDeviceLocale('ar-SA')).toBeNull()
    expect(mapDeviceLocale('mi-NZ')).toBeNull()
  })
})
