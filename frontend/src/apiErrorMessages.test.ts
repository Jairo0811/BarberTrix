import { describe, expect, it } from 'vitest'
import { ApiClientError } from './api'
import { apiErrorMessage } from './apiErrorMessages'

const noEnglishFallbackLocales = ['pt-BR', 'fr', 'de', 'it', 'nl', 'ht', 'ja', 'ko', 'zh-CN'] as const

describe('localized API errors', () => {
  it('translates stable codes for locales with dedicated error catalogs', () => {
    const error = new ApiClientError('backend text', 401, 'AUTH_SESSION_EXPIRED', 'corr-123')
    expect(apiErrorMessage(error, 'es-419', 'fallback')).toBe('Tu sesión expiró. Inicia sesión nuevamente.')
    expect(apiErrorMessage(error, 'en', 'fallback')).toBe('Your session expired. Sign in again.')
    expect(apiErrorMessage(error, 'es-ES', 'fallback')).toBe('Tu sesión ha caducado. Inicia sesión de nuevo.')
    expect(apiErrorMessage(error, 'ja', 'fallback')).toBe('セッションの有効期限が切れました。もう一度ログインしてください。')
    expect(apiErrorMessage(error, 'ko', 'fallback')).toBe('세션이 만료되었습니다. 다시 로그인하세요.')
    expect(apiErrorMessage(error, 'zh-CN', 'fallback')).toBe('会话已过期，请重新登录。')

    const businessError = new ApiClientError('backend text', 409, 'CUSTOMER_ALREADY_EXISTS', 'corr-124')
    expect(apiErrorMessage(businessError, 'es-419', 'fallback')).toBe('Ya existe un cliente con ese teléfono o correo.')
    expect(apiErrorMessage(businessError, 'en', 'fallback')).toBe('A customer with that phone number or email already exists.')
    expect(apiErrorMessage(businessError, 'es-ES', 'fallback')).toBe('Ya existe un cliente con ese teléfono o correo.')
    expect(apiErrorMessage(businessError, 'ja', 'fallback')).toBe('同じ電話番号またはメールアドレスの顧客がすでに存在します。')
    expect(apiErrorMessage(businessError, 'ko', 'fallback')).toBe('같은 전화번호 또는 이메일의 고객이 이미 존재합니다.')
    expect(apiErrorMessage(businessError, 'zh-CN', 'fallback')).toBe('已存在使用该电话号码或邮箱的顾客。')
  })

  it('keeps the structured backend message when a code is unknown for non-strict locales', () => {
    const error = new ApiClientError('Known server detail', 409, 'UNKNOWN_CODE', 'corr-456')
    expect(apiErrorMessage(error, 'es-419', 'fallback')).toBe('Known server detail')
  })

  it.each(noEnglishFallbackLocales)('never leaks an English backend message into %s UI', locale => {
    const error = new ApiClientError('Known server detail', 409, 'UNKNOWN_CODE', 'corr-789')
    const fallback = `localized fallback ${locale}`
    expect(apiErrorMessage(error, locale, fallback)).toBe(fallback)
  })

  it.each(noEnglishFallbackLocales)('uses the localized fallback for non-API errors in %s', locale => {
    const fallback = `localized network error ${locale}`
    expect(apiErrorMessage(new Error('Network error'), locale, fallback)).toBe(fallback)
    expect(apiErrorMessage('unexpected', locale, fallback)).toBe(fallback)
  })
})
