import type { Locale } from './i18n'

const messages: Record<Locale, string> = {
  'es-419': 'La contraseña debe tener al menos 10 caracteres e incluir mayúscula, minúscula, número y símbolo.',
  en: 'The password must be at least 10 characters and include an uppercase letter, a lowercase letter, a number and a symbol.',
  'es-ES': 'La contraseña debe tener al menos 10 caracteres e incluir mayúscula, minúscula, número y símbolo.',
}

export function isStrongPassword(password: string) {
  return password.length >= 10
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password)
}

export function passwordPolicyMessage(locale: Locale) {
  return messages[locale]
}
