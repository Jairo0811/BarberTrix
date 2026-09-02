import type { Locale } from './i18n'

const messages: Partial<Record<Locale, string>> = {
  'es-419': 'La contraseña debe tener al menos 10 caracteres e incluir mayúscula, minúscula, número y símbolo.',
  en: 'The password must be at least 10 characters and include an uppercase letter, a lowercase letter, a number and a symbol.',
  'es-ES': 'La contraseña debe tener al menos 10 caracteres e incluir mayúscula, minúscula, número y símbolo.',
  'pt-BR': 'A senha deve ter pelo menos 10 caracteres e incluir uma letra maiúscula, uma minúscula, um número e um símbolo.',
  fr: 'Le mot de passe doit comporter au moins 10 caractères et inclure une majuscule, une minuscule, un chiffre et un symbole.',
  de: 'Das Passwort muss mindestens 10 Zeichen lang sein und einen Großbuchstaben, einen Kleinbuchstaben, eine Zahl und ein Symbol enthalten.',
  it: 'La password deve contenere almeno 10 caratteri e includere una lettera maiuscola, una minuscola, un numero e un simbolo.',
  nl: 'Het wachtwoord moet minimaal 10 tekens bevatten, inclusief een hoofdletter, een kleine letter, een cijfer en een symbool.',
  ht: 'Modpas la dwe gen omwen 10 karaktè epi li dwe gen yon lèt majiskil, yon lèt miniskil, yon chif ak yon senbòl.',
  ja: 'パスワードは10文字以上で、大文字、小文字、数字、記号をそれぞれ1文字以上含めてください。',
  ko: '비밀번호는 10자 이상이며 대문자, 소문자, 숫자와 기호를 각각 하나 이상 포함해야 합니다.',
  'zh-CN': '密码必须至少包含 10 个字符，并包含大写字母、小写字母、数字和符号。',
}

const hints: Partial<Record<Locale, string>> = {
  'es-419': '10+ caracteres, mayúscula, número y símbolo',
  en: '10+ characters, uppercase, number and symbol',
  'es-ES': '10+ caracteres, mayúscula, número y símbolo',
  'pt-BR': '10+ caracteres, maiúscula, número e símbolo',
  fr: '10+ caractères, majuscule, chiffre et symbole',
  de: '10+ Zeichen, Großbuchstabe, Zahl und Symbol',
  it: '10+ caratteri, maiuscola, numero e simbolo',
  nl: '10+ tekens, hoofdletter, cijfer en symbool',
  ht: '10+ karaktè, majiskil, chif ak senbòl',
  ja: '10文字以上・大文字・数字・記号を含む',
  ko: '10자 이상 · 대문자 · 숫자 · 기호 포함',
  'zh-CN': '10 个以上字符 · 大写字母 · 数字 · 符号',
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
