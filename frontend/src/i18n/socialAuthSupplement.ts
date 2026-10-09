import type { OfficialLocale } from './officialLocales'
import type { Dictionary } from './types'

type SocialAuthDictionary = Pick<Dictionary,
  | 'login.google'
  | 'login.apple'
  | 'login.socialCompleting'
  | 'login.socialExpired'
  | 'login.socialError'
  | 'login.socialBack'
>

export const socialAuthSupplement: Record<OfficialLocale, SocialAuthDictionary> = {
  'es-419': {
    'login.google': 'Continuar con Google',
    'login.apple': 'Continuar con Apple',
    'login.socialCompleting': 'Completando el inicio de sesión seguro…',
    'login.socialExpired': 'La solicitud de inicio de sesión expiró. Inténtalo de nuevo.',
    'login.socialError': 'No se pudo completar el inicio de sesión social.',
    'login.socialBack': 'Volver a iniciar sesión',
  },
  en: {
    'login.google': 'Continue with Google',
    'login.apple': 'Continue with Apple',
    'login.socialCompleting': 'Completing secure sign-in…',
    'login.socialExpired': 'The sign-in request expired. Please try again.',
    'login.socialError': 'Social sign-in could not be completed.',
    'login.socialBack': 'Back to sign in',
  },
  'pt-BR': {
    'login.google': 'Continuar com o Google',
    'login.apple': 'Continuar com a Apple',
    'login.socialCompleting': 'Concluindo o login seguro…',
    'login.socialExpired': 'A solicitação de login expirou. Tente novamente.',
    'login.socialError': 'Não foi possível concluir o login social.',
    'login.socialBack': 'Voltar ao login',
  },
  fr: {
    'login.google': 'Continuer avec Google',
    'login.apple': 'Continuer avec Apple',
    'login.socialCompleting': 'Finalisation de la connexion sécurisée…',
    'login.socialExpired': 'La demande de connexion a expiré. Réessayez.',
    'login.socialError': 'La connexion sociale n’a pas pu être finalisée.',
    'login.socialBack': 'Retour à la connexion',
  },
  ht: {
    'login.google': 'Kontinye ak Google',
    'login.apple': 'Kontinye ak Apple',
    'login.socialCompleting': 'Ap fini koneksyon an sekirite…',
    'login.socialExpired': 'Demann koneksyon an ekspire. Eseye ankò.',
    'login.socialError': 'Nou pa t kapab fini koneksyon sosyal la.',
    'login.socialBack': 'Retounen nan koneksyon',
  },
  de: {
    'login.google': 'Mit Google fortfahren',
    'login.apple': 'Mit Apple fortfahren',
    'login.socialCompleting': 'Sichere Anmeldung wird abgeschlossen…',
    'login.socialExpired': 'Die Anmeldeanfrage ist abgelaufen. Bitte erneut versuchen.',
    'login.socialError': 'Die soziale Anmeldung konnte nicht abgeschlossen werden.',
    'login.socialBack': 'Zurück zur Anmeldung',
  },
  it: {
    'login.google': 'Continua con Google',
    'login.apple': 'Continua con Apple',
    'login.socialCompleting': 'Completamento dell’accesso sicuro…',
    'login.socialExpired': 'La richiesta di accesso è scaduta. Riprova.',
    'login.socialError': 'Non è stato possibile completare l’accesso social.',
    'login.socialBack': 'Torna all’accesso',
  },
  ja: {
    'login.google': 'Googleで続行',
    'login.apple': 'Appleで続行',
    'login.socialCompleting': '安全なサインインを完了しています…',
    'login.socialExpired': 'サインイン要求の有効期限が切れました。もう一度お試しください。',
    'login.socialError': 'ソーシャルサインインを完了できませんでした。',
    'login.socialBack': 'サインインに戻る',
  },
  ko: {
    'login.google': 'Google로 계속',
    'login.apple': 'Apple로 계속',
    'login.socialCompleting': '안전한 로그인을 완료하는 중…',
    'login.socialExpired': '로그인 요청이 만료되었습니다. 다시 시도해 주세요.',
    'login.socialError': '소셜 로그인을 완료할 수 없습니다.',
    'login.socialBack': '로그인으로 돌아가기',
  },
  'zh-CN': {
    'login.google': '使用 Google 继续',
    'login.apple': '使用 Apple 继续',
    'login.socialCompleting': '正在完成安全登录…',
    'login.socialExpired': '登录请求已过期，请重试。',
    'login.socialError': '无法完成社交登录。',
    'login.socialBack': '返回登录',
  },
}
