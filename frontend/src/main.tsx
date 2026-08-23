import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import HomePage from './HomePage'
import './styles.css'
import './login.css'

function Root() {
  const isLogin = window.location.hash === '#/login'
  return isLogin ? <App /> : <HomePage />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
