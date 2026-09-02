import type { Locale } from '../../i18n'
import es419Dashboard from '../../i18n/es-419/dashboard'
import enDashboard from '../../i18n/en/dashboard'
import esEsDashboard from '../../i18n/es-ES/dashboard'
import ja from '../../i18n/ja'

export type DashboardCopy = Record<keyof typeof es419Dashboard, string>

const baseDashboardCopy: Partial<Record<Locale, DashboardCopy>> = {
  'es-419': es419Dashboard,
  en: enDashboard,
  'es-ES': esEsDashboard,
  ja: ja as DashboardCopy,
}

export function getDashboardCopy(locale: Locale): DashboardCopy {
  return baseDashboardCopy[locale] ?? baseDashboardCopy.en ?? es419Dashboard
}
