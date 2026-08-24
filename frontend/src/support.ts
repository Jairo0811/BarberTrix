const DEFAULT_SUPPORT_EMAIL = 'jairo_1829@hotmail.com'

const configuredEmail = import.meta.env.VITE_SUPPORT_EMAIL?.trim()
const configuredWhatsApp = import.meta.env.VITE_SUPPORT_WHATSAPP?.replace(/\D/g, '')

export const supportConfig = {
  email: configuredEmail || DEFAULT_SUPPORT_EMAIL,
  whatsapp: configuredWhatsApp || '',
}

export function buildSupportEmailHref(subject = 'Solicitud de soporte BarberTurn') {
  const body = [
    'Hola, necesito ayuda con BarberTurn.',
    '',
    'Describe aquí lo ocurrido:',
    '',
    'Pasos para reproducir el problema:',
    '',
    'Navegador/dispositivo:',
  ].join('\n')

  return `mailto:${supportConfig.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function buildWhatsAppHref() {
  if (!supportConfig.whatsapp) return null

  const message = 'Hola, necesito ayuda con BarberTurn.'
  return `https://wa.me/18298477528?text=${encodeURIComponent(message)}`
}
