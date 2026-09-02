import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGlobe } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from './i18n'
import type { Locale } from './i18n'
import type { LocalePreference } from './i18n/I18nProvider'
import { officialLocaleLabels, officialLocales } from './i18n/officialLocales'

const options: Array<{ value: LocalePreference; label: string }> = [
  { value: 'system', label: 'Auto' },
  ...officialLocales.map(locale => ({ value: locale, label: officialLocaleLabels[locale] })),
]

const automaticLabels: Partial<Record<Locale, string>> = {
  'es-419': 'Automático',
  en: 'Auto',
  'pt-BR': 'Automático',
  fr: 'Automatique',
  ht: 'Otomatik',
  de: 'Automatisch',
  it: 'Automatico',
  ja: '自動',
  ko: '자동',
  'zh-CN': '自动',
}

export default function LanguageSwitcher() {
  const { locale, localePreference, setLocalePreference, t } = useI18n()

  return (
    <label className="language-switcher">
      <span className="language-switcher-icon" aria-hidden="true"><FontAwesomeIcon icon={faGlobe} /></span>
      <span className="visually-hidden">{t('language.label')}</span>
      <select
        aria-label={t('language.label')}
        value={localePreference}
        onChange={event => setLocalePreference(event.target.value as LocalePreference)}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.value === 'system' ? automaticLabels[locale] ?? option.label : option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
