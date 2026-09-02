import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGlobe } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from './i18n'
import type { LocalePreference } from './i18n/I18nProvider'

const options: Array<{ value: LocalePreference; labelKey?: string; systemLabel?: string }> = [
  { value: 'system', systemLabel: 'Auto' },
  { value: 'es-419', labelKey: 'language.es419' },
  { value: 'en', labelKey: 'language.en' },
  { value: 'es-ES', labelKey: 'language.esES' },
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
            {option.systemLabel ?? t(option.labelKey!)}
          </option>
        ))}
      </select>
    </label>
  )
}
