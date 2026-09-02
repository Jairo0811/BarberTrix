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
import ptBr from './pt-BR'
import fr from './fr'
import de from './de'
import it from './it'
import nl from './nl'
import ht from './ht'
import { europeWave1 } from './europe-wave1'

const english: Dictionary = { ...enCommon, ...enAuth, ...enDashboard, ...enBilling, ...enCustomer }

export const dictionaries: Record<Locale, Dictionary> = {
  'es-419': { ...es419Common, ...es419Auth, ...es419Dashboard, ...es419Billing, ...es419Customer },
  en: english,
  'es-ES': { ...esEsCommon, ...esEsAuth, ...esEsDashboard, ...esEsBilling, ...esEsCustomer },
  'pt-BR': ptBr,
  fr,
  de,
  it,
  nl,
  ht,
  pl: { ...english, ...europeWave1.pl },
  ro: { ...english, ...europeWave1.ro },
  sv: { ...english, ...europeWave1.sv },
  da: { ...english, ...europeWave1.da },
  nb: { ...english, ...europeWave1.nb },
  fi: { ...english, ...europeWave1.fi },
  cs: { ...english, ...europeWave1.cs },
  el: { ...english, ...europeWave1.el },
  tr: { ...english, ...europeWave1.tr },
  uk: { ...english, ...europeWave1.uk },
  ru: { ...english, ...europeWave1.ru },
}
