import type { Locale } from './i18n'

const messages: Partial<Record<Locale, string>> = {
  'es-419': 'La contraseña debe tener al menos 10 caracteres e incluir mayúscula, minúscula, número y símbolo.',
  en: 'The password must be at least 10 characters and include an uppercase letter, a lowercase letter, a number and a symbol.',
  'es-ES': 'La contraseña debe tener al menos 10 caracteres e incluir mayúscula, minúscula, número y símbolo.',
}

const hints: Partial<Record<Locale, string>> = {
  'es-419': '10+ caracteres, mayúscula, número y símbolo',
  en: '10+ characters, uppercase, number and symbol',
  'es-ES': '10+ caracteres, mayúscula, número y símbolo',
}

export function isStrongPassword(password: string) {
  return password.length >= 10
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password)
}

export function passwordPolicyMessage(locale: Locale) {
  return messages[locale] ?? messages.en ?? messages['es-419'] ?? ''
}

export function passwordPolicyHint(locale: Locale) {
  return hints[locale] ?? hints.en ?? hints['es-419'] ?? ''
}
