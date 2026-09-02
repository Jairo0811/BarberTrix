import { useEffect, useMemo, useState } from 'react'
import { API_URL, clearAuth } from './api'
import { useI18n } from './i18n'

function queryToken() {
  return new URLSearchParams(location.hash.split('?')[1] ?? '').get('token') ?? ''
}

type VerificationState = 'processing' | 'invalid-token' | 'success' | 'error'

export default function VerifyEmailPage() {
  const { t } = useI18n()
  const token = useMemo(queryToken, [])
  const [state, setState] = useState<VerificationState>(token ? 'processing' : 'invalid-token')

  useEffect(() => {
    if (!token) return

    void fetch(`${API_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then(response => {
      if (!response.ok) throw new Error('verification-failed')
      clearAuth()
      setState('success')
    }).catch(() => setState('error'))
  }, [token])

  const ok = state === 'success'
  const message = state === 'processing'
    ? t('verify.processing')
    : state === 'invalid-token'
      ? t('verify.invalidToken')
      : state === 'success'
        ? t('verify.success')
        : t('verify.invalidOrExpired')

  return <main className="login-shell"><section className="login-card">
    <img className="recovery-logo" src="/branding/barberturn-logo.png" alt="BarberTurn" />
    <h1>{ok ? t('verify.successTitle') : t('verify.title')}</h1>
    <p className={ok || state === 'processing' ? 'login-subtitle' : 'login-error'} role="status">{message}</p>
    <a className="login-submit recovery-link-button" href="#/login">{t('verify.goDashboard')}</a>
  </section></main>
}
