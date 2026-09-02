import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGlobe } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from './i18n'
import type { LocalePreference } from './i18n/I18nProvider'

const options: Array<{ value: LocalePreference; label: string }> = [
  { value: 'system', label: 'Auto' },
  { value: 'es-419', label: 'Español Latino' }, { value: 'es-ES', label: 'Español (España)' }, { value: 'en', label: 'English' }, { value: 'pt-BR', label: 'Português' }, { value: 'fr', label: 'Français' }, { value: 'nl', label: 'Nederlands' }, { value: 'ht', label: 'Kreyòl ayisyen' }, { value: 'de', label: 'Deutsch' }, { value: 'it', label: 'Italiano' },
  { value: 'pl', label: 'Polski' }, { value: 'ro', label: 'Română' }, { value: 'sv', label: 'Svenska' }, { value: 'da', label: 'Dansk' }, { value: 'nb', label: 'Norsk' }, { value: 'fi', label: 'Suomi' }, { value: 'cs', label: 'Čeština' }, { value: 'el', label: 'Ελληνικά' }, { value: 'tr', label: 'Türkçe' }, { value: 'uk', label: 'Українська' }, { value: 'ru', label: 'Русский' },
  { value: 'et', label: 'Eesti' }, { value: 'lv', label: 'Latviešu' }, { value: 'lt', label: 'Lietuvių' }, { value: 'sk', label: 'Slovenčina' }, { value: 'sl', label: 'Slovenščina' }, { value: 'hr', label: 'Hrvatski' }, { value: 'sr', label: 'Српски' }, { value: 'bs', label: 'Bosanski' }, { value: 'bg', label: 'Български' }, { value: 'sq', label: 'Shqip' }, { value: 'mk', label: 'Македонски' }, { value: 'hu', label: 'Magyar' }, { value: 'is', label: 'Íslenska' }, { value: 'ga', label: 'Gaeilge' }, { value: 'mt', label: 'Malti' }, { value: 'ca', label: 'Català' }, { value: 'ka', label: 'ქართული' }, { value: 'hy', label: 'Հայերեն' }, { value: 'az', label: 'Azərbaycan dili' },
  { value: 'ar', label: 'العربية' }, { value: 'sw', label: 'Kiswahili' }, { value: 'af', label: 'Afrikaans' }, { value: 'am', label: 'አማርኛ' }, { value: 'so', label: 'Soomaali' }, { value: 'ha', label: 'Hausa' }, { value: 'yo', label: 'Yorùbá' }, { value: 'ig', label: 'Igbo' }, { value: 'zu', label: 'isiZulu' }, { value: 'xh', label: 'isiXhosa' },
  { value: 'wo', label: 'Wolof' }, { value: 'ln', label: 'Lingála' }, { value: 'rw', label: 'Kinyarwanda' }, { value: 'rn', label: 'Kirundi' }, { value: 'st', label: 'Sesotho' }, { value: 'tn', label: 'Setswana' }, { value: 'sn', label: 'ChiShona' }, { value: 'ny', label: 'Chichewa' }, { value: 'mg', label: 'Malagasy' }, { value: 'ti', label: 'ትግርኛ' }, { value: 'om', label: 'Afaan Oromoo' }, { value: 'ak', label: 'Akan / Twi' },
]

export default function LanguageSwitcher() {
  const { localePreference, setLocalePreference, t } = useI18n()
  return (
    <label className="language-switcher">
      <span className="language-switcher-icon" aria-hidden="true"><FontAwesomeIcon icon={faGlobe} /></span>
      <span className="visually-hidden">{t('language.label')}</span>
      <select aria-label={t('language.label')} value={localePreference} onChange={event => setLocalePreference(event.target.value as LocalePreference)}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}
