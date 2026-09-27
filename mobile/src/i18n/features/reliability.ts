const en = {
  'errors.activeService': 'Finish the active service before changing availability.',
  'pushState.denied': 'Enable BarberTrix notifications in your device settings.', 'pushState.misconfigured': 'Push is not configured in this build. Contact support.', 'pushState.unsupported': 'Push notifications require an Android or iOS build.', 'pushState.unavailable': 'We could not register this device. Try again.', 
  'realtime.Connecting': 'Connecting…', 'realtime.Connected': 'Live', 'realtime.Reconnecting': 'Reconnecting…', 'realtime.Offline': 'Offline',
  'realtime.fallbackTitle': 'Realtime is temporarily unavailable.', 'realtime.fallbackBody': 'You can keep working. BarberTrix continues periodic refresh while the live connection recovers.',
  'errors.chair': 'This chair is already assigned. Choose the suggested chair.', 'errors.member': 'This email already belongs to a team member.',
  'errors.invitation': 'An active invitation already exists for this email.', 'errors.barberLinked': 'This barber is already linked to a member or invitation.',
  'errors.plan': 'Your plan does not allow another resource or this operation.', 'errors.mediaSize': 'The image is too large. Logo: 2 MB maximum. Cover: 5 MB maximum.',
  'errors.mediaEmpty': 'Select an image first.', 'errors.mediaType': 'Select a valid JPG, PNG or WEBP image.',
  'errors.invalid': 'Check the form and try again.', 'errors.session': 'Your session expired. Sign in again.', 'errors.forbidden': 'You do not have permission for this action.',
  'errors.missing': 'This resource is no longer available.', 'errors.conflict': 'The data changed. Refresh and try again.',
  'errors.rateLimit': 'Too many attempts. Wait a moment before trying again.', 'errors.timeout': 'The request timed out. Check its status before retrying.',
  'errors.offline': 'We could not reach BarberTrix. Check your connection.', 'errors.unexpected': 'We could not complete the operation. Try again.',
  'common.retry': 'Retry', 'common.support': 'Support details',
};
const es: Record<keyof typeof en, string> = {
  'errors.activeService': 'Termina el servicio activo antes de cambiar tu disponibilidad.',
  'pushState.denied': 'Activa las notificaciones de BarberTrix en los ajustes del dispositivo.', 'pushState.misconfigured': 'Esta versión no tiene push configurado. Contacta a soporte.', 'pushState.unsupported': 'Las notificaciones push requieren una versión Android o iOS.', 'pushState.unavailable': 'No pudimos registrar este dispositivo. Intenta nuevamente.', 
  'realtime.Connecting': 'Conectando…', 'realtime.Connected': 'En vivo', 'realtime.Reconnecting': 'Reconectando…', 'realtime.Offline': 'Sin conexión',
  'realtime.fallbackTitle': 'El tiempo real está temporalmente no disponible.', 'realtime.fallbackBody': 'Puedes seguir trabajando. BarberTrix mantiene el refresco periódico mientras recupera la conexión en vivo.',
  'errors.chair': 'Esta silla ya está asignada. Selecciona la silla sugerida.', 'errors.member': 'Este correo ya pertenece a un miembro del equipo.',
  'errors.invitation': 'Ya existe una invitación activa para este correo.', 'errors.barberLinked': 'Este barbero ya está vinculado a un miembro o invitación.',
  'errors.plan': 'Tu plan no permite otro recurso o esta operación.', 'errors.mediaSize': 'La imagen es demasiado grande. Logo: máximo 2 MB. Portada: máximo 5 MB.',
  'errors.mediaEmpty': 'Selecciona una imagen primero.', 'errors.mediaType': 'Selecciona una imagen JPG, PNG o WEBP válida.',
  'errors.invalid': 'Revisa los datos del formulario e inténtalo nuevamente.', 'errors.session': 'Tu sesión venció. Inicia sesión nuevamente.', 'errors.forbidden': 'No tienes permiso para realizar esta acción.',
  'errors.missing': 'Este recurso ya no está disponible.', 'errors.conflict': 'Los datos cambiaron. Actualiza e inténtalo nuevamente.',
  'errors.rateLimit': 'Demasiados intentos. Espera un momento antes de continuar.', 'errors.timeout': 'La operación tardó demasiado. Consulta su estado antes de reintentar.',
  'errors.offline': 'No pudimos conectar con BarberTrix. Revisa tu conexión.', 'errors.unexpected': 'No pudimos completar la operación. Intenta nuevamente.',
  'common.retry': 'Reintentar', 'common.support': 'Detalles de soporte',
};
export type ReliabilityKey = keyof typeof en;
// Explicit English fallback for this new namespace until reviewed translations land.
export const reliabilityCopy = (locale: string): Record<ReliabilityKey, string> => locale.startsWith('es') ? es : en;
