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

type PublicRoute = 'home' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'demo'

function getRoute(): PublicRoute {
  if (window.location.hash === '#/login') return 'login'
  if (window.location.hash === '#/register') return 'register'
  if (window.location.hash === '#/forgot-password') return 'forgot-password'
  if (window.location.hash.startsWith('#/reset-password')) return 'reset-password'
  if (window.location.hash === '#/demo') return 'demo'
  return 'home'
}

function Root() {
  const [route, setRoute] = useState<PublicRoute>(getRoute)

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute())
    const onPublicAuthAction = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      if (target.closest('.register-copy')) {
        window.location.hash = '#/register'
        return
      }

      if (target.closest('.forgot-link')) {
        window.location.hash = '#/forgot-password'
        return
      }

      if (target.closest('.demo-button')) {
        window.location.hash = '#/demo'
      }
    }

    window.addEventListener('hashchange', onHashChange)
    document.addEventListener('click', onPublicAuthAction)

    return () => {
      window.removeEventListener('hashchange', onHashChange)
      document.removeEventListener('click', onPublicAuthAction)
    }
  }, [])

  if (route === 'login') return <App />
  if (route === 'register') return <RegisterPage />
  if (route === 'forgot-password') return <ForgotPasswordPage />
  if (route === 'reset-password') return <ResetPasswordPage />
  if (route === 'demo') return <DemoLoginPage />
  return <HomePage />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
