const en = {
 'operations.push.idle': 'Not registered', 'operations.push.enabling': 'Registering…', 'operations.push.enabled': 'Registered', 'operations.push.denied': 'Permission denied', 'operations.push.error': 'Registration failed',
 'operations.deviceHistory': 'Recent requests saved on this device', 'operations.details': 'View status',
 'operations.today': 'Today', 'operations.settings': 'Settings', 'operations.team': 'Team', 'operations.queue': 'Queue', 'operations.appointments': 'Today’s appointments',
 'operations.wait': 'Estimated wait', 'operations.empty': 'Nothing scheduled here yet.', 'operations.call': 'Call', 'operations.start': 'Start service', 'operations.complete': 'Complete', 'operations.noShow': 'No-show',
 'operations.Available': 'Available', 'operations.Busy': 'In service', 'operations.Break': 'On break', 'operations.Offline': 'Off shift',
 'operations.Waiting': 'Waiting', 'operations.Called': 'Called', 'operations.InService': 'In service', 'operations.Completed': 'Completed', 'operations.Cancelled': 'Cancelled', 'operations.NoShow': 'No-show',
 'operations.account': 'Account', 'operations.language': 'Language', 'operations.notifications': 'Notifications', 'operations.privacy': 'Privacy', 'operations.terms': 'Terms',
 'operations.diagnostics': 'Diagnostics', 'operations.version': 'Version', 'operations.apiUp': 'API reachable', 'operations.apiDown': 'API unavailable', 'operations.environment': 'Environment',
 'operations.discover': 'Discover', 'operations.myTurns': 'My turns', 'operations.profile': 'Profile', 'operations.share': 'Share booking link', 'operations.rebook': 'Book again',
};
const es: Record<keyof typeof en, string> = {
 'operations.push.idle': 'Sin registrar', 'operations.push.enabling': 'Registrando…', 'operations.push.enabled': 'Registrado', 'operations.push.denied': 'Permiso denegado', 'operations.push.error': 'Error al registrar',
 'operations.deviceHistory': 'Solicitudes recientes guardadas en este dispositivo', 'operations.details': 'Ver estado',
 'operations.today': 'Hoy', 'operations.settings': 'Ajustes', 'operations.team': 'Equipo', 'operations.queue': 'Cola', 'operations.appointments': 'Citas de hoy',
 'operations.wait': 'Espera estimada', 'operations.empty': 'Todavía no hay actividad aquí.', 'operations.call': 'Llamar', 'operations.start': 'Iniciar servicio', 'operations.complete': 'Completar', 'operations.noShow': 'No se presentó',
 'operations.Available': 'Disponible', 'operations.Busy': 'En servicio', 'operations.Break': 'En pausa', 'operations.Offline': 'Fuera de turno',
 'operations.Waiting': 'Esperando', 'operations.Called': 'Llamado', 'operations.InService': 'En servicio', 'operations.Completed': 'Completado', 'operations.Cancelled': 'Cancelado', 'operations.NoShow': 'No se presentó',
 'operations.account': 'Cuenta', 'operations.language': 'Idioma', 'operations.notifications': 'Notificaciones', 'operations.privacy': 'Privacidad', 'operations.terms': 'Términos',
 'operations.diagnostics': 'Diagnóstico', 'operations.version': 'Versión', 'operations.apiUp': 'API disponible', 'operations.apiDown': 'API no disponible', 'operations.environment': 'Entorno',
 'operations.discover': 'Descubrir', 'operations.myTurns': 'Mis turnos', 'operations.profile': 'Perfil', 'operations.share': 'Compartir enlace de reservas', 'operations.rebook': 'Reservar de nuevo',
};
export const operationsCopy = (locale: string) => locale.startsWith('es') ? es : en;
