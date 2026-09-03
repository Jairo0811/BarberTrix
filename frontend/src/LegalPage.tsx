import { useI18n } from './i18n'
import './legal.css'

const lastUpdated = new Date('2026-08-25T00:00:00Z')

export default function LegalPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const { locale, t } = useI18n()
  const privacy = kind === 'privacy'
  const paragraphKeys = privacy
    ? ['legal.privacy.p1', 'legal.privacy.p2', 'legal.privacy.p3', 'legal.privacy.p4']
    : ['legal.terms.p1', 'legal.terms.p2', 'legal.terms.p3', 'legal.terms.p4']
  const formattedDate = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(lastUpdated)

  return <main className="login-shell"><article className="login-card legal-card">
    <a className="back-home-link" href="#/">← {t('legal.backHome')}</a>
    <img className="legal-logo" src="/branding/barbertrix-logo.png" alt="BarberTrix" />
    <h1>{privacy ? t('legal.privacyTitle') : t('legal.termsTitle')}</h1>
    <p className="login-subtitle">{t('legal.lastUpdated', { date: formattedDate })}</p>
    {paragraphKeys.map(key => <p key={key}>{t(key)}</p>)}
    <p><small>{t('legal.draftNotice')}</small></p>
  </article></main>
}
