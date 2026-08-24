import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'

export type Locale = 'es-419' | 'en' | 'es-ES'

type TranslationValues = Record<string, string | number>
type Dictionary = Record<string, string>

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, values?: TranslationValues) => string
}

const storageKey = 'barberturn.locale'

const dictionaries: Record<Locale, Dictionary> = {
  'es-419': {
    'language.label': 'Idioma',
    'language.es419': 'Español Latino',
    'language.en': 'English',
    'language.esES': 'Español (España)',
    'common.backHome': 'Volver al inicio',
    'common.login': 'Iniciar sesión',
    'common.register': 'Crear cuenta',
    'common.email': 'Correo electrónico',
    'common.password': 'Contraseña',
    'common.confirmPassword': 'Confirmar contraseña',
    'common.show': 'Ver',
    'common.hide': 'Ocultar',
    'common.support': 'Contactar soporte',
    'common.retry': 'Reintentar',
    'common.loading': 'Cargando…',
    'route.home': 'Inicio',
    'route.login': 'Iniciar sesión',
    'route.register': 'Crear cuenta',
    'route.forgot': 'Recuperar contraseña',
    'route.reset': 'Restablecer contraseña',
    'route.demo': 'Modo demo',
    'accessibility.skip': 'Saltar al contenido principal',
    'accessibility.currentView': 'Vista actual: {{view}}',
    'home.nav.home': 'Inicio',
    'home.nav.features': 'Características',
    'home.nav.pricing': 'Precios',
    'home.nav.contact': 'Contacto',
    'home.startFree': 'Comenzar gratis',
    'home.badge': 'SISTEMA DE GESTIÓN PARA BARBERÍAS',
    'home.hero.title1': 'Organiza tu barbería.',
    'home.hero.title2': 'Atiende mejor.',
    'home.hero.text': 'BarberTurn te ayuda a gestionar turnos, barberos, servicios y clientes de forma simple y eficiente.',
    'home.viewFeatures': 'Ver características',
    'home.hero.easy.title': 'Fácil de usar',
    'home.hero.easy.text': 'Interfaz intuitiva para ti y tu equipo',
    'home.hero.cloud.title': 'En la nube',
    'home.hero.cloud.text': 'Accede desde cualquier lugar',
    'home.hero.safe.title': 'Seguro',
    'home.hero.safe.text': 'Tus datos siempre protegidos',
    'home.cap.queue.value': 'Fila híbrida',
    'home.cap.queue.label': 'Turnos por llegada y citas',
    'home.cap.multi.value': 'Multi-barbero',
    'home.cap.multi.label': 'Equipo y disponibilidad',
    'home.cap.agile.value': 'Operación ágil',
    'home.cap.agile.label': 'Flujo diario centralizado',
    'home.cap.tv.value': 'Preparado para TV',
    'home.cap.tv.label': 'Experiencia pública en evolución',
    'home.features.kicker': 'TODO LO QUE NECESITAS',
    'home.features.title': 'Una barbería organizada se siente diferente',
    'home.features.text': 'Herramientas diseñadas para modernizar la operación sin obligarte a cambiar la forma en que trabajas.',
    'home.feature.queue.title': 'Cola inteligente',
    'home.feature.queue.text': 'Organiza clientes por orden de llegada, citas o un modelo híbrido sin complicar el trabajo del barbero.',
    'home.feature.barbers.title': 'Gestión de barberos',
    'home.feature.barbers.text': 'Controla disponibilidad, silla, estado y carga de trabajo de cada miembro del equipo.',
    'home.feature.services.title': 'Servicios y precios',
    'home.feature.services.text': 'Configura cortes, barba, combos, duración estimada y precio desde un catálogo central.',
    'home.feature.realtime.title': 'Turnos en tiempo real',
    'home.feature.realtime.text': 'Visualiza quién espera, quién está siendo atendido y cuál es el siguiente turno.',
    'home.feature.tv.title': 'BarberTurn TV',
    'home.feature.tv.text': 'Proyecta la cola de forma clara en una pantalla del local y mantén informados a los clientes.',
    'home.feature.grow.title': 'Diseñado para crecer',
    'home.feature.grow.text': 'Arquitectura preparada para citas, clientes, reportes, pagos y operación multi-barbería.',
    'home.pricing.kicker': 'PRECIOS SIMPLES',
    'home.pricing.title': 'Un plan para cada etapa de tu barbería',
    'home.pricing.text': 'Empieza pequeño y cambia de plan cuando tu operación crezca. Sin complicaciones innecesarias.',
    'home.pricing.month': '/mes',
    'home.pricing.popular': 'MÁS POPULAR',
    'home.pricing.note': 'Precios de lanzamiento sujetos a ajuste antes de la salida comercial.',
    'home.contact.kicker': 'HABLEMOS',
    'home.contact.title': '¿Quieres llevar BarberTurn a tu barbería?',
    'home.contact.text': 'Cuéntanos cómo trabaja tu equipo y qué necesitas mejorar. BarberTurn está pensado para adaptarse a tu operación, no al revés.',
    'home.contact.simple': 'Configuración sencilla',
    'home.contact.real': 'Pensado para barberías reales',
    'home.contact.grow': 'Preparado para crecer contigo',
    'home.contact.cardTitle': 'Empieza con BarberTurn',
    'home.contact.cardText': 'Crea tu cuenta y prepara tu barbería para gestionar sus primeros turnos.',
    'home.contact.cardNote': 'Sin tarjeta para comenzar la etapa de prueba.',
    'home.support.kicker': 'SOPORTE',
    'home.support.title': '¿Algo falló? Estamos para ayudarte.',
    'home.support.text': 'Si no puedes iniciar sesión, encuentras un error o necesitas ayuda con tu cuenta, puedes contactar soporte directamente.',
    'home.support.email': 'Correo de soporte',
    'home.support.report': 'Reportar un problema',
    'home.support.reportText': 'Abre un correo con una plantilla para describir el error.',
    'home.support.whatsapp': 'Contacto directo con soporte.',
    'home.footer.rights': 'Todos los derechos reservados.',
    'login.welcome': 'Bienvenido de nuevo',
    'login.subtitle': 'Inicia sesión para continuar',
    'login.remember': 'Recordarme',
    'login.forgot': '¿Olvidaste tu contraseña?',
    'login.submit': 'Iniciar sesión',
    'login.submitting': 'Ingresando…',
    'login.separator': 'o continúa con',
    'login.demo': 'Explorar BarberTurn en modo demo',
    'login.noAccount': '¿No tienes cuenta?',
    'login.registerHere': 'Regístrate aquí',
    'login.invalid': 'Correo o contraseña incorrectos.',
    'login.genericError': 'No se pudo iniciar sesión.',
    'register.title': 'Crear cuenta',
    'register.subtitle': 'Completa la información para crear tu cuenta',
    'register.fullName': 'Nombre completo',
    'register.fullNamePlaceholder': 'Tu nombre completo',
    'register.passwordHint': 'Mínimo 8 caracteres',
    'register.confirmPlaceholder': 'Repite tu contraseña',
    'register.submit': 'Crear cuenta',
    'register.submitting': 'Creando cuenta…',
    'register.haveAccount': '¿Ya tienes cuenta?',
    'register.signIn': 'Inicia sesión',
    'register.passwordLength': 'La contraseña debe tener al menos 8 caracteres.',
    'register.passwordMismatch': 'Las contraseñas no coinciden.',
    'register.genericError': 'No se pudo crear la cuenta.',
    'register.benefit1': 'Gestiona turnos fácilmente',
    'register.benefit2': 'Organiza tus barberos y servicios',
    'register.benefit3': 'Mejora la experiencia de tus clientes',
    'register.benefit4': 'Reportes y estadísticas de tu negocio',
    'register.showcase': 'Únete a BarberTurn y lleva tu barbería al siguiente nivel.',
    'forgot.title': '¿Olvidaste tu contraseña?',
    'forgot.description': 'Escribe el correo asociado a tu cuenta. Si existe, te enviaremos las instrucciones para recuperar el acceso.',
    'forgot.submit': 'Enviar instrucciones',
    'forgot.submitting': 'Enviando…',
    'forgot.checkEmail': 'Revisa tu correo',
    'forgot.devMode': 'Modo desarrollo',
    'forgot.devText': 'Mientras configuramos el proveedor de correo, puedes probar el flujo con este enlace temporal.',
    'forgot.openReset': 'Abrir enlace de recuperación',
    'forgot.backLogin': 'Volver a iniciar sesión',
    'reset.invalidTitle': 'Enlace inválido',
    'reset.invalidText': 'El enlace de recuperación no contiene un token válido. Solicita uno nuevo para continuar.',
    'reset.requestNew': 'Solicitar nuevo enlace',
    'reset.successTitle': 'Contraseña actualizada',
    'reset.successText': 'Tu nueva contraseña ya está activa. Puedes volver a BarberTurn e iniciar sesión.',
    'reset.title': 'Crea una nueva contraseña',
    'reset.description': 'Usa una contraseña de al menos 8 caracteres que no hayas compartido con otras personas.',
    'reset.newPassword': 'Nueva contraseña',
    'reset.submit': 'Actualizar contraseña',
    'reset.submitting': 'Actualizando…',
    'demo.badge': 'EXPERIENCIA DE DEMOSTRACIÓN',
    'demo.title': 'Explora BarberTurn sin crear una cuenta',
    'demo.description': 'Abriremos un entorno de prueba para que puedas recorrer el flujo operativo del sistema y entender cómo se gestiona una barbería desde BarberTurn.',
    'demo.feature.turns.title': 'Gestionar turnos',
    'demo.feature.turns.text': 'Crea clientes en la fila y recorre los estados principales de atención.',
    'demo.feature.barbers.title': 'Probar barberos',
    'demo.feature.barbers.text': 'Consulta disponibilidad, sillas y estados del equipo de trabajo.',
    'demo.feature.services.title': 'Explorar servicios',
    'demo.feature.services.text': 'Visualiza y administra el catálogo disponible para generar turnos.',
    'demo.preparing': 'Preparando tu sesión demo…',
    'demo.failed': 'No pudimos abrir la demostración automáticamente',
    'demo.connecting': 'Conectando con el entorno de prueba de BarberTurn.',
    'demo.slow': 'La conexión está tardando más de lo habitual. Puedes esperar unos segundos más.',
    'demo.failedText': 'Puedes reintentar el acceso, volver al login o contactar soporte.',
    'demo.retry': 'Reintentar acceso demo',
    'demo.backLogin': 'Volver al login',
    'demo.note': 'Esta sesión usa datos de demostración y se guarda únicamente durante la sesión actual del navegador.',
  },
  en: {
    'language.label': 'Language', 'language.es419': 'Latin American Spanish', 'language.en': 'English', 'language.esES': 'Spanish (Spain)',
    'common.backHome': 'Back to home', 'common.login': 'Sign in', 'common.register': 'Create account', 'common.email': 'Email address', 'common.password': 'Password', 'common.confirmPassword': 'Confirm password', 'common.show': 'Show', 'common.hide': 'Hide', 'common.support': 'Contact support', 'common.retry': 'Retry', 'common.loading': 'Loading…',
    'route.home': 'Home', 'route.login': 'Sign in', 'route.register': 'Create account', 'route.forgot': 'Recover password', 'route.reset': 'Reset password', 'route.demo': 'Demo mode',
    'accessibility.skip': 'Skip to main content', 'accessibility.currentView': 'Current view: {{view}}',
    'home.nav.home': 'Home', 'home.nav.features': 'Features', 'home.nav.pricing': 'Pricing', 'home.nav.contact': 'Contact', 'home.startFree': 'Start free',
    'home.badge': 'BARBERSHOP MANAGEMENT SYSTEM', 'home.hero.title1': 'Organize your barbershop.', 'home.hero.title2': 'Serve customers better.', 'home.hero.text': 'BarberTurn helps you manage queue tickets, barbers, services and customers simply and efficiently.', 'home.viewFeatures': 'View features',
    'home.hero.easy.title': 'Easy to use', 'home.hero.easy.text': 'An intuitive interface for you and your team', 'home.hero.cloud.title': 'Cloud based', 'home.hero.cloud.text': 'Access it from anywhere', 'home.hero.safe.title': 'Secure', 'home.hero.safe.text': 'Your data stays protected',
    'home.cap.queue.value': 'Hybrid queue', 'home.cap.queue.label': 'Walk-ins and appointments', 'home.cap.multi.value': 'Multi-barber', 'home.cap.multi.label': 'Team and availability', 'home.cap.agile.value': 'Agile operations', 'home.cap.agile.label': 'Centralized daily workflow', 'home.cap.tv.value': 'TV ready', 'home.cap.tv.label': 'Public experience in development',
    'home.features.kicker': 'EVERYTHING YOU NEED', 'home.features.title': 'An organized barbershop feels different', 'home.features.text': 'Tools designed to modernize operations without forcing you to change how you work.',
    'home.feature.queue.title': 'Smart queue', 'home.feature.queue.text': 'Organize customers by arrival order, appointments or a hybrid model without complicating the barber workflow.', 'home.feature.barbers.title': 'Barber management', 'home.feature.barbers.text': 'Control availability, chair, status and workload for each team member.', 'home.feature.services.title': 'Services and pricing', 'home.feature.services.text': 'Configure cuts, beard services, combos, estimated duration and pricing from one catalog.', 'home.feature.realtime.title': 'Real-time queue', 'home.feature.realtime.text': 'See who is waiting, who is being served and who is next.', 'home.feature.tv.title': 'BarberTurn TV', 'home.feature.tv.text': 'Display the queue clearly on an in-store screen and keep customers informed.', 'home.feature.grow.title': 'Built to grow', 'home.feature.grow.text': 'Architecture ready for appointments, customers, reports, payments and multi-location operations.',
    'home.pricing.kicker': 'SIMPLE PRICING', 'home.pricing.title': 'A plan for every stage of your barbershop', 'home.pricing.text': 'Start small and switch plans as your operation grows. No unnecessary complexity.', 'home.pricing.month': '/month', 'home.pricing.popular': 'MOST POPULAR', 'home.pricing.note': 'Launch pricing may be adjusted before commercial release.',
    'home.contact.kicker': 'LET’S TALK', 'home.contact.title': 'Want to bring BarberTurn to your barbershop?', 'home.contact.text': 'Tell us how your team works and what you want to improve. BarberTurn is designed to adapt to your operation, not the other way around.', 'home.contact.simple': 'Simple setup', 'home.contact.real': 'Built for real barbershops', 'home.contact.grow': 'Ready to grow with you', 'home.contact.cardTitle': 'Get started with BarberTurn', 'home.contact.cardText': 'Create your account and prepare your barbershop to manage its first queue tickets.', 'home.contact.cardNote': 'No card required to start the trial stage.',
    'home.support.kicker': 'SUPPORT', 'home.support.title': 'Something went wrong? We’re here to help.', 'home.support.text': 'If you cannot sign in, encounter an error or need account help, you can contact support directly.', 'home.support.email': 'Support email', 'home.support.report': 'Report a problem', 'home.support.reportText': 'Opens an email template so you can describe the issue.', 'home.support.whatsapp': 'Contact support directly.', 'home.footer.rights': 'All rights reserved.',
    'login.welcome': 'Welcome back', 'login.subtitle': 'Sign in to continue', 'login.remember': 'Remember me', 'login.forgot': 'Forgot your password?', 'login.submit': 'Sign in', 'login.submitting': 'Signing in…', 'login.separator': 'or continue with', 'login.demo': 'Explore BarberTurn in demo mode', 'login.noAccount': 'Don’t have an account?', 'login.registerHere': 'Create one here', 'login.invalid': 'Incorrect email or password.', 'login.genericError': 'Unable to sign in.',
    'register.title': 'Create account', 'register.subtitle': 'Complete the information to create your account', 'register.fullName': 'Full name', 'register.fullNamePlaceholder': 'Your full name', 'register.passwordHint': 'At least 8 characters', 'register.confirmPlaceholder': 'Repeat your password', 'register.submit': 'Create account', 'register.submitting': 'Creating account…', 'register.haveAccount': 'Already have an account?', 'register.signIn': 'Sign in', 'register.passwordLength': 'Password must be at least 8 characters.', 'register.passwordMismatch': 'Passwords do not match.', 'register.genericError': 'Unable to create the account.', 'register.benefit1': 'Manage queue tickets easily', 'register.benefit2': 'Organize barbers and services', 'register.benefit3': 'Improve the customer experience', 'register.benefit4': 'Business reports and insights', 'register.showcase': 'Join BarberTurn and take your barbershop to the next level.',
    'forgot.title': 'Forgot your password?', 'forgot.description': 'Enter the email associated with your account. If it exists, we will send recovery instructions.', 'forgot.submit': 'Send instructions', 'forgot.submitting': 'Sending…', 'forgot.checkEmail': 'Check your email', 'forgot.devMode': 'Development mode', 'forgot.devText': 'While the email provider is being configured, you can test the flow with this temporary link.', 'forgot.openReset': 'Open recovery link', 'forgot.backLogin': 'Back to sign in',
    'reset.invalidTitle': 'Invalid link', 'reset.invalidText': 'This recovery link does not contain a valid token. Request a new one to continue.', 'reset.requestNew': 'Request a new link', 'reset.successTitle': 'Password updated', 'reset.successText': 'Your new password is active. You can return to BarberTurn and sign in.', 'reset.title': 'Create a new password', 'reset.description': 'Use a password with at least 8 characters that you have not shared with anyone else.', 'reset.newPassword': 'New password', 'reset.submit': 'Update password', 'reset.submitting': 'Updating…',
    'demo.badge': 'DEMO EXPERIENCE', 'demo.title': 'Explore BarberTurn without creating an account', 'demo.description': 'We’ll open a test environment so you can walk through the operational flow and understand how a barbershop is managed with BarberTurn.', 'demo.feature.turns.title': 'Manage the queue', 'demo.feature.turns.text': 'Add customers to the queue and move through the main service states.', 'demo.feature.barbers.title': 'Try barber management', 'demo.feature.barbers.text': 'Check availability, chairs and team statuses.', 'demo.feature.services.title': 'Explore services', 'demo.feature.services.text': 'View and manage the catalog used to create queue tickets.', 'demo.preparing': 'Preparing your demo session…', 'demo.failed': 'We could not open the demo automatically', 'demo.connecting': 'Connecting to the BarberTurn demo environment.', 'demo.slow': 'The connection is taking longer than usual. You can wait a few more seconds.', 'demo.failedText': 'You can retry, go back to sign in or contact support.', 'demo.retry': 'Retry demo access', 'demo.backLogin': 'Back to sign in', 'demo.note': 'This session uses demo data and is stored only for the current browser session.',
  },
  'es-ES': {
    'language.label': 'Idioma', 'language.es419': 'Español Latino', 'language.en': 'English', 'language.esES': 'Español (España)',
    'common.backHome': 'Volver al inicio', 'common.login': 'Iniciar sesión', 'common.register': 'Crear cuenta', 'common.email': 'Correo electrónico', 'common.password': 'Contraseña', 'common.confirmPassword': 'Confirmar contraseña', 'common.show': 'Mostrar', 'common.hide': 'Ocultar', 'common.support': 'Contactar con soporte', 'common.retry': 'Reintentar', 'common.loading': 'Cargando…',
    'route.home': 'Inicio', 'route.login': 'Iniciar sesión', 'route.register': 'Crear cuenta', 'route.forgot': 'Recuperar contraseña', 'route.reset': 'Restablecer contraseña', 'route.demo': 'Modo demo',
    'accessibility.skip': 'Saltar al contenido principal', 'accessibility.currentView': 'Vista actual: {{view}}',
    'home.nav.home': 'Inicio', 'home.nav.features': 'Características', 'home.nav.pricing': 'Precios', 'home.nav.contact': 'Contacto', 'home.startFree': 'Empezar gratis',
    'home.badge': 'SISTEMA DE GESTIÓN PARA BARBERÍAS', 'home.hero.title1': 'Organiza tu barbería.', 'home.hero.title2': 'Atiende mejor.', 'home.hero.text': 'BarberTurn te ayuda a gestionar turnos, barberos, servicios y clientes de forma sencilla y eficiente.', 'home.viewFeatures': 'Ver características',
    'home.hero.easy.title': 'Fácil de usar', 'home.hero.easy.text': 'Una interfaz intuitiva para ti y tu equipo', 'home.hero.cloud.title': 'En la nube', 'home.hero.cloud.text': 'Accede desde cualquier lugar', 'home.hero.safe.title': 'Seguro', 'home.hero.safe.text': 'Tus datos siempre protegidos',
    'home.cap.queue.value': 'Cola híbrida', 'home.cap.queue.label': 'Turnos por llegada y citas', 'home.cap.multi.value': 'Multibarbero', 'home.cap.multi.label': 'Equipo y disponibilidad', 'home.cap.agile.value': 'Operación ágil', 'home.cap.agile.label': 'Flujo diario centralizado', 'home.cap.tv.value': 'Preparado para TV', 'home.cap.tv.label': 'Experiencia pública en evolución',
    'home.features.kicker': 'TODO LO QUE NECESITAS', 'home.features.title': 'Una barbería organizada se nota', 'home.features.text': 'Herramientas diseñadas para modernizar la operativa sin obligarte a cambiar tu forma de trabajar.',
    'home.feature.queue.title': 'Cola inteligente', 'home.feature.queue.text': 'Organiza clientes por orden de llegada, citas o un modelo híbrido sin complicar el trabajo del barbero.', 'home.feature.barbers.title': 'Gestión de barberos', 'home.feature.barbers.text': 'Controla la disponibilidad, silla, estado y carga de trabajo de cada miembro del equipo.', 'home.feature.services.title': 'Servicios y precios', 'home.feature.services.text': 'Configura cortes, barba, packs, duración estimada y precio desde un catálogo central.', 'home.feature.realtime.title': 'Turnos en tiempo real', 'home.feature.realtime.text': 'Visualiza quién espera, quién está siendo atendido y cuál es el siguiente turno.', 'home.feature.tv.title': 'BarberTurn TV', 'home.feature.tv.text': 'Proyecta la cola de forma clara en una pantalla del local y mantén informados a los clientes.', 'home.feature.grow.title': 'Diseñado para crecer', 'home.feature.grow.text': 'Arquitectura preparada para citas, clientes, informes, pagos y operación multibarbería.',
    'home.pricing.kicker': 'PRECIOS SENCILLOS', 'home.pricing.title': 'Un plan para cada etapa de tu barbería', 'home.pricing.text': 'Empieza poco a poco y cambia de plan cuando tu negocio crezca. Sin complicaciones innecesarias.', 'home.pricing.month': '/mes', 'home.pricing.popular': 'MÁS POPULAR', 'home.pricing.note': 'Precios de lanzamiento sujetos a ajustes antes de la salida comercial.',
    'home.contact.kicker': 'HABLEMOS', 'home.contact.title': '¿Quieres llevar BarberTurn a tu barbería?', 'home.contact.text': 'Cuéntanos cómo trabaja tu equipo y qué necesitas mejorar. BarberTurn está pensado para adaptarse a tu operativa, no al revés.', 'home.contact.simple': 'Configuración sencilla', 'home.contact.real': 'Pensado para barberías reales', 'home.contact.grow': 'Preparado para crecer contigo', 'home.contact.cardTitle': 'Empieza con BarberTurn', 'home.contact.cardText': 'Crea tu cuenta y prepara tu barbería para gestionar sus primeros turnos.', 'home.contact.cardNote': 'Sin tarjeta para comenzar el periodo de prueba.',
    'home.support.kicker': 'SOPORTE', 'home.support.title': '¿Algo ha fallado? Estamos para ayudarte.', 'home.support.text': 'Si no puedes iniciar sesión, encuentras un error o necesitas ayuda con tu cuenta, puedes contactar directamente con soporte.', 'home.support.email': 'Correo de soporte', 'home.support.report': 'Informar de un problema', 'home.support.reportText': 'Abre un correo con una plantilla para describir el error.', 'home.support.whatsapp': 'Contacto directo con soporte.', 'home.footer.rights': 'Todos los derechos reservados.',
    'login.welcome': 'Bienvenido de nuevo', 'login.subtitle': 'Inicia sesión para continuar', 'login.remember': 'Recuérdame', 'login.forgot': '¿Has olvidado tu contraseña?', 'login.submit': 'Iniciar sesión', 'login.submitting': 'Iniciando sesión…', 'login.separator': 'o continúa con', 'login.demo': 'Explorar BarberTurn en modo demo', 'login.noAccount': '¿No tienes cuenta?', 'login.registerHere': 'Regístrate aquí', 'login.invalid': 'Correo electrónico o contraseña incorrectos.', 'login.genericError': 'No se ha podido iniciar sesión.',
    'register.title': 'Crear cuenta', 'register.subtitle': 'Completa la información para crear tu cuenta', 'register.fullName': 'Nombre completo', 'register.fullNamePlaceholder': 'Tu nombre completo', 'register.passwordHint': 'Mínimo 8 caracteres', 'register.confirmPlaceholder': 'Repite tu contraseña', 'register.submit': 'Crear cuenta', 'register.submitting': 'Creando cuenta…', 'register.haveAccount': '¿Ya tienes cuenta?', 'register.signIn': 'Inicia sesión', 'register.passwordLength': 'La contraseña debe tener al menos 8 caracteres.', 'register.passwordMismatch': 'Las contraseñas no coinciden.', 'register.genericError': 'No se ha podido crear la cuenta.', 'register.benefit1': 'Gestiona turnos fácilmente', 'register.benefit2': 'Organiza tus barberos y servicios', 'register.benefit3': 'Mejora la experiencia de tus clientes', 'register.benefit4': 'Informes y estadísticas de tu negocio', 'register.showcase': 'Únete a BarberTurn y lleva tu barbería al siguiente nivel.',
    'forgot.title': '¿Has olvidado tu contraseña?', 'forgot.description': 'Escribe el correo asociado a tu cuenta. Si existe, te enviaremos las instrucciones para recuperar el acceso.', 'forgot.submit': 'Enviar instrucciones', 'forgot.submitting': 'Enviando…', 'forgot.checkEmail': 'Revisa tu correo', 'forgot.devMode': 'Modo desarrollo', 'forgot.devText': 'Mientras configuramos el proveedor de correo, puedes probar el flujo con este enlace temporal.', 'forgot.openReset': 'Abrir enlace de recuperación', 'forgot.backLogin': 'Volver a iniciar sesión',
    'reset.invalidTitle': 'Enlace no válido', 'reset.invalidText': 'El enlace de recuperación no contiene un token válido. Solicita uno nuevo para continuar.', 'reset.requestNew': 'Solicitar nuevo enlace', 'reset.successTitle': 'Contraseña actualizada', 'reset.successText': 'Tu nueva contraseña ya está activa. Puedes volver a BarberTurn e iniciar sesión.', 'reset.title': 'Crea una nueva contraseña', 'reset.description': 'Usa una contraseña de al menos 8 caracteres que no hayas compartido con otras personas.', 'reset.newPassword': 'Nueva contraseña', 'reset.submit': 'Actualizar contraseña', 'reset.submitting': 'Actualizando…',
    'demo.badge': 'EXPERIENCIA DE DEMOSTRACIÓN', 'demo.title': 'Explora BarberTurn sin crear una cuenta', 'demo.description': 'Abriremos un entorno de prueba para que puedas recorrer el flujo operativo del sistema y entender cómo se gestiona una barbería desde BarberTurn.', 'demo.feature.turns.title': 'Gestionar turnos', 'demo.feature.turns.text': 'Añade clientes a la cola y recorre los principales estados de atención.', 'demo.feature.barbers.title': 'Probar barberos', 'demo.feature.barbers.text': 'Consulta disponibilidad, sillones y estados del equipo de trabajo.', 'demo.feature.services.title': 'Explorar servicios', 'demo.feature.services.text': 'Visualiza y administra el catálogo disponible para generar turnos.', 'demo.preparing': 'Preparando tu sesión demo…', 'demo.failed': 'No hemos podido abrir la demostración automáticamente', 'demo.connecting': 'Conectando con el entorno de prueba de BarberTurn.', 'demo.slow': 'La conexión está tardando más de lo habitual. Puedes esperar unos segundos más.', 'demo.failedText': 'Puedes reintentar el acceso, volver al inicio de sesión o contactar con soporte.', 'demo.retry': 'Reintentar acceso demo', 'demo.backLogin': 'Volver al inicio de sesión', 'demo.note': 'Esta sesión usa datos de demostración y se guarda únicamente durante la sesión actual del navegador.',
  },
}

function resolveInitialLocale(): Locale {
  const stored = localStorage.getItem(storageKey)
  if (stored === 'es-419' || stored === 'en' || stored === 'es-ES') return stored

  const browserLocale = navigator.language.toLowerCase()
  if (browserLocale === 'es-es') return 'es-ES'
  if (browserLocale.startsWith('en')) return 'en'
  return 'es-419'
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(resolveInitialLocale)

  const setLocale = (nextLocale: Locale) => {
    localStorage.setItem(storageKey, nextLocale)
    setLocaleState(nextLocale)
  }

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t: (key, values) => {
      const template = dictionaries[locale][key] ?? dictionaries['es-419'][key] ?? key
      if (!values) return template
      return Object.entries(values).reduce(
        (result, [name, replacement]) => result.replaceAll(`{{${name}}}`, String(replacement)),
        template,
      )
    },
  }), [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
