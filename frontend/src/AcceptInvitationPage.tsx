import { FormEvent, useMemo, useState } from 'react'
import { publicApi, writeAuth } from './api'
import { apiErrorMessage } from './apiErrorMessages'
import { useI18n } from './i18n'
import { isStrongPassword, passwordPolicyMessage } from './passwordPolicy'
import type { Auth } from './types'

function queryToken() {
  return new URLSearchParams(location.hash.split('?')[1] ?? '').get('token') ?? ''
}

export default function AcceptInvitationPage() {
  const { locale, t } = useI18n()
  const token = useMemo(queryToken, [])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const data = new FormData(event.currentTarget)
    const password = String(data.get('password') ?? '')

    if (!isStrongPassword(password)) {
      setError(passwordPolicyMessage(locale))
      setBusy(false)
      return
    }

    if (password !== String(data.get('confirmation') ?? '')) {
      setError(t('invitation.passwordMismatch'))
      setBusy(false)
      return
    }

    try {
      const auth = await publicApi<Auth>('/api/auth/accept-invitation', {
        method: 'POST',
        body: JSON.stringify({ token, password, acceptedTerms: data.get('acceptedTerms') === 'on' }),
      })
      writeAuth(auth, true)
      location.hash = '#/login'
      location.reload()
    } catch (exception) {
      setError(apiErrorMessage(exception, locale, t('invitation.acceptError')))
    } finally {
      setBusy(false)
    }
  }

  return <main className="login-shell"><section className="login-card">
    <a className="back-home-link" href="#/login">← {t('invitation.backLogin')}</a>
    <img className="recovery-logo" src="/branding/barberturn-logo.png" alt="BarberTurn" />
    <h1>{t('invitation.title')}</h1>
    <p className="login-subtitle">{t('invitation.subtitle')}</p>
    {!token ? <p className="login-error" role="alert">{t('invitation.invalid')}</p> : <form className="login-form" onSubmit={accept}>
      <label className="login-field"><span>{t('common.password')}</span><div className="input-wrap"><input name="password" type="password" minLength={10} required autoComplete="new-password" /></div></label>
      <label className="login-field"><span>{t('common.confirmPassword')}</span><div className="input-wrap"><input name="confirmation" type="password" minLength={10} required autoComplete="new-password" /></div></label>
      <label className="remember-option"><input name="acceptedTerms" type="checkbox" required /><span>{t('invitation.acceptTerms')}</span></label>
      <button className="login-submit" disabled={busy}>{busy ? t('invitation.activating') : t('invitation.activate')}</button>
    </form>}
    {error && <p className="login-error" role="alert">{error}</p>}
  </section></main>
}
