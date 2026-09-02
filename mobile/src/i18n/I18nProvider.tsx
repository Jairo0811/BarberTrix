import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

type Locale = 'es-419' | 'es-ES' | 'en' | 'pt-BR' | 'fr' | 'de' | 'it';
type LocalePreference = 'system' | Locale;
type TranslationValues = Record<string, string | number>;

type I18nContextValue = {
  locale: Locale;
  localePreference: LocalePreference;
  setLocalePreference: (preference: LocalePreference) => void;
  t: (key: string, values?: TranslationValues) => string;
};

const dictionaries: Record<Locale, Record<string, string>> = {
  'es-419': {
    'login.title': 'Tu barbería, también en tu bolsillo.',
    'login.subtitle': 'Acceso para Owner, Administrator, Receptionist y Barber.',
    'login.email': 'Correo',
    'login.password': 'Contraseña',
    'login.invalidCredentials': 'Correo o contraseña incorrectos.',
    'login.failed': 'No pudimos iniciar sesión.',
    'login.submitting': 'Entrando…',
    'login.submit': 'Iniciar sesión',
    'login.customerHint': 'Los clientes pueden solicitar un turno sin crear una cuenta mediante el enlace de su barbería.',
    'home.hello': 'Hola, {{name}}.',
    'home.team': 'equipo',
    'home.body': 'M3 mantiene al equipo al tanto de nuevas solicitudes, incluso cuando BarberTurn está en segundo plano.',
    'home.requests': 'Solicitudes de turno',
    'home.requestsText': 'Gestiona solicitudes pendientes y recibe cambios en tiempo real.',
    'home.pushTitle': 'No pierdas nuevas solicitudes',
    'home.pushBody': 'Activa avisos del sistema para responder a tiempo. El contenido visible no incluye datos personales del cliente.',
    'home.signOut': 'Cerrar sesión',
    'push.enabledTitle': 'Avisos activados',
    'push.enabledBody': 'Este dispositivo recibirá cambios importantes.',
    'push.enabling': 'Activando…',
    'push.enable': 'Activar avisos',
  },
  'es-ES': {
    'login.title': 'Tu barbería, también en tu bolsillo.',
    'login.subtitle': 'Acceso para Owner, Administrator, Receptionist y Barber.',
    'login.email': 'Correo electrónico',
    'login.password': 'Contraseña',
    'login.invalidCredentials': 'El correo o la contraseña no son correctos.',
    'login.failed': 'No hemos podido iniciar sesión.',
    'login.submitting': 'Entrando…',
    'login.submit': 'Iniciar sesión',
    'login.customerHint': 'Los clientes pueden solicitar un turno sin crear una cuenta mediante el enlace de su barbería.',
    'home.hello': 'Hola, {{name}}.',
    'home.team': 'equipo',
    'home.body': 'M3 mantiene al equipo informado de nuevas solicitudes, incluso cuando BarberTurn está en segundo plano.',
    'home.requests': 'Solicitudes de turno',
    'home.requestsText': 'Gestiona solicitudes pendientes y recibe cambios en tiempo real.',
    'home.pushTitle': 'No te pierdas nuevas solicitudes',
    'home.pushBody': 'Activa las notificaciones del sistema para responder a tiempo. El contenido visible no incluye datos personales del cliente.',
    'home.signOut': 'Cerrar sesión',
    'push.enabledTitle': 'Notificaciones activadas',
    'push.enabledBody': 'Este dispositivo recibirá cambios importantes.',
    'push.enabling': 'Activando…',
    'push.enable': 'Activar notificaciones',
  },
  en: {
    'login.title': 'Your barbershop, right in your pocket.',
    'login.subtitle': 'Access for Owner, Administrator, Receptionist, and Barber roles.',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.invalidCredentials': 'Incorrect email or password.',
    'login.failed': 'We could not sign you in.',
    'login.submitting': 'Signing in…',
    'login.submit': 'Sign in',
    'login.customerHint': 'Customers can request a turn without creating an account through their barbershop link.',
    'home.hello': 'Hi, {{name}}.',
    'home.team': 'team',
    'home.body': 'M3 keeps the team informed about new requests even while BarberTurn is running in the background.',
    'home.requests': 'Turn requests',
    'home.requestsText': 'Manage pending requests and receive real-time updates.',
    'home.pushTitle': 'Never miss a new request',
    'home.pushBody': 'Enable system notifications to respond on time. Visible notification content does not include customer personal data.',
    'home.signOut': 'Sign out',
    'push.enabledTitle': 'Notifications enabled',
    'push.enabledBody': 'This device will receive important updates.',
    'push.enabling': 'Enabling…',
    'push.enable': 'Enable notifications',
  },
  'pt-BR': {
    'login.title': 'Sua barbearia, também no seu bolso.',
    'login.subtitle': 'Acesso para Owner, Administrator, Receptionist e Barber.',
    'login.email': 'E-mail',
    'login.password': 'Senha',
    'login.invalidCredentials': 'E-mail ou senha incorretos.',
    'login.failed': 'Não foi possível entrar.',
    'login.submitting': 'Entrando…',
    'login.submit': 'Entrar',
    'login.customerHint': 'Os clientes podem solicitar um atendimento sem criar conta pelo link da barbearia.',
    'home.hello': 'Olá, {{name}}.',
    'home.team': 'equipe',
    'home.body': 'M3 mantém a equipe informada sobre novas solicitações, mesmo quando BarberTurn está em segundo plano.',
    'home.requests': 'Solicitações de atendimento',
    'home.requestsText': 'Gerencie solicitações pendentes e receba atualizações em tempo real.',
    'home.pushTitle': 'Não perca novas solicitações',
    'home.pushBody': 'Ative as notificações do sistema para responder a tempo. O conteúdo visível não inclui dados pessoais do cliente.',
    'home.signOut': 'Sair',
    'push.enabledTitle': 'Notificações ativadas',
    'push.enabledBody': 'Este dispositivo receberá atualizações importantes.',
    'push.enabling': 'Ativando…',
    'push.enable': 'Ativar notificações',
  },
  fr: {
    'login.title': 'Votre barbershop, aussi dans votre poche.',
    'login.subtitle': 'Accès pour les rôles Owner, Administrator, Receptionist et Barber.',
    'login.email': 'E-mail',
    'login.password': 'Mot de passe',
    'login.invalidCredentials': 'E-mail ou mot de passe incorrect.',
    'login.failed': 'Impossible de vous connecter.',
    'login.submitting': 'Connexion…',
    'login.submit': 'Se connecter',
    'login.customerHint': 'Les clients peuvent demander un passage sans créer de compte via le lien de leur barbershop.',
    'home.hello': 'Bonjour, {{name}}.',
    'home.team': 'équipe',
    'home.body': 'M3 informe l’équipe des nouvelles demandes même lorsque BarberTurn fonctionne en arrière-plan.',
    'home.requests': 'Demandes de passage',
    'home.requestsText': 'Gérez les demandes en attente et recevez les changements en temps réel.',
    'home.pushTitle': 'Ne manquez aucune nouvelle demande',
    'home.pushBody': 'Activez les notifications système pour répondre à temps. Le contenu visible n’inclut pas les données personnelles du client.',
    'home.signOut': 'Se déconnecter',
    'push.enabledTitle': 'Notifications activées',
    'push.enabledBody': 'Cet appareil recevra les mises à jour importantes.',
    'push.enabling': 'Activation…',
    'push.enable': 'Activer les notifications',
  },
  de: {
    'login.title': 'Dein Barbershop, direkt in deiner Tasche.',
    'login.subtitle': 'Zugang für Owner, Administrator, Receptionist und Barber.',
    'login.email': 'E-Mail',
    'login.password': 'Passwort',
    'login.invalidCredentials': 'E-Mail oder Passwort ist falsch.',
    'login.failed': 'Anmeldung nicht möglich.',
    'login.submitting': 'Anmeldung läuft…',
    'login.submit': 'Anmelden',
    'login.customerHint': 'Kunden können über den Link ihres Barbershops einen Platz anfragen, ohne ein Konto zu erstellen.',
    'home.hello': 'Hallo, {{name}}.',
    'home.team': 'Team',
    'home.body': 'M3 hält das Team über neue Anfragen auf dem Laufenden, auch wenn BarberTurn im Hintergrund läuft.',
    'home.requests': 'Warteschlangen-Anfragen',
    'home.requestsText': 'Verwalte offene Anfragen und erhalte Änderungen in Echtzeit.',
    'home.pushTitle': 'Keine neue Anfrage verpassen',
    'home.pushBody': 'Aktiviere Systembenachrichtigungen, um rechtzeitig zu reagieren. Sichtbare Inhalte enthalten keine persönlichen Kundendaten.',
    'home.signOut': 'Abmelden',
    'push.enabledTitle': 'Benachrichtigungen aktiviert',
    'push.enabledBody': 'Dieses Gerät erhält wichtige Aktualisierungen.',
    'push.enabling': 'Wird aktiviert…',
    'push.enable': 'Benachrichtigungen aktivieren',
  },
  it: {
    'login.title': 'Il tuo barbershop, anche in tasca.',
    'login.subtitle': 'Accesso per i ruoli Owner, Administrator, Receptionist e Barber.',
    'login.email': 'E-mail',
    'login.password': 'Password',
    'login.invalidCredentials': 'E-mail o password non corretti.',
    'login.failed': 'Impossibile accedere.',
    'login.submitting': 'Accesso…',
    'login.submit': 'Accedi',
    'login.customerHint': 'I clienti possono richiedere un turno senza creare un account tramite il link del barbershop.',
    'home.hello': 'Ciao, {{name}}.',
    'home.team': 'team',
    'home.body': 'M3 mantiene il team aggiornato sulle nuove richieste anche quando BarberTurn è in background.',
    'home.requests': 'Richieste di turno',
    'home.requestsText': 'Gestisci le richieste in attesa e ricevi aggiornamenti in tempo reale.',
    'home.pushTitle': 'Non perdere nuove richieste',
    'home.pushBody': 'Attiva le notifiche di sistema per rispondere in tempo. Il contenuto visibile non include dati personali del cliente.',
    'home.signOut': 'Esci',
    'push.enabledTitle': 'Notifiche attivate',
    'push.enabledBody': 'Questo dispositivo riceverà aggiornamenti importanti.',
    'push.enabling': 'Attivazione…',
    'push.enable': 'Attiva notifiche',
  },
};

