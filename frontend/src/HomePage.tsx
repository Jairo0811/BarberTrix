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
import { buildSupportEmailHref, buildWhatsAppHref, supportConfig } from './support'

const navigationItems = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'caracteristicas', label: 'Características' },
  { id: 'precios', label: 'Precios' },
  { id: 'contacto', label: 'Contacto' },
]

const heroFeatures = [
  { icon: faBolt, title: 'Fácil de usar', text: 'Interfaz intuitiva para ti y tu equipo' },
  { icon: faCloud, title: 'En la nube', text: 'Accede desde cualquier lugar' },
  { icon: faShieldHalved, title: 'Seguro', text: 'Tus datos siempre protegidos' },
]

const capabilityHighlights = [
  { icon: faListOl, value: 'Fila híbrida', label: 'Turnos por llegada y citas' },
  { icon: faUserTie, value: 'Multi-barbero', label: 'Equipo y disponibilidad' },
  { icon: faBolt, value: 'Operación ágil', label: 'Flujo diario centralizado' },
  { icon: faTv, value: 'Preparado para TV', label: 'Experiencia pública en evolución' },
]

const productFeatures = [
  { icon: faListOl, title: 'Cola inteligente', text: 'Organiza clientes por orden de llegada, citas o un modelo híbrido sin complicar el trabajo del barbero.' },
  { icon: faUserTie, title: 'Gestión de barberos', text: 'Controla disponibilidad, silla, estado y carga de trabajo de cada miembro del equipo.' },
  { icon: faScissors, title: 'Servicios y precios', text: 'Configura cortes, barba, combos, duración estimada y precio desde un catálogo central.' },
  { icon: faBolt, title: 'Turnos en tiempo real', text: 'Visualiza quién espera, quién está siendo atendido y cuál es el siguiente turno.' },
  { icon: faTv, title: 'BarberTurn TV', text: 'Proyecta la cola de forma clara en una pantalla del local y mantén informados a los clientes.' },
  { icon: faMobileScreenButton, title: 'Diseñado para crecer', text: 'Arquitectura preparada para citas, clientes, reportes, pagos y operación multi-barbería.' },
]

const plans = [
  {
    name: 'Starter',
    price: 'US$20.00',
    description: 'Para barberías pequeñas que quieren organizar su fila sin complicaciones.',
    features: ['1 barbería', 'Hasta 3 barberos', 'Gestión de turnos', 'Servicios ilimitados', 'Panel operativo'],
  },
  {
    name: 'Pro',
    price: 'US$40.00',
    description: 'La experiencia completa para barberías con mayor volumen de clientes.',
    features: ['1 barbería', 'Hasta 10 barberos', 'Todo lo de Starter', 'BarberTurn TV', 'Citas y fila híbrida', 'Reportes avanzados'],
    featured: true,
  },
  {
    name: 'Business',
    price: 'US$70.00',
    description: 'Para operaciones con equipos grandes y necesidades de gestión avanzadas.',
    features: ['Hasta 3 sucursales', 'Barberos ilimitados', 'Todo lo de Pro', 'Roles y permisos', 'Analítica avanzada', 'Soporte prioritario'],
  },
]

function navigateToLogin() {
  window.location.hash = '#/login'
}

