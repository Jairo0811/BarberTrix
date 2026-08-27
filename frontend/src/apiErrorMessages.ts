import type { Locale } from './i18n'
import { ApiClientError } from './api'

const messages: Record<Locale, Record<string, string>> = {
  'es-419': {
    AUTH_INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
    AUTH_REFRESH_REQUIRED: 'Tu sesión necesita renovarse.',
    AUTH_REFRESH_INVALID: 'Tu sesión expiró. Inicia sesión nuevamente.',
    AUTH_SESSION_EXPIRED: 'Tu sesión expiró. Inicia sesión nuevamente.',
    AUTH_REGISTRATION_CONFLICT: 'Ya existe una cuenta o barbería con esos datos.',
    AUTH_REGISTRATION_INVALID: 'Revisa los datos del registro e inténtalo nuevamente.',
    AUTH_EMAIL_REQUIRED: 'El correo electrónico es obligatorio.',
    AUTH_PASSWORD_RESET_INVALID: 'El enlace de recuperación no es válido o ya expiró.',
    AUTH_EMAIL_VERIFICATION_INVALID: 'El enlace de verificación no es válido o ya expiró.',
    AUTH_INVITATION_INVALID: 'La invitación no es válida o ya expiró.',
  },
  en: {
    AUTH_INVALID_CREDENTIALS: 'Incorrect email or password.',
    AUTH_REFRESH_REQUIRED: 'Your session needs to be renewed.',
    AUTH_REFRESH_INVALID: 'Your session expired. Sign in again.',
    AUTH_SESSION_EXPIRED: 'Your session expired. Sign in again.',
    AUTH_REGISTRATION_CONFLICT: 'An account or barbershop already exists with those details.',
    AUTH_REGISTRATION_INVALID: 'Review the registration details and try again.',
    AUTH_EMAIL_REQUIRED: 'Email is required.',
    AUTH_PASSWORD_RESET_INVALID: 'The recovery link is invalid or has expired.',
    AUTH_EMAIL_VERIFICATION_INVALID: 'The verification link is invalid or has expired.',
    AUTH_INVITATION_INVALID: 'The invitation is invalid or has expired.',
  },
  'es-ES': {
    AUTH_INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
    AUTH_REFRESH_REQUIRED: 'Tu sesión necesita renovarse.',
    AUTH_REFRESH_INVALID: 'Tu sesión ha caducado. Inicia sesión de nuevo.',
    AUTH_SESSION_EXPIRED: 'Tu sesión ha caducado. Inicia sesión de nuevo.',
    AUTH_REGISTRATION_CONFLICT: 'Ya existe una cuenta o barbería con esos datos.',
    AUTH_REGISTRATION_INVALID: 'Revisa los datos del registro e inténtalo de nuevo.',
    AUTH_EMAIL_REQUIRED: 'El correo electrónico es obligatorio.',
    AUTH_PASSWORD_RESET_INVALID: 'El enlace de recuperación no es válido o ha caducado.',
    AUTH_EMAIL_VERIFICATION_INVALID: 'El enlace de verificación no es válido o ha caducado.',
    AUTH_INVITATION_INVALID: 'La invitación no es válida o ha caducado.',
  },
}

export function apiErrorMessage(exception: unknown, locale: Locale, fallback: string) {
  if (!(exception instanceof ApiClientError))
    return exception instanceof Error ? exception.message : fallback

  if (exception.code && messages[locale][exception.code])
    return messages[locale][exception.code]

  return exception.message || fallback
}
