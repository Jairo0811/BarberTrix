import { FormEvent, useState } from 'react'
import { useI18n } from './i18n'
import './register.css'

type AuthResponse = {
  accessToken: string
  expiresAtUtc: string
  userId: string
  barberShopId: string
  name: string
  role: string
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
const authStorageKey = 'barberturn.auth'

function buildShopSlug(name: string) {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36)

  return `${normalized || 'barberia'}-${crypto.randomUUID().slice(0, 6)}`
}

export default function RegisterPage() {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const benefits = [t('register.benefit1'), t('register.benefit2'), t('register.benefit3'), t('register.benefit4')]

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')

    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    const confirmPassword = String(data.get('confirmPassword') ?? '')

    if (password.length < 8) {
      setError(t('register.passwordLength'))
      setBusy(false)
      return
    }

    if (password !== confirmPassword) {
      setError(t('register.passwordMismatch'))
      setBusy(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/register-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberShopName: `Barbería de ${name}`,
          barberShopSlug: buildShopSlug(name),
          name,
          email,
          password,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? t('register.genericError'))
      }

      const auth = await response.json() as AuthResponse
      localStorage.setItem(authStorageKey, JSON.stringify(auth))
      sessionStorage.removeItem(authStorageKey)
      window.location.hash = '#/login'
      window.location.reload()
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : t('register.genericError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="register-page" aria-labelledby="register-title">
      <section className="register-showcase" aria-label="BarberTurn">
        <div className="register-showcase-overlay" aria-hidden="true" />
        <div className="register-brand">
          <img src="/branding/barberturn-logo.png" alt="BarberTurn" />
        </div>

        <div className="register-copy-block">
          <p>{t('register.showcase')}</p>
          <div className="register-benefits">
            {benefits.map((benefit, index) => (
              <article key={benefit}>
                <span aria-hidden="true">{index + 1}</span>
                <strong>{benefit}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="register-panel">
        <div className="register-card">
          <header>
            <h1 id="register-title">{t('register.title')}</h1>
            <p>{t('register.subtitle')}</p>
          </header>

          <span id="register-password-requirements" className="visually-hidden">{t('register.passwordLength')}</span>

          <form className="register-form" onSubmit={register} aria-busy={busy} aria-describedby={error ? 'register-error' : undefined}>
            <label>
              <span>{t('register.fullName')}</span>
              <div className="register-input-wrap">
                <span className="register-field-icon" aria-hidden="true">♙</span>
                <input name="name" type="text" autoComplete="name" placeholder={t('register.fullNamePlaceholder')} required />
              </div>
            </label>

            <label>
              <span>{t('common.email')}</span>
              <div className="register-input-wrap">
                <span className="register-field-icon" aria-hidden="true">✉</span>
                <input name="email" type="email" autoComplete="email" inputMode="email" placeholder="ejemplo@barberia.com" required />
              </div>
            </label>

            <label>
              <span>{t('common.password')}</span>
              <div className="register-input-wrap">
                <span className="register-field-icon" aria-hidden="true">♙</span>
                <input name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} aria-describedby="register-password-requirements" placeholder={t('register.passwordHint')} required />
                <button type="button" className="register-password-toggle" aria-label={showPassword ? t('common.hide') : t('common.show')} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>
                  {showPassword ? t('common.hide') : t('common.show')}
                </button>
              </div>
            </label>

            <label>
              <span>{t('common.confirmPassword')}</span>
              <div className="register-input-wrap">
                <span className="register-field-icon" aria-hidden="true">♙</span>
                <input name="confirmPassword" type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" minLength={8} aria-describedby="register-password-requirements" placeholder={t('register.confirmPlaceholder')} required />
                <button type="button" className="register-password-toggle" aria-label={showConfirmation ? t('common.hide') : t('common.show')} aria-pressed={showConfirmation} onClick={() => setShowConfirmation(value => !value)}>
                  {showConfirmation ? t('common.hide') : t('common.show')}
                </button>
              </div>
            </label>

            <button className="register-submit" type="submit" disabled={busy}>{busy ? t('register.submitting') : t('register.submit')}</button>
          </form>

          {error && <p id="register-error" className="register-error" role="alert" aria-live="assertive">{error}</p>}
          <p className="register-login-copy">{t('register.haveAccount')} <a href="#/login">{t('register.signIn')}</a></p>
        </div>
      </section>
    </main>
  )
}
