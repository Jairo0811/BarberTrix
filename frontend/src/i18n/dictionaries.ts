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
import { europeWave2 } from './europe-wave2'
import { africaWave1 } from './africa-wave1'

const english: Dictionary = { ...enCommon, ...enAuth, ...enDashboard, ...enBilling, ...enCustomer }
const merge = (dictionary: Dictionary): Dictionary => ({ ...english, ...dictionary })

export const dictionaries: Record<Locale, Dictionary> = {
  'es-419': { ...es419Common, ...es419Auth, ...es419Dashboard, ...es419Billing, ...es419Customer },
  en: english,
  'es-ES': { ...esEsCommon, ...esEsAuth, ...esEsDashboard, ...esEsBilling, ...esEsCustomer },
  'pt-BR': ptBr, fr, de, it, nl, ht,
  pl: merge(europeWave1.pl), ro: merge(europeWave1.ro), sv: merge(europeWave1.sv), da: merge(europeWave1.da), nb: merge(europeWave1.nb), fi: merge(europeWave1.fi), cs: merge(europeWave1.cs), el: merge(europeWave1.el), tr: merge(europeWave1.tr), uk: merge(europeWave1.uk), ru: merge(europeWave1.ru),
  et: merge(europeWave2.et), lv: merge(europeWave2.lv), lt: merge(europeWave2.lt), sk: merge(europeWave2.sk), sl: merge(europeWave2.sl), hr: merge(europeWave2.hr), sr: merge(europeWave2.sr), bs: merge(europeWave2.bs), bg: merge(europeWave2.bg), sq: merge(europeWave2.sq), mk: merge(europeWave2.mk), hu: merge(europeWave2.hu), is: merge(europeWave2.is), ga: merge(europeWave2.ga), mt: merge(europeWave2.mt), ca: merge(europeWave2.ca), ka: merge(europeWave2.ka), hy: merge(europeWave2.hy), az: merge(europeWave2.az),
  ar: merge(africaWave1.ar), sw: merge(africaWave1.sw), af: merge(africaWave1.af), am: merge(africaWave1.am), so: merge(africaWave1.so), ha: merge(africaWave1.ha), yo: merge(africaWave1.yo), ig: merge(africaWave1.ig), zu: merge(africaWave1.zu), xh: merge(africaWave1.xh),
}
