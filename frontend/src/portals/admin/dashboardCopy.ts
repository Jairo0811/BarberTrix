import type { Locale } from '../../i18n'
import { dictionaries } from '../../i18n/dictionaries'
import es419Dashboard from '../../i18n/es-419/dashboard'

export type DashboardCopy = Record<keyof typeof es419Dashboard, string>

export function getDashboardCopy(locale: Locale): DashboardCopy {
  return dictionaries[locale] as DashboardCopy
}