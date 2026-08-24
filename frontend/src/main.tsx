import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import HomePage from './HomePage'
import RegisterPage from './RegisterPage'
import ForgotPasswordPage from './ForgotPasswordPage'
import ResetPasswordPage from './ResetPasswordPage'
import DemoLoginPage from './DemoLoginPage'
import './styles.css'
import './login.css'
import './support.css'
import './smooth-scroll.css'
import './home-polish.css'
import './icon-polish.css'
import './accessibility.css'

type PublicRoute = 'home' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'demo'

const routeLabels: Record<PublicRoute, string> = {
  home: 'Inicio',
  login: 'Iniciar sesión',
  register: 'Crear cuenta',
  'forgot-password': 'Recuperar contraseña',
  'reset-password': 'Restablecer contraseña',
  demo: 'Modo demo',
}

function getRoute(): PublicRoute {
  if (window.location.hash === '#/login') return 'login'
  if (window.location.hash === '#/register') return 'register'
  if (window.location.hash === '#/forgot-password') return 'forgot-password'
  if (window.location.hash.startsWith('#/reset-password')) return 'reset-password'
  if (window.location.hash === '#/demo') return 'demo'
  return 'home'
}

function RouteContent({ route }: { route: PublicRoute }) {
  if (route === 'login') return <App />
  if (route === 'register') return <RegisterPage />
  if (route === 'forgot-password') return <ForgotPasswordPage />
  if (route === 'reset-password') return <ResetPasswordPage />
  if (route === 'demo') return <DemoLoginPage />
  return <HomePage />
}

function Root() {
  const [route, setRoute] = useState<PublicRoute>(getRoute)

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    document.title = route === 'home'
      ? 'BarberTurn | Tu Turno, Tu Estilo, Tu Tiempo'
      : `${routeLabels[route]} | BarberTurn`

    const frame = window.requestAnimationFrame(() => {
      const main = document.querySelector<HTMLElement>('main')
      if (!main) return

      main.id = 'main-content'
      main.tabIndex = -1
      main.focus({ preventScroll: true })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [route])

  return (
    <>
      <a className="skip-link" href="#main-content">Saltar al contenido principal</a>
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        Vista actual: {routeLabels[route]}
      </div>
      <RouteContent route={route} />
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
