import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import HomePage from './HomePage'
import RegisterPage from './RegisterPage'
import './styles.css'
import './login.css'

type PublicRoute = 'home' | 'login' | 'register'

function getRoute(): PublicRoute {
  if (window.location.hash === '#/login') return 'login'
  if (window.location.hash === '#/register') return 'register'
  return 'home'
}

function Root() {
  const [route, setRoute] = useState<PublicRoute>(getRoute)

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute())
    const onRegisterClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target?.closest('.register-copy span')) return
      window.location.hash = '#/register'
    }

    window.addEventListener('hashchange', onHashChange)
    document.addEventListener('click', onRegisterClick)

    return () => {
      window.removeEventListener('hashchange', onHashChange)
      document.removeEventListener('click', onRegisterClick)
    }
  }, [])

  if (route === 'login') return <App />
  if (route === 'register') return <RegisterPage />
  return <HomePage />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
