import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBars,
  faBolt,
  faCheck,
  faCloud,
  faEnvelope,
  faListOl,
  faMobileScreenButton,
  faScissors,
  faShieldHalved,
  faTriangleExclamation,
  faTv,
  faUserTie,
  faUsers,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import './home.css'
import './home-footer-polish.css'
import { buildSupportEmailHref, buildWhatsAppHref, supportConfig } from './support'
import { useI18n } from './i18n'
import { getProductHomeAuxCopy } from './i18n/eastAsiaHomeAuxCopy'
import { billingHash, loginHash, normalizePaidPlan, registerHash, rememberPendingPaidPlan } from './billingSelection'
import { clearAuth, publicApi, readAuth } from './api'
import { showError } from './alerts'

function authenticatedDestination(role?: string, sessionScope?: string) {
  return role === 'Client' || sessionScope === 'Client' ? '#/' : '#/app/overview'
}

function navigateToLogin() {
  rememberPendingPaidPlan(null)
  const auth = readAuth()
  window.location.hash = auth ? authenticatedDestination(auth.role, auth.sessionScope) : loginHash()
}

async function logoutFromHome() {
  try {
    await publicApi<void>('/api/auth/logout', { method: 'POST' })
  } catch {
    // Local/session cleanup still needs to happen if the API is temporarily unavailable.
  }

  clearAuth()
  rememberPendingPaidPlan(null)
  window.location.hash = loginHash()
}

function navigateToRegister(planName?: string) {
  const paidPlan = normalizePaidPlan(planName)
  const auth = readAuth()

  if (!paidPlan) {
    rememberPendingPaidPlan(null)
    window.location.hash = auth ? authenticatedDestination(auth.role, auth.sessionScope) : registerHash()
    return
  }

  if (!auth) {
    rememberPendingPaidPlan(paidPlan)
    window.location.hash = registerHash(paidPlan)
    return
  }

  if (auth.role === 'Owner' && auth.isEmailVerified) {
    rememberPendingPaidPlan(paidPlan)
    window.location.hash = billingHash(paidPlan)
    return
  }

  rememberPendingPaidPlan(null)
  void showError(
    'El propietario administra la suscripción',
    `Tu sesión actual es ${auth.role}. Para contratar ${paidPlan}, inicia sesión con la cuenta Owner de la barbería.`,
  )
}

