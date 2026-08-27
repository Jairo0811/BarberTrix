import { FormEvent, useMemo, useState } from 'react'
import { useI18n } from './i18n'
import './auth-recovery.css'
import { publicApi } from './api'
import { apiErrorMessage } from './apiErrorMessages'
import { isStrongPassword, passwordPolicyHint, passwordPolicyMessage } from './passwordPolicy'

function getResetToken() {
  const query = window.location.hash.split('?')[1] ?? ''
  return new URLSearchParams(query).get('token') ?? ''
}

export default function ResetPasswordPage() {
  const { t, locale } = useI18n()
  const token = useMemo(getResetToken, [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')

    const data = new FormData(event.currentTarget)
    const password = String(data.get('password') ?? '')
    const confirmPassword = String(data.get('confirmPassword') ?? '')

    if (!isStrongPassword(password)) {
      setError(passwordPolicyMessage(locale))
      setBusy(false)
      return
    }

    if (password !== confirmPassword) {
      setError(t('register.passwordMismatch'))
      setBusy(false)
      return
    }

    try {
      await publicApi<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
      })
      setSuccess(true)
    } catch (exception) {
      setError(apiErrorMessage(exception, locale, t('login.genericError')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="recovery-page" aria-labelledby="reset-password-title">
      <section className="recovery-card">
        <a className="recovery-logo" href="#/" aria-label={t('common.backHome')}>
          <img src="/branding/barberturn-logo.png" alt="BarberTurn" />
        </a>

        {!token ? (
          <div className="recovery-success">
            <div className="recovery-icon invalid" aria-hidden="true">!</div>
            <h1 id="reset-password-title">{t('reset.invalidTitle')}</h1>
            <p>{t('reset.invalidText')}</p>
            <a className="recovery-primary recovery-action-link" href="#/forgot-password">{t('reset.requestNew')}</a>
          </div>
        ) : success ? (
          <div className="recovery-success" role="status" aria-live="polite">
            <div className="recovery-icon success" aria-hidden="true">✓</div>
            <h1 id="reset-password-title">{t('reset.successTitle')}</h1>
            <p>{t('reset.successText')}</p>
            <a className="recovery-primary recovery-action-link" href="#/login">{t('common.login')}</a>
          </div>
        ) : (
          <>
            <div className="recovery-icon" aria-hidden="true">◇</div>
            <h1 id="reset-password-title">{t('reset.title')}</h1>
            <p className="recovery-description">{t('reset.description')}</p>

            <span id="reset-password-requirements" className="visually-hidden">{passwordPolicyMessage(locale)}</span>

            <form className="recovery-form" onSubmit={resetPassword} aria-busy={busy} aria-describedby={error ? 'reset-password-error' : undefined}>
              <label>
                <span>{t('reset.newPassword')}</span>
                <div className="recovery-input-wrap">
                  <span aria-hidden="true">●</span>
                  <input name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={10} aria-describedby="reset-password-requirements" placeholder={passwordPolicyHint(locale)} required />
                  <button type="button" aria-label={showPassword ? t('common.hide') : t('common.show')} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? t('common.hide') : t('common.show')}</button>
                </div>
              </label>

              <label>
                <span>{t('common.confirmPassword')}</span>
                <div className="recovery-input-wrap">
                  <span aria-hidden="true">●</span>
                  <input name="confirmPassword" type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" minLength={10} aria-describedby="reset-password-requirements" placeholder={t('register.confirmPlaceholder')} required />
                  <button type="button" aria-label={showConfirmation ? t('common.hide') : t('common.show')} aria-pressed={showConfirmation} onClick={() => setShowConfirmation(value => !value)}>{showConfirmation ? t('common.hide') : t('common.show')}</button>
                </div>
              </label>

              <button className="recovery-primary" type="submit" disabled={busy}>
                {busy ? t('reset.submitting') : t('reset.submit')}
              </button>
            </form>

            {error && <p id="reset-password-error" className="recovery-error" role="alert" aria-live="assertive">{error}</p>}
          </>
        )}

        <a className="recovery-back" href="#/login">← {t('forgot.backLogin')}</a>
      </section>
    </main>
  )
}
