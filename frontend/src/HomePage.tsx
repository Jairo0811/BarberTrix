import './home.css'

const features = [
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

          <div className="home-feature-row" id="caracteristicas">
            {features.map(feature => (
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

      <section className="home-section-preview" id="precios">
        <span className="home-section-kicker">BARBERTURN</span>
        <h2>Todo lo que necesitas</h2>
        <p>Herramientas diseñadas específicamente para modernizar la operación de tu barbería sin complicarla.</p>
      </section>

      <footer className="home-footer" id="contacto">© 2026 BarberTurn · Tu turno. Tu estilo. Tu tiempo.</footer>
    </main>
  )
}
