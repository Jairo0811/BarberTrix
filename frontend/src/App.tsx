const metrics = [
  { label: 'Turnos en espera', value: '08' },
  { label: 'Barberos activos', value: '04' },
  { label: 'Tiempo promedio', value: '22 min' },
]

function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <div className="brand-mark" aria-label="BarberTurn">
          <span className="brand-b">B</span><span className="brand-t">T</span>
        </div>
        <div className="hero-copy">
          <p className="eyebrow">BARBERSHOP QUEUE SYSTEM</p>
          <h1>Tu turno. Tu estilo. <span>Tu tiempo.</span></h1>
          <p className="description">
            BarberTurn digitaliza la fila de una barbería sin obligarla a cambiar su forma de trabajar.
          </p>
          <div className="actions">
            <button className="primary">Tomar un turno</button>
            <button className="secondary">Administrar barbería</button>
          </div>
        </div>
      </section>

      <section className="status-card" aria-label="Estado de la barbería">
        <div className="status-heading">
          <div>
            <p className="eyebrow">ESTADO EN VIVO</p>
            <h2>BarberTurn Central</h2>
          </div>
          <span className="open-badge">● Abierto</span>
        </div>

        <div className="metrics">
          {metrics.map((metric) => (
            <article key={metric.label} className="metric">
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </article>
          ))}
        </div>

        <div className="queue-preview">
          <div>
            <small>ATENDIENDO</small>
            <strong>A-024</strong>
            <span>Carlos · Corte + barba</span>
          </div>
          <div>
            <small>PRÓXIMO</small>
            <strong>A-025</strong>
            <span>Miguel · Corte</span>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
