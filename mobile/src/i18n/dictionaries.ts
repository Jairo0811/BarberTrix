import type { Dictionary, Locale } from './types';
import { coreLegacy } from './coreLegacy';
import ja from './ja';
import ko from './ko';
import zhCN from './zh-CN';
import { requestFlowsSupplement } from './requestFlowsSupplement';
import { officialLocales } from './officialLocales';

type OfficialLocale = typeof officialLocales[number];

const spanish: Dictionary = {
  'login.title': 'Tu barbería, también en tu bolsillo.', 'login.subtitle': 'Acceso para Owner, Administrator, Receptionist y Barber.', 'login.email': 'Correo', 'login.password': 'Contraseña', 'login.invalidCredentials': 'Correo o contraseña incorrectos.', 'login.failed': 'No pudimos iniciar sesión.', 'login.submitting': 'Entrando…', 'login.submit': 'Iniciar sesión', 'login.customerHint': 'Los clientes pueden solicitar un turno sin crear una cuenta mediante el enlace de su barbería.',
  'home.hello': 'Hola, {{name}}.', 'home.team': 'equipo', 'home.body': 'M3 mantiene al equipo al tanto de nuevas solicitudes, incluso cuando BarberTurn está en segundo plano.', 'home.requests': 'Solicitudes de turno', 'home.requestsText': 'Gestiona solicitudes pendientes y recibe cambios en tiempo real.', 'home.pushTitle': 'No pierdas nuevas solicitudes', 'home.pushBody': 'Activa avisos del sistema para responder a tiempo. El contenido visible no incluye datos personales del cliente.', 'home.signOut': 'Cerrar sesión', 'push.enabledTitle': 'Avisos activados', 'push.enabledBody': 'Este dispositivo recibirá cambios importantes.', 'push.enabling': 'Activando…', 'push.enable': 'Activar avisos',
};

const english: Dictionary = {
  'login.title': 'Your barbershop, right in your pocket.', 'login.subtitle': 'Access for Owner, Administrator, Receptionist, and Barber roles.', 'login.email': 'Email', 'login.password': 'Password', 'login.invalidCredentials': 'Incorrect email or password.', 'login.failed': 'We could not sign you in.', 'login.submitting': 'Signing in…', 'login.submit': 'Sign in', 'login.customerHint': 'Customers can request a turn without creating an account through their barbershop link.',
  'home.hello': 'Hi, {{name}}.', 'home.team': 'team', 'home.body': 'M3 keeps the team informed about new requests even while BarberTurn is running in the background.', 'home.requests': 'Turn requests', 'home.requestsText': 'Manage pending requests and receive real-time updates.', 'home.pushTitle': 'Never miss a new request', 'home.pushBody': 'Enable system notifications to respond on time. Visible notification content does not include customer personal data.', 'home.signOut': 'Sign out', 'push.enabledTitle': 'Notifications enabled', 'push.enabledBody': 'This device will receive important updates.', 'push.enabling': 'Enabling…', 'push.enable': 'Enable notifications',
};

const portuguese: Dictionary = {
  'login.title': 'Sua barbearia, também no seu bolso.', 'login.subtitle': 'Acesso para Owner, Administrator, Receptionist e Barber.', 'login.email': 'E-mail', 'login.password': 'Senha', 'login.invalidCredentials': 'E-mail ou senha incorretos.', 'login.failed': 'Não foi possível entrar.', 'login.submitting': 'Entrando…', 'login.submit': 'Entrar', 'login.customerHint': 'Os clientes podem solicitar um atendimento sem criar conta pelo link da barbearia.',
  'home.hello': 'Olá, {{name}}.', 'home.team': 'equipe', 'home.body': 'M3 mantém a equipe informada sobre novas solicitações, mesmo quando BarberTurn está em segundo plano.', 'home.requests': 'Solicitações de atendimento', 'home.requestsText': 'Gerencie solicitações pendentes e receba atualizações em tempo real.', 'home.pushTitle': 'Não perca novas solicitações', 'home.pushBody': 'Ative as notificações do sistema para responder a tempo. O conteúdo visível não inclui dados pessoais do cliente.', 'home.signOut': 'Sair', 'push.enabledTitle': 'Notificações ativadas', 'push.enabledBody': 'Este dispositivo receberá atualizações importantes.', 'push.enabling': 'Ativando…', 'push.enable': 'Ativar notificações',
};

const french: Dictionary = {
  'login.title': 'Votre barbershop, aussi dans votre poche.', 'login.subtitle': 'Accès pour les rôles Owner, Administrator, Receptionist et Barber.', 'login.email': 'E-mail', 'login.password': 'Mot de passe', 'login.invalidCredentials': 'E-mail ou mot de passe incorrect.', 'login.failed': 'Impossible de vous connecter.', 'login.submitting': 'Connexion…', 'login.submit': 'Se connecter', 'login.customerHint': 'Les clients peuvent demander un passage sans créer de compte via le lien de leur barbershop.',
  'home.hello': 'Bonjour, {{name}}.', 'home.team': 'équipe', 'home.body': 'M3 informe l’équipe des nouvelles demandes même lorsque BarberTurn fonctionne en arrière-plan.', 'home.requests': 'Demandes de passage', 'home.requestsText': 'Gérez les demandes en attente et recevez les changements en temps réel.', 'home.pushTitle': 'Ne manquez aucune nouvelle demande', 'home.pushBody': 'Activez les notifications système pour répondre à temps. Le contenu visible n’inclut pas les données personnelles du client.', 'home.signOut': 'Se déconnecter', 'push.enabledTitle': 'Notifications activées', 'push.enabledBody': 'Cet appareil recevra les mises à jour importantes.', 'push.enabling': 'Activation…', 'push.enable': 'Activer les notifications',
};

const withRequestFlows = (locale: OfficialLocale, dictionary: Dictionary): Dictionary => ({
  ...dictionary,
  ...requestFlowsSupplement[locale],
});

const localizedSpanish = withRequestFlows('es-419', spanish);

export const dictionaries = {
  'es-419': localizedSpanish,
  // Legacy compatibility only. It is no longer exposed as a product locale.
  'es-ES': localizedSpanish,
  en: withRequestFlows('en', english),
  'pt-BR': withRequestFlows('pt-BR', portuguese),
  fr: withRequestFlows('fr', french),
  ht: withRequestFlows('ht', coreLegacy.ht),
  de: withRequestFlows('de', coreLegacy.de),
  it: withRequestFlows('it', coreLegacy.it),
  ja: withRequestFlows('ja', ja),
  ko: withRequestFlows('ko', ko),
  'zh-CN': withRequestFlows('zh-CN', zhCN),
} as Record<Locale, Dictionary>;
