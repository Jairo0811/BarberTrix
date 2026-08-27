import { FormEvent, useState } from 'react'
import { useI18n } from './i18n'
import './auth-recovery.css'
import { publicApi } from './api'
import { apiErrorMessage } from './apiErrorMessages'

type ForgotPasswordResponse = {
  message: string
  developmentResetUrl?: string | null
}

export default function ForgotPasswordPage() {
  const { t, locale } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ForgotPasswordResponse | null>(null)

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setResult(null)

    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '').trim()

    try {
      const response = await publicApi<ForgotPasswordResponse>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setResult(response)
    } catch (exception) {
      setError(apiErrorMessage(exception, locale, t('login.genericError')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="recovery-page" aria-labelledby="forgot-password-title">
      <section className="recovery-card">
        <a className="recovery-logo" href="#/" aria-label={t('common.backHome')}>
          <img src="/branding/barberturn-logo.png" alt="BarberTurn" />
        </a>

        {!result ? (
          <>
            <div className="recovery-icon" aria-hidden="true">↺</div>
            <h1 id="forgot-password-title">{t('forgot.title')}</h1>
            <p className="recovery-description">{t('forgot.description')}</p>

            <form className="recovery-form" onSubmit={requestReset} aria-busy={busy} aria-describedby={error ? 'forgot-password-error' : undefined}>
              <label>
                <span>{t('common.email')}</span>
                <div className="recovery-input-wrap">
                  <span aria-hidden="true">✉</span>
                  <input name="email" type="email" autoComplete="email" inputMode="email" placeholder="ejemplo@barberia.com" required />
                </div>
              </label>

              <button className="recovery-primary" type="submit" disabled={busy}>
                {busy ? t('forgot.submitting') : t('forgot.submit')}
              </button>
            </form>

            {error && <p id="forgot-password-error" className="recovery-error" role="alert" aria-live="assertive">{error}</p>}
          </>
        ) : (
          <div className="recovery-success" role="status" aria-live="polite" aria-atomic="true">
            <div className="recovery-icon success" aria-hidden="true">✓</div>
            <h1 id="forgot-password-title">{t('forgot.checkEmail')}</h1>
            <p>{result.message}</p>

            {result.developmentResetUrl && (
              <div className="development-reset">
                <strong>{t('forgot.devMode')}</strong>
                <span>{t('forgot.devText')}</span>
                <a href={result.developmentResetUrl}>{t('forgot.openReset')}</a>
              </div>
            )}
          </div>
        )}

        <a className="recovery-back" href="#/login">← {t('forgot.backLogin')}</a>
      </section>
    </main>
  )
}
