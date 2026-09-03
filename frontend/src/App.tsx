import { FormEvent, lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faEnvelope, faEye, faEyeSlash, faFlask, faLock } from '@fortawesome/free-solid-svg-icons'
import type { Auth } from './types'
import { useI18n } from './i18n'
import { api, clearAuth, publicApi, readAuth, writeAuth } from './api'
import { apiErrorMessage } from './apiErrorMessages'
import SubscriptionBanner from './SubscriptionBanner'

const demoStorageKey = 'barbertrix.demo'
const DashboardView = lazy(() => import('./DashboardView'))
const BarberPortal = lazy(() => import('./BarberPortal'))

type OnboardingShop = { id: string; name: string; slug: string; timeZoneId: string }
type OnboardingJoinRequest = { id: string; barberShopId: string; barberShopName: string; status: 'Pending' | 'Approved' | 'Rejected' | 'Withdrawn'; reviewNote?: string | null }

function BarberOnboardingPanel({ auth, onLogout, onAuthChanged }: { auth: Auth; onLogout: () => void; onAuthChanged: (next: Auth) => void }) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [shops, setShops] = useState<OnboardingShop[]>([])
  const [requests, setRequests] = useState<OnboardingJoinRequest[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const pendingByShop = useMemo(() => new Map(requests.filter(item => item.status === 'Pending').map(item => [item.barberShopId, item])), [requests])

  async function load(search = query) {
    setBusy(true); setMessage('')
    try {
      const suffix = search.trim() ? `?query=${encodeURIComponent(search.trim())}` : ''
      const [shopResults, joinRequests] = await Promise.all([api<OnboardingShop[]>(`/api/onboarding/shops${suffix}`), api<OnboardingJoinRequest[]>('/api/onboarding/join-requests')])
      setShops(shopResults); setRequests(joinRequests)
      if (joinRequests.some(item => item.status === 'Approved')) {
        const next = await publicApi<Auth>('/api/auth/refresh', { method: 'POST' })
        writeAuth(next); onAuthChanged(next)
      }
    } catch { setMessage(t('onboarding.loadError')) }
    finally { setBusy(false) }
  }

  useEffect(() => { void load('') }, [])

  async function requestJoin(shop: OnboardingShop) {
    setBusy(true); setMessage('')
    try { await api(`/api/onboarding/join-requests/${shop.id}`, { method: 'POST' }); await load(query); setMessage(t('onboarding.requestSent', { shop: shop.name })) }
    catch { setMessage(t('onboarding.requestError')); setBusy(false) }
  }

  async function withdraw(request: OnboardingJoinRequest) {
    setBusy(true); setMessage('')
    try { await api(`/api/onboarding/join-requests/${request.id}`, { method: 'DELETE' }); await load(query) }
    catch { setMessage(t('onboarding.withdrawError')); setBusy(false) }
  }

  return <main className="login-shell"><section className="login-card">
    <BarberTrixLogo /><h1>{t('onboarding.title')}</h1>
    <p className="login-subtitle">{t('onboarding.subtitle', { name: auth.name })}</p>
    <div className="login-form"><label className="login-field"><span>{t('onboarding.shop')}</span><div className="input-wrap"><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('onboarding.shopPlaceholder')} /></div></label>
      <button className="login-submit" disabled={busy} onClick={() => void load(query)}>{busy ? t('onboarding.loading') : t('onboarding.search')}</button></div>
    <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
      {shops.map(shop => { const pending = pendingByShop.get(shop.id); return <article key={shop.id} style={{ border: '1px solid var(--border, #ddd)', borderRadius: 12, padding: 14 }}>
        <strong>{shop.name}</strong><p className="login-subtitle">@{shop.slug}</p>
        {pending ? <button className="demo-button" disabled={busy} onClick={() => void withdraw(pending)}>{t('onboarding.withdraw')}</button> : <button className="login-submit" disabled={busy} onClick={() => void requestJoin(shop)}>{t('onboarding.requestJoin')}</button>}
      </article> })}
    </div>
    <h2 style={{ marginTop: 22 }}>{t('onboarding.myRequests')}</h2>
    {requests.length === 0 ? <p className="login-subtitle">{t('onboarding.noRequests')}</p> : requests.map(request => <p key={request.id} className="login-subtitle"><strong>{request.barberShopName}</strong> · {t(`onboarding.status.${request.status}`)}{request.reviewNote ? ` · ${request.reviewNote}` : ''}</p>)}
    <button className="demo-button" disabled={busy} onClick={() => void load(query)}>{t('onboarding.refreshStatus')}</button>
    <button className="demo-button" type="button" onClick={onLogout}>{t('logout')}</button>
    {message && <p className="login-error" role="status">{message}</p>}
  </section></main>
}

function BarberTrixLogo() {
  return (
    <div className="official-logo" aria-label="BarberTrix">
      <img src="/branding/barbertrix-logo.png" alt="BarberTrix" />
    </div>
  )
}

