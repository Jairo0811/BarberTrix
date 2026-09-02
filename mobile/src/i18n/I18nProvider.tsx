import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

type Locale = 'es-419' | 'es-ES' | 'en';
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
};

function resolveDeviceLocale(): Locale {
  const rawLocale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().replace('_', '-');
  if (rawLocale === 'es-es' || rawLocale.startsWith('es-es-')) return 'es-ES';
  if (rawLocale.startsWith('en')) return 'en';
  if (rawLocale.startsWith('es')) return 'es-419';
  return 'es-419';
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [localePreference, setLocalePreference] = useState<LocalePreference>('system');
  const locale = localePreference === 'system' ? resolveDeviceLocale() : localePreference;

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    localePreference,
    setLocalePreference,
    t: (key, values) => {
      const template = dictionaries[locale][key] ?? dictionaries['es-419'][key] ?? key;
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
