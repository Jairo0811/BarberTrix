import './home.css'

const heroFeatures = [
  { icon: '◉', title: 'Fácil de usar', text: 'Interfaz intuitiva para ti y tu equipo' },
  { icon: '☁', title: 'En la nube', text: 'Accede desde cualquier lugar' },
  { icon: '◇', title: 'Seguro', text: 'Tus datos siempre protegidos' },
]

const stats = [
  { icon: '♙', value: '+50', label: 'Barberías confían' },
  { icon: '▣', value: '+1,000', label: 'Turnos gestionados' },
  { icon: '♙', value: '+200', label: 'Clientes satisfechos' },
  { icon: '◷', value: '99.9%', label: 'Tiempo activo' },
]

const productFeatures = [
  { icon: '⌁', title: 'Cola inteligente', text: 'Organiza clientes por orden de llegada, citas o un modelo híbrido sin complicar el trabajo del barbero.' },
  { icon: '✂', title: 'Gestión de barberos', text: 'Controla disponibilidad, silla, estado y carga de trabajo de cada miembro del equipo.' },
  { icon: '▤', title: 'Servicios y precios', text: 'Configura cortes, barba, combos, duración estimada y precio desde un catálogo central.' },
  { icon: '◷', title: 'Turnos en tiempo real', text: 'Visualiza quién espera, quién está siendo atendido y cuál es el siguiente turno.' },
  { icon: '▣', title: 'BarberTurn TV', text: 'Proyecta la cola de forma clara en una pantalla del local y mantén informados a los clientes.' },
  { icon: '⌁', title: 'Diseñado para crecer', text: 'Arquitectura preparada para citas, clientes, reportes, pagos y operación multi-barbería.' },
]

const plans = [
  {
    name: 'Starter',
    price: 'US$19',
    description: 'Para barberías pequeñas que quieren organizar su fila sin complicaciones.',
    features: ['1 barbería', 'Hasta 3 barberos', 'Gestión de turnos', 'Servicios ilimitados', 'Panel operativo'],
  },
  {
    name: 'Pro',
    price: 'US$39',
    description: 'La experiencia completa para barberías con mayor volumen de clientes.',
    features: ['1 barbería', 'Hasta 10 barberos', 'Todo lo de Starter', 'BarberTurn TV', 'Citas y fila híbrida', 'Reportes avanzados'],
    featured: true,
  },
  {
    name: 'Business',
    price: 'US$69',
    description: 'Para operaciones con equipos grandes y necesidades de gestión avanzadas.',
    features: ['Hasta 3 sucursales', 'Barberos ilimitados', 'Todo lo de Pro', 'Roles y permisos', 'Analítica avanzada', 'Soporte prioritario'],
  },
]

function navigateToLogin() {
  window.location.hash = '#/login'
}

export default function HomePage() {
  return (
    <main className="home-page">
      <header className="home-nav">
        <a className="home-brand" href="#inicio" aria-label="BarberTurn inicio">
          <img src="/branding/barberturn-logo.webp" alt="BarberTurn" />
        </a>

        <nav className="home-links" aria-label="Navegación principal">
          <a className="active" href="#inicio">Inicio</a>
          <a href="#caracteristicas">Características</a>
          <a href="#precios">Precios</a>
          <a href="#contacto">Contacto</a>
        </nav>

        <div className="home-nav-actions">
          <button className="home-login-button" type="button" onClick={navigateToLogin}>Iniciar sesión</button>
          <button className="home-primary-button" type="button" onClick={navigateToLogin}>Comenzar gratis</button>
        </div>
      </header>

      <section className="home-hero" id="inicio">
        <div className="home-hero-copy">
          <span className="home-badge">SISTEMA DE GESTIÓN PARA BARBERÍAS</span>
          <h1>Organiza tu barbería.<br /><span>Atiende mejor.</span></h1>
          <p>BarberTurn te ayuda a gestionar turnos, barberos, servicios y clientes de forma simple y eficiente.</p>

          <div className="home-hero-actions">
            <button className="home-primary-button large" type="button" onClick={navigateToLogin}>Comenzar gratis <span>→</span></button>
            <a className="home-secondary-button" href="#caracteristicas">Ver características</a>
          </div>

          <div className="home-feature-row">
            {heroFeatures.map(feature => (
              <article key={feature.title}>
                <span className="home-feature-icon" aria-hidden="true">{feature.icon}</span>
                <div><strong>{feature.title}</strong><small>{feature.text}</small></div>
              </article>
            ))}
          </div>
        </div>

        <div className="home-hero-visual" aria-label="Silla de barbería BarberTurn">
          <div className="home-hero-glow" />
          <img src="/branding/barberturn-home-chair.webp" alt="Silla profesional dentro de una barbería BarberTurn" />
        </div>
      </section>

      <section className="home-stats" aria-label="Indicadores de BarberTurn">
        {stats.map(stat => (
          <article key={stat.label}>
            <span className="home-stat-icon" aria-hidden="true">{stat.icon}</span>
            <div><strong>{stat.value}</strong><small>{stat.label}</small></div>
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
              <span className="home-card-icon" aria-hidden="true">{feature.icon}</span>
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
                {plan.features.map(feature => <li key={feature}>✓ {feature}</li>)}
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
            <span>✓ Configuración sencilla</span>
            <span>✓ Pensado para barberías reales</span>
            <span>✓ Preparado para crecer contigo</span>
          </div>
        </div>

        <div className="contact-card">
          <h3>Empieza con BarberTurn</h3>
          <p>Crea tu cuenta y prepara tu barbería para gestionar sus primeros turnos.</p>
          <button className="home-primary-button contact-button" type="button" onClick={navigateToLogin}>Comenzar gratis <span>→</span></button>
          <small>Sin tarjeta para comenzar la etapa de prueba.</small>
        </div>
      </section>

      <footer className="home-footer">
        <img src="/branding/barberturn-logo.webp" alt="BarberTurn" />
        <p>Tu turno. Tu estilo. Tu tiempo.</p>
        <span>© 2026 BarberTurn. Todos los derechos reservados.</span>
      </footer>
    </main>
  )
}
