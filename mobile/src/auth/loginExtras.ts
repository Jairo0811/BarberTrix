export type LoginExtrasCopy = {
  backHome: string;
  continueGoogle: string;
  continueApple: string;
  divider: string;
  customerMessage: string;
  signInToBook: string;
  clientAccountRequired: string;
};

const copies: Record<string, LoginExtrasCopy> = {
  'es-419': {
    backHome: 'Volver al inicio',
    continueGoogle: 'Continuar con Google',
    continueApple: 'Continuar con Apple',
    divider: 'o',
    customerMessage: 'Explora barberías libremente. Para reservar una cita necesitas iniciar sesión con una cuenta de cliente.',
    signInToBook: 'Inicia sesión para reservar',
    clientAccountRequired: 'Se requiere una cuenta de cliente para reservar.',
  },
  en: {
    backHome: 'Back to home',
    continueGoogle: 'Continue with Google',
    continueApple: 'Continue with Apple',
    divider: 'or',
    customerMessage: 'Explore barbershops freely. To book an appointment, sign in with a customer account.',
    signInToBook: 'Sign in to book',
    clientAccountRequired: 'A customer account is required to book.',
  },
  'pt-BR': {
    backHome: 'Voltar ao início',
    continueGoogle: 'Continuar com Google',
    continueApple: 'Continuar com Apple',
    divider: 'ou',
    customerMessage: 'Explore barbearias livremente. Para agendar, entre com uma conta de cliente.',
    signInToBook: 'Entre para agendar',
    clientAccountRequired: 'É necessária uma conta de cliente para agendar.',
  },
  fr: {
    backHome: "Retour à l’accueil",
    continueGoogle: 'Continuer avec Google',
    continueApple: 'Continuer avec Apple',
    divider: 'ou',
    customerMessage: 'Explorez les salons librement. Pour réserver, connectez-vous avec un compte client.',
    signInToBook: 'Se connecter pour réserver',
    clientAccountRequired: 'Un compte client est requis pour réserver.',
  },
  ht: {
    backHome: 'Retounen lakay',
    continueGoogle: 'Kontinye ak Google',
    continueApple: 'Kontinye ak Apple',
    divider: 'oswa',
    customerMessage: 'Eksplore babè yo lib. Pou pran randevou, konekte ak yon kont kliyan.',
    signInToBook: 'Konekte pou rezève',
    clientAccountRequired: 'Yon kont kliyan obligatwa pou rezève.',
  },
  de: {
    backHome: 'Zur Startseite',
    continueGoogle: 'Mit Google fortfahren',
    continueApple: 'Mit Apple fortfahren',
    divider: 'oder',
    customerMessage: 'Entdecke Barbershops frei. Zum Buchen ist ein Kundenkonto erforderlich.',
    signInToBook: 'Zum Buchen anmelden',
    clientAccountRequired: 'Zum Buchen ist ein Kundenkonto erforderlich.',
  },
  it: {
    backHome: 'Torna alla home',
    continueGoogle: 'Continua con Google',
    continueApple: 'Continua con Apple',
    divider: 'oppure',
    customerMessage: 'Esplora liberamente i barber shop. Per prenotare, accedi con un account cliente.',
    signInToBook: 'Accedi per prenotare',
    clientAccountRequired: 'Per prenotare è richiesto un account cliente.',
  },
  ja: {
    backHome: 'ホームに戻る',
    continueGoogle: 'Googleで続行',
    continueApple: 'Appleで続行',
    divider: 'または',
    customerMessage: 'バーバーショップは自由に閲覧できます。予約には顧客アカウントでのログインが必要です。',
    signInToBook: 'ログインして予約',
    clientAccountRequired: '予約には顧客アカウントが必要です。',
  },
  ko: {
    backHome: '홈으로 돌아가기',
    continueGoogle: 'Google로 계속',
    continueApple: 'Apple로 계속',
    divider: '또는',
    customerMessage: '바버샵은 자유롭게 둘러볼 수 있습니다. 예약하려면 고객 계정으로 로그인해야 합니다.',
    signInToBook: '로그인하고 예약',
    clientAccountRequired: '예약하려면 고객 계정이 필요합니다.',
  },
  'zh-CN': {
    backHome: '返回首页',
    continueGoogle: '使用 Google 继续',
    continueApple: '使用 Apple 继续',
    divider: '或',
    customerMessage: '你可以自由浏览理发店。预约时需要使用客户账户登录。',
    signInToBook: '登录后预约',
    clientAccountRequired: '预约需要客户账户。',
  },
};

export function getLoginExtrasCopy(locale: string): LoginExtrasCopy {
  return copies[locale] ?? copies[locale.split('-')[0]] ?? copies.en;
}
