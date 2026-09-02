import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGlobe } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from './i18n'
import type { LocalePreference } from './i18n/I18nProvider'

const options: Array<{ value: LocalePreference; label: string }> = [
  { value: 'system', label: 'Auto' },
  { value: 'es-419', label: 'Español Latino' },
  { value: 'es-ES', label: 'Español (España)' },
  { value: 'en', label: 'English' },
  { value: 'pt-BR', label: 'Português' },
  { value: 'fr', label: 'Français' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'ht', label: 'Kreyòl ayisyen' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
]

export default function LanguageSwitcher() {
  const { localePreference, setLocalePreference, t } = useI18n()

  return (
    <label className="language-switcher">
      <span className="language-switcher-icon" aria-hidden="true">
        <FontAwesomeIcon icon={faGlobe} />
      </span>
      <span className="visually-hidden">{t('language.label')}</span>
      <select
        aria-label={t('language.label')}
        value={localePreference}
        onChange={event => setLocalePreference(event.target.value as LocalePreference)}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