export default function HomePage() {
  const currentYear = new Date().getFullYear()
  const whatsappHref = buildWhatsAppHref()
  const [activeSection, setActiveSection] = useState('inicio')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
        <a className="home-brand" href="#inicio" aria-label="BarberTurn inicio" onClick={() => selectSection('inicio')}>
          <img src="/branding/barberturn-logo.png" alt="BarberTurn" />
        </a>

        <nav className={`home-links${mobileMenuOpen ? ' mobile-open' : ''}`} aria-label="Navegación principal">
          {navigationItems.map(item => (
            <a
              key={item.id}
              className={activeSection === item.id ? 'active' : undefined}
              href={`#${item.id}`}
              aria-current={activeSection === item.id ? 'page' : undefined}
              onClick={() => selectSection(item.id)}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="home-nav-actions">
          <button className="home-login-button" type="button" onClick={navigateToLogin}>Iniciar sesión</button>
          <button className="home-primary-button" type="button" onClick={navigateToLogin}>Comenzar gratis</button>
          <button
            className="home-mobile-menu"
            type="button"
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(open => !open)}
          >
            <FontAwesomeIcon icon={mobileMenuOpen ? faXmark : faBars} />
          </button>
        </div>
      </header>

      <section className="home-hero" id="inicio">
        <div className="home-hero-copy">
          <span className="home-badge">SISTEMA DE GESTIÓN PARA BARBERÍAS</span>
          <h1>Organiza tu barbería.<br /><span>Atiende mejor.</span></h1>
          <p>BarberTurn te ayuda a gestionar turnos, barberos, servicios y clientes de forma simple y eficiente.</p>

          <div className="home-hero-actions">
            <button className="home-primary-button large" type="button" onClick={navigateToLogin}>Comenzar gratis <span>→</span></button>
            <a className="home-secondary-button" href="#caracteristicas" onClick={() => selectSection('caracteristicas')}>Ver características</a>
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

        <div className="home-hero-visual" aria-label="Silla de barbería BarberTurn">
          <div className="home-hero-glow" />
          <img src="/branding/barberturn-home-chair.png" alt="Silla profesional dentro de una barbería BarberTurn" />
        </div>
      </section>

      <section className="home-stats" aria-label="Capacidades principales de BarberTurn">
        {capabilityHighlights.map(item => (
          <article key={item.value}>
            <span className="home-stat-icon" aria-hidden="true"><FontAwesomeIcon icon={item.icon} /></span>
            <div><strong>{item.value}</strong><small>{item.label}</small></div>
          </article>
        ))}
      </section>

      <section className="home-content-section" id="caracteristicas">
        <div className="home-section-heading">
          <span className="home-section-kicker">TODO LO QUE NECESITAS</span>
          <h2>Una barbería organizada se siente diferente</h2>
          <p>Herramientas diseñadas para modernizar la operación sin obligarte a cambiar la forma en que trabajas.</p>
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
          <span className="home-section-kicker">PRECIOS SIMPLES</span>
          <h2>Un plan para cada etapa de tu barbería</h2>
          <p>Empieza pequeño y cambia de plan cuando tu operación crezca. Sin complicaciones innecesarias.</p>
        </div>

        <div className="pricing-grid">
          {plans.map(plan => (
            <article key={plan.name} className={`pricing-card${plan.featured ? ' featured' : ''}`}>
              {plan.featured && <span className="pricing-badge">MÁS POPULAR</span>}
              <h3>{plan.name}</h3>
              <p className="pricing-description">{plan.description}</p>
              <div className="pricing-price"><strong>{plan.price}</strong><span>/mes</span></div>
              <ul>
                {plan.features.map(feature => <li key={feature}><FontAwesomeIcon icon={faCheck} /> {feature}</li>)}
              </ul>
              <button className={plan.featured ? 'home-primary-button pricing-button' : 'home-login-button pricing-button'} type="button" onClick={navigateToLogin}>Comenzar gratis</button>
            </article>
          ))}
        </div>
        <p className="pricing-note">Precios de lanzamiento sujetos a ajuste antes de la salida comercial.</p>
      </section>

      <section className="contact-section" id="contacto">
        <div className="contact-copy">
          <span className="home-section-kicker">HABLEMOS</span>
          <h2>¿Quieres llevar BarberTurn a tu barbería?</h2>
          <p>Cuéntanos cómo trabaja tu equipo y qué necesitas mejorar. BarberTurn está pensado para adaptarse a tu operación, no al revés.</p>
          <div className="contact-points">
            <span><FontAwesomeIcon icon={faCheck} /> Configuración sencilla</span>
            <span><FontAwesomeIcon icon={faCheck} /> Pensado para barberías reales</span>
            <span><FontAwesomeIcon icon={faCheck} /> Preparado para crecer contigo</span>
          </div>
        </div>

        <div className="contact-card">
          <h3>Empieza con BarberTurn</h3>
          <p>Crea tu cuenta y prepara tu barbería para gestionar sus primeros turnos.</p>
          <button className="home-primary-button contact-button" type="button" onClick={navigateToLogin}>Comenzar gratis <span>→</span></button>
          <small>Sin tarjeta para comenzar la etapa de prueba.</small>
        </div>
      </section>

      <section className="support-section" aria-labelledby="support-title">
        <div className="support-copy">
          <span className="home-section-kicker">SOPORTE</span>
          <h2 id="support-title">¿Algo falló? Estamos para ayudarte.</h2>
          <p>Si no puedes iniciar sesión, encuentras un error o necesitas ayuda con tu cuenta, puedes contactar soporte directamente.</p>
        </div>

        <div className="support-options">
          <a className="support-option" href={buildSupportEmailHref()}>
            <span className="support-option-icon" aria-hidden="true"><FontAwesomeIcon icon={faEnvelope} /></span>
            <div><strong>Correo de soporte</strong><small>{supportConfig.email}</small></div>
          </a>

          <a className="support-option" href={buildSupportEmailHref('[BarberTurn] Reporte de problema')}>
            <span className="support-option-icon" aria-hidden="true"><FontAwesomeIcon icon={faTriangleExclamation} /></span>
            <div><strong>Reportar un problema</strong><small>Abre un correo con una plantilla para describir el error.</small></div>
          </a>

          {whatsappHref && (
            <a className="support-option" href={whatsappHref} target="_blank" rel="noreferrer">
              <span className="support-option-icon" aria-hidden="true"><FontAwesomeIcon icon={faUsers} /></span>
              <div><strong>WhatsApp</strong><small>Contacto directo con soporte.</small></div>
            </a>
          )}
        </div>
      </section>

      <footer className="home-footer">
        <img src="/branding/barberturn-logo.png" alt="BarberTurn" />
        <p>Tu turno. Tu estilo. Tu tiempo.</p>
        <a className="footer-support-link" href={buildSupportEmailHref()}>Contactar soporte</a>
        <span>© {currentYear} BarberTurn. Todos los derechos reservados.</span>
      </footer>
    </main>
  )
}
