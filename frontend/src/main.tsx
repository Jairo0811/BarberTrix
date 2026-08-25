import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import HomePage from './HomePage'
import RegisterPage from './RegisterPage'
import ForgotPasswordPage from './ForgotPasswordPage'
import ResetPasswordPage from './ResetPasswordPage'
import DemoLoginPage from './DemoLoginPage'
import PublicBookingPage from './PublicBookingPage'
import TvPage from './TvPage'
import AcceptInvitationPage from './AcceptInvitationPage'
import VerifyEmailPage from './VerifyEmailPage'
import BillingSuccessPage from './BillingSuccessPage'
import LanguageSwitcher from './LanguageSwitcher'
import { I18nProvider, useI18n } from './i18n'
import './styles.css'
import './login.css'
import './support.css'
import './smooth-scroll.css'
import './home-polish.css'
import './icon-polish.css'
import './accessibility.css'
import './language-switcher.css'

type PublicRoute = 'home' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'demo' | 'book' | 'tv' | 'accept-invitation' | 'verify-email' | 'billing-success'

const routeLabelKeys: Record<PublicRoute, string> = {
  home: 'route.home',
  login: 'route.login',
  register: 'route.register',
  'forgot-password': 'route.forgot',
  'reset-password': 'route.reset',
  demo: 'route.demo',
  book: 'route.register',
  tv: 'route.demo',
  'accept-invitation': 'route.register',
  'verify-email': 'route.login',
  'billing-success': 'route.login',
}

function getRoute(): PublicRoute {
  if (window.location.hash === '#/login') return 'login'
  if (window.location.hash === '#/register') return 'register'
  if (window.location.hash === '#/forgot-password') return 'forgot-password'
  if (window.location.hash.startsWith('#/reset-password')) return 'reset-password'
  if (window.location.hash === '#/demo') return 'demo'
  if (window.location.hash.startsWith('#/book')) return 'book'
  if (window.location.hash.startsWith('#/tv')) return 'tv'
  if (window.location.hash.startsWith('#/accept-invitation')) return 'accept-invitation'
  if (window.location.hash.startsWith('#/verify-email')) return 'verify-email'
  if (window.location.hash.startsWith('#/billing-success')) return 'billing-success'
  return 'home'
}

function RouteContent({ route }: { route: PublicRoute }) {
  if (route === 'login') return <App />
  if (route === 'register') return <RegisterPage />
  if (route === 'forgot-password') return <ForgotPasswordPage />
  if (route === 'reset-password') return <ResetPasswordPage />
  if (route === 'demo') return <DemoLoginPage />
  if (route === 'book') return <PublicBookingPage />
  if (route === 'tv') return <TvPage />
  if (route === 'accept-invitation') return <AcceptInvitationPage />
  if (route === 'verify-email') return <VerifyEmailPage />
  if (route === 'billing-success') return <BillingSuccessPage />
  return <HomePage />
}

function Root() {
  const [route, setRoute] = useState<PublicRoute>(getRoute)
  const { t } = useI18n()

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const routeLabel = t(routeLabelKeys[route])
    document.title = route === 'home'
      ? 'BarberTurn | Tu Turno, Tu Estilo, Tu Tiempo'
      : `${routeLabel} | BarberTurn`

    const frame = window.requestAnimationFrame(() => {
      const main = document.querySelector<HTMLElement>('main')
      if (!main) return

      main.id = 'main-content'
      main.tabIndex = -1
      main.focus({ preventScroll: true })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [route, t])

  const routeLabel = t(routeLabelKeys[route])

  return (
    <>
      <a className="skip-link" href="#main-content">{t('accessibility.skip')}</a>
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {t('accessibility.currentView', { view: routeLabel })}
      </div>
      <LanguageSwitcher />
      <RouteContent route={route} />
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <Root />
    </I18nProvider>
  </StrictMode>,
)