function resolveDeviceLocale(): Locale {
  const rawLocale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().replace('_', '-');
  if (rawLocale === 'es-es' || rawLocale.startsWith('es-es-')) return 'es-ES';
  if (rawLocale.startsWith('pt')) return 'pt-BR';
  if (rawLocale.startsWith('fr')) return 'fr';
  if (rawLocale.startsWith('de')) return 'de';
  if (rawLocale.startsWith('it')) return 'it';
  if (rawLocale.startsWith('en')) return 'en';
  if (rawLocale.startsWith('es')) return 'es-419';
  return 'es-419';
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [localePreference, setLocalePreference] = useState<LocalePreference>('system');
  const [systemLocale, setSystemLocale] = useState<Locale>(resolveDeviceLocale);
  const locale = localePreference === 'system' ? systemLocale : localePreference;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setSystemLocale(resolveDeviceLocale());
    });

    return () => subscription.remove();
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    localePreference,
    setLocalePreference,
    t: (key, values) => {
      const template = dictionaries[locale][key] ?? dictionaries.en[key] ?? dictionaries['es-419'][key] ?? key;
      if (!values) return template;
      return Object.entries(values).reduce(
        (result, [name, replacement]) => result.replaceAll(`{{${name}}}`, String(replacement)),
        template,
      );
    },
  }), [locale, localePreference]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
