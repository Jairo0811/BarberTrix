import { lazy, StrictMode, Suspense, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import HomePage from './HomePage'
import LanguageSwitcher from './LanguageSwitcher'
import { I18nProvider, useI18n } from './i18n'
import { isAdminAppPath } from './portals/admin/adminRoutes'
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
  book: 'route.book',
  customer: 'route.customer',
  tv: 'route.tv',
  'accept-invitation': 'route.acceptInvitation',
  'verify-email': 'route.verifyEmail',
  'billing-success': 'route.billingSuccess',
  terms: 'route.terms',
  privacy: 'route.privacy',
}

const publicRouteByPath: Record<string, PublicRoute> = {
  '/': 'home',
  '/login': 'login',
  '/register': 'register',
  '/forgot-password': 'forgot-password',
  '/reset-password': 'reset-password',
  '/demo': 'demo',
  '/book': 'book',
  '/customer': 'customer',
  '/tv': 'tv',
  '/accept-invitation': 'accept-invitation',
  '/verify-email': 'verify-email',
  '/billing-success': 'billing-success',
  '/terms': 'terms',
  '/privacy': 'privacy',
}

const landingSectionIds = new Set(['inicio', 'caracteristicas', 'precios', 'contacto'])
let initialLandingSection: string | null = null

const legacySection = window.location.hash.slice(1)
if (landingSectionIds.has(legacySection)) {
  initialLandingSection = legacySection
  window.history.replaceState(null, '', '#/')
}

function InPageAnchorCompatibility() {
  useEffect(() => {
    if (initialLandingSection) {
      const sectionId = initialLandingSection
      initialLandingSection = null
      window.requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView())
    }

    const handleAnchorClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null
      const href = target?.getAttribute('href')
      if (!href || href.startsWith('#/') || href === '#') return

      const elementId = decodeURIComponent(href.slice(1))
      const destination = document.getElementById(elementId)
      if (!destination) return

      event.preventDefault()
      destination.scrollIntoView()
      if (elementId === 'main-content') destination.focus({ preventScroll: true })
    }

    document.addEventListener('click', handleAnchorClick)
    return () => document.removeEventListener('click', handleAnchorClick)
  }, [])

  return null
}

function RouteEffects() {
  const location = useLocation()
  const { t } = useI18n()
  const isAdminRoute = isAdminAppPath(location.pathname)
  const route = publicRouteByPath[location.pathname] ?? (isAdminRoute ? 'login' : 'home')
  const currentView = t(routeLabelKeys[route])
  const homeTitle = t('app.homeTitle')

  useEffect(() => {
    if (isAdminRoute) return

    document.title = route === 'home' ? homeTitle : `${currentView} | BarberTurn`

    const frame = window.requestAnimationFrame(() => {
      const main = document.querySelector<HTMLElement>('main')
      if (!main) return
      main.id = 'main-content'
      main.tabIndex = -1
      main.focus({ preventScroll: true })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [currentView, homeTitle, isAdminRoute, location.key, route])

  return (
    <>
      <a className="skip-link" href="#main-content">{t('accessibility.skip')}</a>
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {t('accessibility.currentView', { view: currentView })}
      </div>
    </>
  )
}

function AppRoutes() {
  const { t } = useI18n()

  return (
    <>
      <InPageAnchorCompatibility />
      <RouteEffects />
      <LanguageSwitcher />
      <Suspense fallback={<main><p>{t('app.loading')}</p></main>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/billing-section" element={<Navigate to="/app/billing" replace />} />
          <Route path="/login" element={<App />} />
          <Route path="/app/*" element={<App />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/demo" element={<DemoLoginPage />} />
          <Route path="/book" element={<PublicBookingPage />} />
          <Route path="/customer" element={<CustomerPortalPage />} />
          <Route path="/tv" element={<TvPage />} />
          <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/billing-success" element={<BillingSuccessPage />} />
          <Route path="/terms" element={<LegalPage kind="terms" />} />
          <Route path="/privacy" element={<LegalPage kind="privacy" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </I18nProvider>
  </StrictMode>,
)
