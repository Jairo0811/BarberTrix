import { lazy, StrictMode, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import HomePage from './HomePage'
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

const App = lazy(() => import('./App'))
const RegisterPage = lazy(() => import('./RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./ResetPasswordPage'))
const DemoLoginPage = lazy(() => import('./DemoLoginPage'))
const PublicBookingPage = lazy(() => import('./PublicBookingPage'))
const CustomerPortalPage = lazy(() => import('./CustomerPortalPage'))
const TvPage = lazy(() => import('./TvPage'))
const AcceptInvitationPage = lazy(() => import('./AcceptInvitationPage'))
const VerifyEmailPage = lazy(() => import('./VerifyEmailPage'))
const BillingSuccessPage = lazy(() => import('./BillingSuccessPage'))
const LegalPage = lazy(() => import('./LegalPage'))

type PublicRoute = 'home' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'demo' | 'book' | 'customer' | 'tv' | 'accept-invitation' | 'verify-email' | 'billing-success' | 'terms' | 'privacy'

const routeLabelKeys: Record<PublicRoute, string> = {
  home: 'route.home',
  login: 'route.login',
  register: 'route.register',
  'forgot-password': 'route.forgot',
  'reset-password': 'route.reset',
  demo: 'route.demo',
  book: 'route.register',
  customer: 'route.home',
  tv: 'route.demo',
  'accept-invitation': 'route.register',
  'verify-email': 'route.login',
  'billing-success': 'route.login',
  terms: 'route.register',
  privacy: 'route.register',
}

function getRoute(): PublicRoute {
  if (window.location.hash === '#/login') return 'login'
  if (window.location.hash === '#/register') return 'register'
  if (window.location.hash === '#/forgot-password') return 'forgot-password'
  if (window.location.hash.startsWith('#/reset-password')) return 'reset-password'
  if (window.location.hash === '#/demo') return 'demo'
  if (window.location.hash.startsWith('#/book')) return 'book'
  if (window.location.hash.startsWith('#/customer')) return 'customer'
  if (window.location.hash.startsWith('#/tv')) return 'tv'
  if (window.location.hash.startsWith('#/accept-invitation')) return 'accept-invitation'
  if (window.location.hash.startsWith('#/verify-email')) return 'verify-email'
  if (window.location.hash.startsWith('#/billing-success')) return 'billing-success'
  if (window.location.hash === '#/terms') return 'terms'
  if (window.location.hash === '#/privacy') return 'privacy'
  return 'home'
}

function RouteContent({ route }: { route: PublicRoute }) {
  if (route === 'login') return <App />
  if (route === 'register') return <RegisterPage />
  if (route === 'forgot-password') return <ForgotPasswordPage />
  if (route === 'reset-password') return <ResetPasswordPage />
  if (route === 'demo') return <DemoLoginPage />
  if (route === 'book') return <PublicBookingPage />
  if (route === 'customer') return <CustomerPortalPage />
  if (route === 'tv') return <TvPage />
  if (route === 'accept-invitation') return <AcceptInvitationPage />
  if (route === 'verify-email') return <VerifyEmailPage />
  if (route === 'billing-success') return <BillingSuccessPage />
  if (route === 'terms') return <LegalPage kind="terms" />
  if (route === 'privacy') return <LegalPage kind="privacy" />
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
      : `${route === 'customer' ? 'Portal del cliente' : routeLabel} | BarberTurn`

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
        {t('accessibility.currentView', { view: route === 'customer' ? 'Portal del cliente' : routeLabel })}
      </div>
      <LanguageSwitcher />
      <Suspense fallback={<main><p>Cargando BarberTurn…</p></main>}><RouteContent route={route} /></Suspense>
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
