import type { Locale } from './i18n'
import { ApiClientError } from './api'
import { eastAsiaApiErrorMessages } from './i18n/eastAsiaApiErrorMessages'

const noEnglishFallbackLocales = new Set<Locale>(['pt-BR', 'fr', 'de', 'it', 'nl', 'ht', 'ja', 'ko', 'zh-CN'])

const messages: Partial<Record<Locale, Record<string, string>>> = {
  'es-419': {
    AUTH_INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.', AUTH_REFRESH_REQUIRED: 'Tu sesión necesita renovarse.', AUTH_REFRESH_INVALID: 'Tu sesión expiró. Inicia sesión nuevamente.', AUTH_SESSION_EXPIRED: 'Tu sesión expiró. Inicia sesión nuevamente.', AUTH_REGISTRATION_CONFLICT: 'Ya existe una cuenta o barbería con esos datos.', AUTH_REGISTRATION_INVALID: 'Revisa los datos del registro e inténtalo nuevamente.', AUTH_EMAIL_REQUIRED: 'El correo electrónico es obligatorio.', AUTH_PASSWORD_RESET_INVALID: 'El enlace de recuperación no es válido o ya expiró.', AUTH_EMAIL_VERIFICATION_INVALID: 'El enlace de verificación no es válido o ya expiró.', AUTH_INVITATION_INVALID: 'La invitación no es válida o ya expiró.', TEAM_INVALID: 'Revisa los datos del equipo e inténtalo nuevamente.', TEAM_OPERATION_INVALID: 'No fue posible completar la operación del equipo.', QUEUE_INVALID: 'Revisa los datos del turno e inténtalo nuevamente.', QUEUE_CONFLICT: 'El turno cambió. Actualiza la información e inténtalo nuevamente.', APPOINTMENT_INVALID: 'Revisa los datos de la cita e inténtalo nuevamente.', APPOINTMENT_CONFLICT: 'La cita cambió y no se pudo completar la operación.', PLAN_FEATURE_UNAVAILABLE: 'Esta función no está disponible en tu plan actual.', SHOP_SETTINGS_INVALID: 'Revisa la configuración de la barbería.', LOCATION_INVALID: 'Revisa los datos de la ubicación.', CUSTOMER_INVALID: 'Revisa los datos del cliente.', CUSTOMER_ALREADY_EXISTS: 'Ya existe un cliente con ese teléfono o correo.', PAYMENT_INVALID: 'Revisa los datos del pago.', BILLING_INVALID: 'No fue posible completar la operación de facturación.', BILLING_WEBHOOK_INVALID: 'No fue posible verificar la notificación de pago.', DEMO_FEATURE_UNAVAILABLE: 'Esta función no está disponible en la demostración.', TENANT_CONTEXT_INVALID: 'La sesión no contiene un contexto de barbería válido.',
  },
  en: {
    AUTH_INVALID_CREDENTIALS: 'Incorrect email or password.', AUTH_REFRESH_REQUIRED: 'Your session needs to be renewed.', AUTH_REFRESH_INVALID: 'Your session expired. Sign in again.', AUTH_SESSION_EXPIRED: 'Your session expired. Sign in again.', AUTH_REGISTRATION_CONFLICT: 'An account or barbershop already exists with those details.', AUTH_REGISTRATION_INVALID: 'Review the registration details and try again.', AUTH_EMAIL_REQUIRED: 'Email is required.', AUTH_PASSWORD_RESET_INVALID: 'The recovery link is invalid or has expired.', AUTH_EMAIL_VERIFICATION_INVALID: 'The verification link is invalid or has expired.', AUTH_INVITATION_INVALID: 'The invitation is invalid or has expired.', TEAM_INVALID: 'Review the team details and try again.', TEAM_OPERATION_INVALID: 'The team operation could not be completed.', QUEUE_INVALID: 'Review the queue ticket details and try again.', QUEUE_CONFLICT: 'The queue ticket changed. Refresh and try again.', APPOINTMENT_INVALID: 'Review the appointment details and try again.', APPOINTMENT_CONFLICT: 'The appointment changed and the operation could not be completed.', PLAN_FEATURE_UNAVAILABLE: 'This feature is not available on your current plan.', SHOP_SETTINGS_INVALID: 'Review the barbershop settings.', LOCATION_INVALID: 'Review the location details.', CUSTOMER_INVALID: 'Review the customer details.', CUSTOMER_ALREADY_EXISTS: 'A customer with that phone number or email already exists.', PAYMENT_INVALID: 'Review the payment details.', BILLING_INVALID: 'The billing operation could not be completed.', BILLING_WEBHOOK_INVALID: 'The payment notification could not be verified.', DEMO_FEATURE_UNAVAILABLE: 'This feature is not available in the demo.', TENANT_CONTEXT_INVALID: 'The session does not contain a valid barbershop context.',
  },
  'es-ES': {
    AUTH_INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.', AUTH_REFRESH_REQUIRED: 'Tu sesión necesita renovarse.', AUTH_REFRESH_INVALID: 'Tu sesión ha caducado. Inicia sesión de nuevo.', AUTH_SESSION_EXPIRED: 'Tu sesión ha caducado. Inicia sesión de nuevo.', AUTH_REGISTRATION_CONFLICT: 'Ya existe una cuenta o barbería con esos datos.', AUTH_REGISTRATION_INVALID: 'Revisa los datos del registro e inténtalo de nuevo.', AUTH_EMAIL_REQUIRED: 'El correo electrónico es obligatorio.', AUTH_PASSWORD_RESET_INVALID: 'El enlace de recuperación no es válido o ha caducado.', AUTH_EMAIL_VERIFICATION_INVALID: 'El enlace de verificación no es válido o ha caducado.', AUTH_INVITATION_INVALID: 'La invitación no es válida o ha caducado.', TEAM_INVALID: 'Revisa los datos del equipo e inténtalo de nuevo.', TEAM_OPERATION_INVALID: 'No se ha podido completar la operación del equipo.', QUEUE_INVALID: 'Revisa los datos del turno e inténtalo de nuevo.', QUEUE_CONFLICT: 'El turno ha cambiado. Actualiza la información e inténtalo de nuevo.', APPOINTMENT_INVALID: 'Revisa los datos de la cita e inténtalo de nuevo.', APPOINTMENT_CONFLICT: 'La cita ha cambiado y no se ha podido completar la operación.', PLAN_FEATURE_UNAVAILABLE: 'Esta función no está disponible en tu plan actual.', SHOP_SETTINGS_INVALID: 'Revisa la configuración de la barbería.', LOCATION_INVALID: 'Revisa los datos de la ubicación.', CUSTOMER_INVALID: 'Revisa los datos del cliente.', CUSTOMER_ALREADY_EXISTS: 'Ya existe un cliente con ese teléfono o correo.', PAYMENT_INVALID: 'Revisa los datos del pago.', BILLING_INVALID: 'No se ha podido completar la operación de facturación.', BILLING_WEBHOOK_INVALID: 'No se ha podido verificar la notificación de pago.', DEMO_FEATURE_UNAVAILABLE: 'Esta función no está disponible en la demostración.', TENANT_CONTEXT_INVALID: 'La sesión no contiene un contexto de barbería válido.',
  },
  ja: {
    AUTH_INVALID_CREDENTIALS: 'メールアドレスまたはパスワードが正しくありません。', AUTH_REFRESH_REQUIRED: 'セッションを更新する必要があります。', AUTH_REFRESH_INVALID: 'セッションの有効期限が切れました。もう一度ログインしてください。', AUTH_SESSION_EXPIRED: 'セッションの有効期限が切れました。もう一度ログインしてください。', AUTH_REGISTRATION_CONFLICT: '同じ情報のアカウントまたはバーバーショップがすでに存在します。', AUTH_REGISTRATION_INVALID: '登録内容を確認して、もう一度お試しください。', AUTH_EMAIL_REQUIRED: 'メールアドレスは必須です。', AUTH_PASSWORD_RESET_INVALID: '復旧リンクが無効、または有効期限切れです。', AUTH_EMAIL_VERIFICATION_INVALID: '確認リンクが無効、または有効期限切れです。', AUTH_INVITATION_INVALID: '招待が無効、または有効期限切れです。', TEAM_INVALID: 'チーム情報を確認して、もう一度お試しください。', TEAM_OPERATION_INVALID: 'チーム操作を完了できませんでした。', QUEUE_INVALID: '順番待ち情報を確認して、もう一度お試しください。', QUEUE_CONFLICT: '順番待ち情報が変更されています。更新してからもう一度お試しください。', APPOINTMENT_INVALID: '予約情報を確認して、もう一度お試しください。', APPOINTMENT_CONFLICT: '予約情報が変更されたため、操作を完了できませんでした。', PLAN_FEATURE_UNAVAILABLE: 'この機能は現在のプランでは利用できません。', SHOP_SETTINGS_INVALID: 'バーバーショップの設定を確認してください。', LOCATION_INVALID: '店舗情報を確認してください。', CUSTOMER_INVALID: '顧客情報を確認してください。', CUSTOMER_ALREADY_EXISTS: '同じ電話番号またはメールアドレスの顧客がすでに存在します。', PAYMENT_INVALID: '支払い情報を確認してください。', BILLING_INVALID: '請求処理を完了できませんでした。', BILLING_WEBHOOK_INVALID: '支払い通知を確認できませんでした。', DEMO_FEATURE_UNAVAILABLE: 'この機能はデモでは利用できません。', TENANT_CONTEXT_INVALID: 'セッションに有効なバーバーショップ情報が含まれていません。',
  },
  ko: eastAsiaApiErrorMessages.ko,
  'zh-CN': eastAsiaApiErrorMessages['zh-CN'],
}

export function apiErrorMessage(exception: unknown, locale: Locale, fallback: string) {
  const blocksEnglishFallback = noEnglishFallbackLocales.has(locale)

  if (!(exception instanceof ApiClientError))
    return blocksEnglishFallback ? fallback : exception instanceof Error ? exception.message : fallback

  const localeMessages = messages[locale]
  if (exception.code && localeMessages?.[exception.code])
    return localeMessages[exception.code]

  if (blocksEnglishFallback)
    return fallback

  const fallbackMessages = localeMessages ?? messages.en
  if (exception.code && fallbackMessages?.[exception.code])
    return fallbackMessages[exception.code]

  return exception.message || fallback
}
