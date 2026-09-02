import type { Locale } from '../../i18n'
import es419Dashboard from '../../i18n/es-419/dashboard'
import enDashboard from '../../i18n/en/dashboard'
import esEsDashboard from '../../i18n/es-ES/dashboard'

export const dashboardCopy = {
  'es-419': es419Dashboard,
  en: enDashboard,
  'es-ES': esEsDashboard,
} satisfies Partial<Record<Locale, Record<string, string>>>

export type DashboardCopy = Record<keyof typeof es419Dashboard, string>
