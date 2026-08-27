import type { Dictionary, Locale } from './types'
import es419Common from './es-419/common'
import es419Auth from './es-419/auth'
import es419Dashboard from './es-419/dashboard'
import es419Billing from './es-419/billing'
import es419Customer from './es-419/customer'
import enCommon from './en/common'
import enAuth from './en/auth'
import enDashboard from './en/dashboard'
import enBilling from './en/billing'
import enCustomer from './en/customer'
import esEsCommon from './es-ES/common'
import esEsAuth from './es-ES/auth'
import esEsDashboard from './es-ES/dashboard'
import esEsBilling from './es-ES/billing'
import esEsCustomer from './es-ES/customer'

export const dictionaries: Record<Locale, Dictionary> = {
  'es-419': { ...es419Common, ...es419Auth, ...es419Dashboard, ...es419Billing, ...es419Customer },
  en: { ...enCommon, ...enAuth, ...enDashboard, ...enBilling, ...enCustomer },
  'es-ES': { ...esEsCommon, ...esEsAuth, ...esEsDashboard, ...esEsBilling, ...esEsCustomer },
}
