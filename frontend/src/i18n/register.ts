import type { Dictionary } from './types'

export const registerCopy: Record<'es-419' | 'en' | 'es-ES' | 'ja', Dictionary> = {
  'es-419': {
    'register.shopName': 'Nombre de la barbería',
    'register.shopNamePlaceholder': 'Barbería Central',
    'register.acceptTermsPrefix': 'Acepto los',
    'register.terms': 'términos de servicio',
    'register.acceptTermsJoin': 'y la',
    'register.privacy': 'política de privacidad',
  },
  en: {
    'register.shopName': 'Barbershop name',
    'register.shopNamePlaceholder': 'Central Barbershop',
    'register.acceptTermsPrefix': 'I accept the',
    'register.terms': 'terms of service',
    'register.acceptTermsJoin': 'and the',
    'register.privacy': 'privacy policy',
  },
  'es-ES': {
    'register.shopName': 'Nombre de la barbería',
    'register.shopNamePlaceholder': 'Barbería Central',
    'register.acceptTermsPrefix': 'Acepto los',
    'register.terms': 'términos de servicio',
    'register.acceptTermsJoin': 'y la',
    'register.privacy': 'política de privacidad',
  },
  ja: {
    'register.shopName': 'バーバーショップ名',
    'register.shopNamePlaceholder': 'セントラル・バーバーショップ',
    'register.acceptTermsPrefix': '以下に同意します：',
    'register.terms': '利用規約',
    'register.acceptTermsJoin': 'および',
    'register.privacy': 'プライバシーポリシー',
  },
}