export default function HomePage() {
  const { locale, t } = useI18n()
  const homeAux = getProductHomeAuxCopy(locale)
  const currentYear = new Date().getFullYear()
  const whatsappHref = buildWhatsAppHref()
  const auth = readAuth()
  const authenticatedActionLabel = auth?.role === 'Client' || auth?.sessionScope === 'Client' ? t('home.nav.home') : 'Ir al panel'
  const [activeSection, setActiveSection] = useState('inicio')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigationItems = [
    { id: 'inicio', label: t('home.nav.home') },
    { id: 'caracteristicas', label: t('home.nav.features') },
    { id: 'precios', label: t('home.nav.pricing') },
    { id: 'contacto', label: t('home.nav.contact') },
  ]
  const heroFeatures = [
    { icon: faBolt, title: t('home.hero.easy.title'), text: t('home.hero.easy.text') },
    { icon: faCloud, title: t('home.hero.cloud.title'), text: t('home.hero.cloud.text') },
    { icon: faShieldHalved, title: t('home.hero.safe.title'), text: t('home.hero.safe.text') },
  ]
  const capabilityHighlights = [
    { icon: faListOl, value: t('home.cap.queue.value'), label: t('home.cap.queue.label') },
    { icon: faUserTie, value: t('home.cap.multi.value'), label: t('home.cap.multi.label') },
    { icon: faBolt, value: t('home.cap.agile.value'), label: t('home.cap.agile.label') },
    { icon: faTv, value: t('home.cap.tv.value'), label: t('home.cap.tv.label') },
  ]
  const productFeatures = [
    { icon: faListOl, title: t('home.feature.queue.title'), text: t('home.feature.queue.text') },
    { icon: faUserTie, title: t('home.feature.barbers.title'), text: t('home.feature.barbers.text') },
    { icon: faScissors, title: t('home.feature.services.title'), text: t('home.feature.services.text') },
    { icon: faBolt, title: t('home.feature.realtime.title'), text: t('home.feature.realtime.text') },
    { icon: faTv, title: t('home.feature.tv.title'), text: t('home.feature.tv.text') },
    { icon: faMobileScreenButton, title: t('home.feature.grow.title'), text: t('home.feature.grow.text') },
  ]
  const plans = homeAux.plans

  useEffect(() => {
    const sections = navigationItems
      .map(item => document.getElementById(item.id))
      .filter((section): section is HTMLElement => section !== null)

    const observer = new IntersectionObserver(
      entries => {
        const visibleSection = entries
          .filter(entry => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0]
        if (visibleSection) setActiveSection(visibleSection.target.id)
      },
      { rootMargin: '-25% 0px -60% 0px', threshold: [0, 0.25, 0.5, 0.75] },
    )

    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [mobileMenuOpen])

  function selectSection(id: string) {
    setActiveSection(id)
    setMobileMenuOpen(false)
  }

  return (
    <main className="home-page">
      <header className="home-nav">
        <a className="home-brand" href="#inicio" aria-label={`BarberTrix ${t('home.nav.home')}`} onClick={() => selectSection('inicio')}>
          <img src="/branding/barbertrix-logo.png" alt="BarberTrix" />
        </a>

        <nav className={`home-links${mobileMenuOpen ? ' mobile-open' : ''}`} aria-label={t('home.nav.home')}>
          {navigationItems.map(item => (
            <a key={item.id} className={activeSection === item.id ? 'active' : undefined} href={`#${item.id}`} aria-current={activeSection === item.id ? 'page' : undefined} onClick={() => selectSection(item.id)}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="home-nav-actions">
          {auth ? (
            auth.role === 'Client' || auth.sessionScope === 'Client' ? (
              <button className="home-login-button" type="button" onClick={() => void logoutFromHome()}>{t('logout')}</button>
            ) : (
              <button className="home-primary-button" type="button" onClick={navigateToLogin}>{authenticatedActionLabel}</button>
            )
          ) : (
            <>
              <button className="home-login-button" type="button" onClick={navigateToLogin}>{t('common.login')}</button>
              <button className="home-primary-button" type="button" onClick={() => navigateToRegister()}>{t('home.startFree')}</button>
            </>
          )}
          <button className="home-mobile-menu" type="button" aria-label={mobileMenuOpen ? t('closeMenu') : t('openMenu')} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(open => !open)}>
            <FontAwesomeIcon icon={mobileMenuOpen ? faXmark : faBars} />
          </button>
        </div>
      </header>

      <section className="home-hero" id="inicio">
        <div className="home-hero-copy">
          <span className="home-badge">{t('home.badge')}</span>
          <h1>{t('home.hero.title1')}<br /><span>{t('home.hero.title2')}</span></h1>
          <p>{t('home.hero.text')}</p>

          <div className="home-hero-actions">
            <button className="home-primary-button large" type="button" onClick={auth ? navigateToLogin : () => navigateToRegister()}>{auth ? authenticatedActionLabel : t('home.startFree')} <span>→</span></button>
            <a className="home-secondary-button" href="#caracteristicas" onClick={() => selectSection('caracteristicas')}>{t('home.viewFeatures')}</a>
          </div>

          <div className="home-feature-row">
            {heroFeatures.map(feature => (
              <article key={feature.title}>
                <span className="home-feature-icon" aria-hidden="true"><FontAwesomeIcon icon={feature.icon} /></span>
                <div><strong>{feature.title}</strong><small>{feature.text}</small></div>
              </article>
            ))}
          </div>
        </div>

        <div className="home-hero-visual" aria-hidden="true">
          <div className="home-hero-glow" />
          <img src="/branding/barbertrix-home-chair.png" alt="" />
        </div>
      </section>

      <section className="home-stats" aria-label="BarberTrix">
        {capabilityHighlights.map(item => (
          <article key={item.value}>
            <span className="home-stat-icon" aria-hidden="true"><FontAwesomeIcon icon={item.icon} /></span>
            <div><strong>{item.value}</strong><small>{item.label}</small></div>
          </article>
        ))}
      </section>

      <section className="home-content-section" id="caracteristicas">
        <div className="home-section-heading">
          <span className="home-section-kicker">{t('home.features.kicker')}</span>
          <h2>{t('home.features.title')}</h2>
          <p>{t('home.features.text')}</p>
        </div>
        <div className="home-feature-grid">
          {productFeatures.map(feature => (
            <article key={feature.title} className="home-feature-card">
              <span className="home-card-icon" aria-hidden="true"><FontAwesomeIcon icon={feature.icon} /></span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-content-section pricing-section" id="precios">
        <div className="home-section-heading">
          <span className="home-section-kicker">{t('home.pricing.kicker')}</span>
          <h2>{t('home.pricing.title')}</h2>
          <p>{t('home.pricing.text')}</p>
        </div>
        <div className="pricing-grid">
          {plans.map(plan => {
            const paidPlan = normalizePaidPlan(plan.name)
            return (
              <article key={plan.name} className={`pricing-card${plan.featured ? ' featured' : ''}`}>
                {plan.featured && <span className="pricing-badge">{t('home.pricing.popular')}</span>}
                <h3>{plan.name}</h3>
                <p className="pricing-description">{plan.description}</p>
                <div className="pricing-price"><strong>{plan.price}</strong><span>{t('home.pricing.month')}</span></div>
                <ul>{plan.features.map(feature => <li key={feature}><FontAwesomeIcon icon={faCheck} /> {feature}</li>)}</ul>
                <button className={plan.featured ? 'home-primary-button pricing-button' : 'home-login-button pricing-button'} type="button" onClick={() => navigateToRegister(plan.name)}>
                  {paidPlan ? `${paidPlan} · ${plan.price}` : auth ? authenticatedActionLabel : t('home.startFree')}
                </button>
              </article>
            )
          })}
        </div>
        <p className="pricing-note">{t('home.pricing.note')}</p>
      </section>

      <section className="contact-section" id="contacto">
        <div className="contact-copy">
          <span className="home-section-kicker">{t('home.contact.kicker')}</span>
          <h2>{t('home.contact.title')}</h2>
          <p>{t('home.contact.text')}</p>
          <div className="contact-points">
            <span><FontAwesomeIcon icon={faCheck} /> {t('home.contact.simple')}</span>
            <span><FontAwesomeIcon icon={faCheck} /> {t('home.contact.real')}</span>
            <span><FontAwesomeIcon icon={faCheck} /> {t('home.contact.grow')}</span>
          </div>
        </div>
        <div className="contact-card">
          <h3>{t('home.contact.cardTitle')}</h3>
          <p>{t('home.contact.cardText')}</p>
          <button className="home-primary-button contact-button" type="button" onClick={auth ? navigateToLogin : () => navigateToRegister()}>{auth ? authenticatedActionLabel : t('home.startFree')} <span>→</span></button>
          <small>{t('home.contact.cardNote')}</small>
        </div>
      </section>

      <section className="support-section" aria-labelledby="support-title">
        <div className="support-copy">
          <span className="home-section-kicker">{t('home.support.kicker')}</span>
          <h2 id="support-title">{t('home.support.title')}</h2>
          <p>{t('home.support.text')}</p>
        </div>
        <div className="support-options">
          <a className="support-option" href={buildSupportEmailHref()}>
            <span className="support-option-icon" aria-hidden="true"><FontAwesomeIcon icon={faEnvelope} /></span>
            <div><strong>{t('home.support.email')}</strong><small>{supportConfig.email}</small></div>
          </a>
          <a className="support-option" href={buildSupportEmailHref(homeAux.supportSubject)}>
            <span className="support-option-icon" aria-hidden="true"><FontAwesomeIcon icon={faTriangleExclamation} /></span>
            <div><strong>{t('home.support.report')}</strong><small>{t('home.support.reportText')}</small></div>
          </a>
          {whatsappHref && (
            <a className="support-option" href={whatsappHref} target="_blank" rel="noreferrer">
              <span className="support-option-icon" aria-hidden="true"><FontAwesomeIcon icon={faUsers} /></span>
              <div><strong>WhatsApp</strong><small>{t('home.support.whatsapp')}</small></div>
            </a>
          )}
        </div>
      </section>

      <footer className="home-footer home-footer-pro">
        <div className="home-footer-inner">
          <div className="home-footer-brand-block">
            <img className="home-footer-logo" src="/branding/barbertrix-logo.png" alt="BarberTrix" />
            <p>{homeAux.slogan}</p>
            <span className="home-footer-platform-copy">BarberTrix Mobile</span>
            <div className="store-badges" aria-label="BarberTrix Mobile">
              <span className="store-badge" aria-label="Disponible en App Store">
                <span className="store-badge-icon" aria-hidden="true"></span>
                <span><small>Disponible en</small><strong>App Store</strong></span>
              </span>
              <span className="store-badge" aria-label="Disponible en Google Play">
                <span className="store-badge-icon play" aria-hidden="true">▶</span>
                <span><small>Disponible en</small><strong>Google Play</strong></span>
              </span>
            </div>
          </div>

          <div className="home-footer-links-block">
            <strong>BarberTrix</strong>
            <nav className="home-footer-links" aria-label="BarberTrix footer">
              <a className="footer-support-link" href={buildSupportEmailHref()}>{t('common.support')}</a>
              <a className="footer-support-link" href="#/terms">{homeAux.terms}</a>
              <a className="footer-support-link" href="#/privacy">{homeAux.privacy}</a>
            </nav>
          </div>
        </div>

        <div className="home-footer-bottom">
          <span>© {currentYear} BarberTrix. {t('home.footer.rights')}</span>
          <span>Web · Mobile · TV</span>
        </div>
      </footer>
    </main>
  )
}
