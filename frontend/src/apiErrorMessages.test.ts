import { describe, expect, it } from 'vitest'
import { ApiClientError } from './api'
import { apiErrorMessage } from './apiErrorMessages'

describe('localized API errors', () => {
  it('translates stable codes for every supported locale', () => {
    const error = new ApiClientError('backend text', 401, 'AUTH_SESSION_EXPIRED', 'corr-123')
    expect(apiErrorMessage(error, 'es-419', 'fallback')).toBe('Tu sesión expiró. Inicia sesión nuevamente.')
    expect(apiErrorMessage(error, 'en', 'fallback')).toBe('Your session expired. Sign in again.')
    expect(apiErrorMessage(error, 'es-ES', 'fallback')).toBe('Tu sesión ha caducado. Inicia sesión de nuevo.')

    const businessError = new ApiClientError('backend text', 409, 'CUSTOMER_ALREADY_EXISTS', 'corr-124')
    expect(apiErrorMessage(businessError, 'es-419', 'fallback')).toBe('Ya existe un cliente con ese teléfono o correo.')
    expect(apiErrorMessage(businessError, 'en', 'fallback')).toBe('A customer with that phone number or email already exists.')
    expect(apiErrorMessage(businessError, 'es-ES', 'fallback')).toBe('Ya existe un cliente con ese teléfono o correo.')
  })

  it('keeps the structured backend message when a code is unknown', () => {
    const error = new ApiClientError('Known server detail', 409, 'UNKNOWN_CODE', 'corr-456')
    expect(apiErrorMessage(error, 'es-419', 'fallback')).toBe('Known server detail')
  })
})
