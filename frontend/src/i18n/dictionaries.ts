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
import ptBr from './pt-BR'
import fr from './fr'
import de from './de'
import it from './it'
import ht from './ht'
import ja from './ja'
import { coreUiSupplement } from './coreUiSupplement'
import { deepRoutesSupplement } from './deepRoutesSupplement'
import { legalSupplement } from './legalSupplement'
import { asiaWave1 } from './asia-wave1'

const withSupplement = (locale: keyof typeof coreUiSupplement, dictionary: Dictionary): Dictionary => ({
  ...dictionary,
  ...coreUiSupplement[locale],
  ...deepRoutesSupplement[locale],
  ...legalSupplement[locale],
})

const spanish: Dictionary = withSupplement('es-419', {
  ...es419Common,
  ...es419Auth,
  ...es419Dashboard,
  ...es419Billing,
  ...es419Customer,
})

const english: Dictionary = withSupplement('en', {
  ...enCommon,
  ...enAuth,
  ...enDashboard,
  ...enBilling,
  ...enCustomer,
})

const mergeWithEnglish = (dictionary: Dictionary): Dictionary => ({ ...english, ...dictionary })

export const dictionaries = {
  'es-419': spanish,
  // Legacy compatibility only. It is no longer exposed as a product locale.
  'es-ES': spanish,
  en: english,
  'pt-BR': withSupplement('pt-BR', ptBr),
  fr: withSupplement('fr', fr),
  ht: withSupplement('ht', {
    ...ht,
    'language.en': 'Anglè',
    'language.es419': 'Panyòl',
    'language.esES': 'Panyòl',
  }),
  de: withSupplement('de', de),
  it: withSupplement('it', it),
  ja: withSupplement('ja', ja),
  ko: mergeWithEnglish(asiaWave1.ko),
  'zh-CN': mergeWithEnglish(asiaWave1['zh-CN']),
} as Record<Locale, Dictionary>
