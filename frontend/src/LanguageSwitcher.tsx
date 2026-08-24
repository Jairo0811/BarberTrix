import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGlobe } from '@fortawesome/free-solid-svg-icons'
import { Locale, useI18n } from './i18n'

const options: Array<{ value: Locale; labelKey: string }> = [
  { value: 'es-419', labelKey: 'language.es419' },
  { value: 'en', labelKey: 'language.en' },
  { value: 'es-ES', labelKey: 'language.esES' },
]

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()

  return (
    <label className="language-switcher">
      <span className="language-switcher-icon" aria-hidden="true">
        <FontAwesomeIcon icon={faGlobe} />
      </span>
      <span className="visually-hidden">{t('language.label')}</span>
      <select
        aria-label={t('language.label')}
        value={locale}
        onChange={event => setLocale(event.target.value as Locale)}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </label>
  )
}
