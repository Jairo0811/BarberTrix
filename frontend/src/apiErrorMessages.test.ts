import { describe, expect, it } from 'vitest'
import { ApiClientError } from './api'
import { apiErrorMessage } from './apiErrorMessages'

describe('localized API errors', () => {
  it('translates stable codes for every supported locale', () => {
    const error = new ApiClientError('backend text', 401, 'AUTH_SESSION_EXPIRED', 'corr-123')
    expect(apiErrorMessage(error, 'es-419', 'fallback')).toBe('Tu sesión expiró. Inicia sesión nuevamente.')
    expect(apiErrorMessage(error, 'en', 'fallback')).toBe('Your session expired. Sign in again.')
    expect(apiErrorMessage(error, 'es-ES', 'fallback')).toBe('Tu sesión ha caducado. Inicia sesión de nuevo.')
    expect(apiErrorMessage(error, 'ja', 'fallback')).toBe('セッションの有効期限が切れました。もう一度ログインしてください。')

    const businessError = new ApiClientError('backend text', 409, 'CUSTOMER_ALREADY_EXISTS', 'corr-124')
    expect(apiErrorMessage(businessError, 'es-419', 'fallback')).toBe('Ya existe un cliente con ese teléfono o correo.')
    expect(apiErrorMessage(businessError, 'en', 'fallback')).toBe('A customer with that phone number or email already exists.')
    expect(apiErrorMessage(businessError, 'es-ES', 'fallback')).toBe('Ya existe un cliente con ese teléfono o correo.')
    expect(apiErrorMessage(businessError, 'ja', 'fallback')).toBe('同じ電話番号またはメールアドレスの顧客がすでに存在します。')
  })

  it('keeps the structured backend message when a code is unknown for non-Japanese locales', () => {
    const error = new ApiClientError('Known server detail', 409, 'UNKNOWN_CODE', 'corr-456')
    expect(apiErrorMessage(error, 'es-419', 'fallback')).toBe('Known server detail')
  })

  it('never leaks an unknown English backend message into Japanese UI', () => {
    const error = new ApiClientError('Known server detail', 409, 'UNKNOWN_CODE', 'corr-789')
    expect(apiErrorMessage(error, 'ja', '日本語のフォールバック')).toBe('日本語のフォールバック')
  })

  it('uses the localized fallback for non-API errors in Japanese', () => {
    expect(apiErrorMessage(new Error('Network error'), 'ja', '通信エラー')).toBe('通信エラー')
    expect(apiErrorMessage('unexpected', 'ja', '通信エラー')).toBe('通信エラー')
  })
})