export default function App() {
  const { t, locale } = useI18n()
  const [auth, setAuth] = useState<Auth | null>(readAuth)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isDemo = sessionStorage.getItem(demoStorageKey) === 'true'

  useEffect(() => {
    if (!auth) return
    if (!auth.isEmailVerified) {
      document.title = `${t('verification.documentTitle')} | BarberTrix`
      return
    }
    if (auth.role === 'Barber') document.title = `${t('barber.documentTitle')} | BarberTrix`
  }, [auth, t])

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')

    const data = new FormData(event.currentTarget)

    try {
      const nextAuth = await publicApi<Auth>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
      })
      const remember = data.get('remember') === 'on'

      sessionStorage.removeItem(demoStorageKey)
      writeAuth(nextAuth, remember)
      setAuth(nextAuth)
    } catch (exception) {
      setError(apiErrorMessage(exception, locale, t('login.genericError')))
    } finally {
      setBusy(false)
    }
  }

  function logout() {
    void publicApi<void>('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    clearAuth()
    sessionStorage.removeItem(demoStorageKey)
    setAuth(null)
    window.location.hash = '#/login'
  }

  async function resendVerification() {
    setBusy(true); setError('')
    try { await api('/api/auth/send-verification', { method: 'POST' }); setError(t('verification.resendSuccess')) }
    catch { setError(t('verification.resendError')) }
    finally { setBusy(false) }
  }

  if (auth && !auth.isEmailVerified) return <main className="login-shell"><section className="login-card">
    <BarberTrixLogo /><h1>{t('verification.title')}</h1><p className="login-subtitle">{t('verification.text')}</p>
    <button className="login-submit" disabled={busy} onClick={() => void resendVerification()}>{busy ? t('verification.sending') : t('verification.resend')}</button>
    <button className="demo-button" type="button" onClick={logout}>{t('logout')}</button>
    {error && <p className="login-error" role="status">{error}</p>}
  </section></main>

  if (auth?.sessionScope === 'Onboarding') return <BarberOnboardingPanel auth={auth} onLogout={logout} onAuthChanged={setAuth} />

  if (auth?.role === 'Barber') return <Suspense fallback={<main className="login-shell"><p>{t('loading.barberPortal')}</p></main>}><BarberPortal auth={auth} onLogout={logout} /></Suspense>

  if (auth) return <>
    <SubscriptionBanner auth={auth} isDemo={isDemo} />
    <Suspense fallback={<main className="login-shell"><p>{t('loading.dashboard')}</p></main>}><DashboardView auth={auth} isDemo={isDemo} onLogout={logout} /></Suspense>
  </>

  return (
    <main className="login-shell login-split" aria-labelledby="login-title">
      <section className="login-panel">
        <div className="login-card">
          <a className="back-home-link" href="#/">
            <span className="back-home-icon" aria-hidden="true"><FontAwesomeIcon icon={faArrowLeft} /></span>
            {t('common.backHome')}
          </a>

          <BarberTrixLogo />
          <h1 id="login-title">{t('login.welcome')}</h1>
          <p className="login-subtitle">{t('login.subtitle')}</p>

          <form
            className="login-form"
            onSubmit={login}
            aria-busy={busy}
            aria-describedby={error ? 'login-error' : undefined}
          >
            <label className="login-field">
              <span>{t('common.email')}</span>
              <div className="input-wrap">
                <span className="field-icon" aria-hidden="true"><FontAwesomeIcon icon={faEnvelope} /></span>
                <input name="email" type="email" autoComplete="email" inputMode="email" placeholder={t('login.emailPlaceholder')} required />
              </div>
            </label>

            <label className="login-field">
              <span>{t('common.password')}</span>
              <div className="input-wrap">
                <span className="field-icon" aria-hidden="true"><FontAwesomeIcon icon={faLock} /></span>
                <input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••••••" required />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? t('common.hide') : t('common.show')}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(value => !value)}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} aria-hidden="true" />
                  <span>{showPassword ? t('common.hide') : t('common.show')}</span>
                </button>
              </div>
            </label>

            <div className="login-options">
              <label className="remember-option">
                <input name="remember" type="checkbox" defaultChecked />
                <span>{t('login.remember')}</span>
              </label>
              <a className="forgot-link" href="#/forgot-password">{t('login.forgot')}</a>
            </div>

            <button className="login-submit" type="submit" disabled={busy}>
              {busy ? t('login.submitting') : t('login.submit')}
            </button>
          </form>

          <div className="login-separator" aria-hidden="true"><span>{t('login.separator')}</span></div>

          <button className="demo-button" type="button" onClick={() => { window.location.hash = '#/demo' }}>
            <FontAwesomeIcon icon={faFlask} aria-hidden="true" />
            <span>{t('login.demo')}</span>
          </button>

          <p className="register-copy">
            {t('login.noAccount')} <a className="register-link" href="#/register">{t('login.registerHere')}</a>
          </p>
          {error && <p id="login-error" className="login-error" role="alert" aria-live="assertive">{error}</p>}
        </div>
      </section>
    </main>
  )
}