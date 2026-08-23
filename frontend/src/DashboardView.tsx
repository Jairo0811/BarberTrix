import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import type { Auth, Barber, BarberStatus, Service, Turn } from './types'
import './dashboard.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

async function api<T>(path: string, auth: Auth, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.accessToken}`,
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message ?? `Error ${response.status}`)
  }

  return response.json() as Promise<T>
}

type DashboardViewProps = {
  auth: Auth
  isDemo: boolean
  onLogout: () => void
}

const navItems = [
  { id: 'dashboard-overview', label: 'Dashboard', icon: '⌂' },
  { id: 'queue-section', label: 'Cola en vivo', icon: '≡' },
  { id: 'barbers-section', label: 'Barberos', icon: '♙' },
  { id: 'services-section', label: 'Servicios', icon: '✂' },
]

const futureItems = [
  { label: 'Clientes', icon: '◎' },
  { label: 'BarberTurn TV', icon: '▣' },
  { label: 'Reportes', icon: '▤' },
]

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function formatRole(role: string) {
  if (role === 'Owner') return 'Propietario'
  if (role === 'Administrator') return 'Administrador'
  return role
}

export default function DashboardView({ auth, isDemo, onLogout }: DashboardViewProps) {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [turns, setTurns] = useState<Turn[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const canManageCatalog = auth.role === 'Owner' || auth.role === 'Administrator'

  const loadQueue = useCallback(async () => {
    try {
      const [nextBarbers, nextServices, nextTurns] = await Promise.all([
        api<Barber[]>('/api/queue/barbers', auth),
        api<Service[]>('/api/queue/services', auth),
        api<Turn[]>('/api/queue/turns', auth),
      ])

      setBarbers(nextBarbers)
      setServices(nextServices)
      setTurns(nextTurns)
      setError('')
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'No se pudo cargar la operación de la barbería.')
    }
  }, [auth])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  const overview = useMemo(() => {
    const waiting = turns.filter(turn => turn.status === 'Waiting').length
    const inService = turns.filter(turn => turn.status === 'InService').length
    const completed = turns.filter(turn => turn.status === 'Completed').length
    const availableBarbers = barbers.filter(barber => barber.status === 'Available').length

    return { waiting, inService, completed, availableBarbers }
  }, [barbers, turns])

  async function submitAndReload<T>(path: string, body: unknown, method = 'POST') {
    setBusy(true)
    setError('')

    try {
      await api<T>(path, auth, { method, body: JSON.stringify(body) })
      await loadQueue()
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'No se pudo completar la operación.')
      throw exception
    } finally {
      setBusy(false)
    }
  }

  async function createTurn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    try {
      await submitAndReload<Turn>('/api/queue/turns', {
        serviceId: data.get('serviceId'),
        customerName: data.get('customerName') || null,
        barberId: data.get('barberId') || null,
      })
      form.reset()
    } catch {
      // Error visible en pantalla.
    }
  }

  async function createBarber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    try {
      await submitAndReload<Barber>('/api/queue/barbers', {
        name: data.get('name'),
        chairNumber: Number(data.get('chairNumber')),
      })
      form.reset()
    } catch {
      // Error visible en pantalla.
    }
  }

  async function createService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    try {
      await submitAndReload<Service>('/api/queue/services', {
        name: data.get('name'),
        price: Number(data.get('price')),
        estimatedDurationMinutes: Number(data.get('estimatedDurationMinutes')),
        description: data.get('description') || null,
      })
      form.reset()
    } catch {
      // Error visible en pantalla.
    }
  }

  async function changeBarberStatus(barber: Barber, status: BarberStatus) {
    try {
      await submitAndReload<Barber>(`/api/queue/barbers/${barber.id}/status`, { status }, 'PATCH')
    } catch {
      // Error visible en pantalla.
    }
  }

  async function transition(
    turn: Turn,
    action: 'call' | 'start' | 'complete' | 'cancel' | 'no-show',
    barberId?: string,
  ) {
    setBusy(true)
    setError('')

    try {
      const suffix = action === 'call' ? `/call/${barberId}` : `/${action}`
      await api<Turn>(`/api/queue/turns/${turn.id}${suffix}`, auth, { method: 'POST' })
      await loadQueue()
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'No se pudo actualizar el turno.')
    } finally {
      setBusy(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const today = new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())
  const queuePreview = turns.slice(0, 4)

  return (
    <main className="dashboard-app">
      <aside className="dashboard-sidebar" aria-label="Navegación del panel">
        <div className="dashboard-brand">
          <img src="/branding/barberturn-logo.png" alt="BarberTurn" />
        </div>

        {isDemo && <span className="demo-pill">◎ MODO DEMO</span>}

        <nav className="dashboard-nav">
          {navItems.map((item, index) => (
            <button
              key={item.id}
              className={index === 0 ? 'active' : ''}
              type="button"
              onClick={() => scrollToSection(item.id)}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

          {futureItems.map(item => (
            <button key={item.label} type="button" disabled title="Disponible en una fase posterior">
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-footer">
          <button className="sidebar-logout" type="button" onClick={onLogout}>
            <span>↪ Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-left">
            <button className="dashboard-mobile-menu" type="button" aria-label="Menú">☰</button>
            <div className="dashboard-topbar-copy">
              <strong>BarberTurn Operations</strong>
              <span>Gestión diaria de tu barbería</span>
            </div>
          </div>

          <div className="dashboard-user">
            {isDemo && <span className="demo-pill">DEMO</span>}
            <div className="dashboard-user-copy">
              <strong>{auth.name}</strong>
              <small>{formatRole(auth.role)}</small>
            </div>
            <span className="dashboard-avatar" aria-hidden="true">{auth.name.charAt(0).toUpperCase()}</span>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="dashboard-section" id="dashboard-overview">
            <div className="dashboard-heading">
              <div>
                <h1>Dashboard</h1>
                <p>Resumen general de la operación de hoy.</p>
              </div>
              <span className="dashboard-date">{today}</span>
            </div>

            {isDemo && (
              <div className="demo-banner">
                <div>
                  <strong>Estás explorando BarberTurn en modo demo</strong>
                  <span>Puedes crear turnos, cambiar estados y recorrer el flujo operativo sin usar una cuenta personal.</span>
                </div>
                <span className="demo-pill">ENTORNO DE PRUEBA</span>
              </div>
            )}

            {error && <p className="error banner" role="alert">{error}</p>}

            <div className="dashboard-kpis">
              <article className="dashboard-kpi">
                <span className="kpi-icon">◷</span>
                <div><strong>{overview.waiting}</strong><span>Turnos en espera</span><small>Cola pendiente</small></div>
              </article>
              <article className="dashboard-kpi">
                <span className="kpi-icon">✂</span>
                <div><strong>{overview.inService}</strong><span>En servicio</span><small>Atenciones activas</small></div>
              </article>
              <article className="dashboard-kpi">
                <span className="kpi-icon">♙</span>
                <div><strong>{overview.availableBarbers}</strong><span>Barberos disponibles</span><small>Listos para atender</small></div>
              </article>
              <article className="dashboard-kpi">
                <span className="kpi-icon">▤</span>
                <div><strong>{services.filter(service => service.isActive).length}</strong><span>Servicios activos</span><small>Catálogo disponible</small></div>
              </article>
            </div>

            <div className="dashboard-overview-grid">
              <article className="dashboard-card">
                <div className="dashboard-card-header">
                  <div><h2>Resumen de la cola</h2><p>Turnos más recientes de la operación.</p></div>
                  <button className="secondary" type="button" onClick={() => void loadQueue()}>Actualizar</button>
                </div>

                <div className="queue-summary">
                  {queuePreview.length === 0 && <p className="empty">No hay turnos activos en este momento.</p>}
                  {queuePreview.map(turn => (
                    <div className="queue-summary-item" key={turn.id}>
                      <span className="queue-summary-ticket">{turn.ticketNumber}</span>
                      <div className="queue-summary-copy">
                        <strong>{turn.customerName || 'Cliente sin nombre'}</strong>
                        <span>{turn.serviceName}{turn.barberName ? ` · ${turn.barberName}` : ''}</span>
                      </div>
                      <span className="queue-summary-status">{turn.status}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="dashboard-card">
                <div className="dashboard-card-header">
                  <div><h2>Accesos rápidos</h2><p>Acciones frecuentes.</p></div>
                </div>
                <div className="quick-actions">
                  <button type="button" onClick={() => scrollToSection('queue-section')}><span className="quick-icon">＋</span>Crear nuevo turno</button>
                  <button type="button" onClick={() => scrollToSection('barbers-section')}><span className="quick-icon">♙</span>Gestionar barberos</button>
                  <button type="button" onClick={() => scrollToSection('services-section')}><span className="quick-icon">✂</span>Gestionar servicios</button>
                  <button type="button" onClick={() => void loadQueue()}><span className="quick-icon">↻</span>Actualizar operación</button>
                </div>
              </article>
            </div>
          </section>

          <section className="dashboard-section" id="queue-section">
            <div className="dashboard-section-title">
              <h2>Operación de turnos</h2>
              <p>Crea turnos y gestiona la cola activa.</p>
            </div>

            <section className="operations-grid">
              <article className="panel">
                <div className="panel-heading"><div><p className="eyebrow">NUEVO TURNO</p><h2>Agregar a la fila</h2></div></div>
                <form className="form-stack" onSubmit={createTurn}>
                  <input name="customerName" placeholder="Nombre del cliente (opcional)" />
                  <select name="serviceId" required defaultValue="">
                    <option value="" disabled>Selecciona servicio</option>
                    {services.filter(service => service.isActive).map(service => (
                      <option key={service.id} value={service.id}>{service.name} · RD${service.price}</option>
                    ))}
                  </select>
                  <select name="barberId" defaultValue="">
                    <option value="">Cualquier barbero</option>
                    {barbers.filter(barber => barber.isActive).map(barber => (
                      <option key={barber.id} value={barber.id}>{barber.name} · Silla {barber.chairNumber}</option>
                    ))}
                  </select>
                  <button className="primary" disabled={busy || services.length === 0}>Generar turno</button>
                </form>
              </article>

              <article className="panel">
                <div className="panel-heading"><div><p className="eyebrow">COLA ACTUAL</p><h2>Estado rápido</h2></div></div>
                <div className="queue-summary">
                  <div className="queue-summary-item"><span className="queue-summary-ticket">{overview.waiting}</span><div className="queue-summary-copy"><strong>Esperando</strong><span>Clientes pendientes de llamada</span></div></div>
                  <div className="queue-summary-item"><span className="queue-summary-ticket">{overview.inService}</span><div className="queue-summary-copy"><strong>En servicio</strong><span>Clientes siendo atendidos</span></div></div>
                  <div className="queue-summary-item"><span className="queue-summary-ticket">{overview.completed}</span><div className="queue-summary-copy"><strong>Completados</strong><span>Turnos finalizados en la cola cargada</span></div></div>
                </div>
              </article>
            </section>

            <section className="panel queue-panel dashboard-section" id="queue-list">
              <div className="panel-heading">
                <div><p className="eyebrow">COLA EN VIVO</p><h2>Turnos</h2></div>
                <button className="secondary" type="button" onClick={() => void loadQueue()}>Actualizar</button>
              </div>

              <div className="turn-list">
                {turns.length === 0 && <p className="empty">No hay turnos activos para hoy.</p>}
                {turns.map(turn => (
                  <article className="turn-card" key={turn.id}>
                    <div className="ticket"><small>{turn.status}</small><strong>{turn.ticketNumber}</strong></div>
                    <div className="turn-copy"><strong>{turn.customerName || 'Cliente sin nombre'}</strong><span>{turn.serviceName}</span><small>{turn.barberName ? `${turn.barberName} · Silla ${turn.chairNumber}` : 'Barbero por asignar'}</small></div>
                    <div className="turn-actions">
                      {turn.status === 'Waiting' && <>
                        {barbers.filter(barber => barber.status === 'Available').map(barber => (
                          <button key={barber.id} disabled={busy} onClick={() => void transition(turn, 'call', barber.id)}>Llamar con {barber.name}</button>
                        ))}
                        <button className="danger" disabled={busy} onClick={() => void transition(turn, 'cancel')}>Cancelar</button>
                      </>}
                      {turn.status === 'Called' && <>
                        <button disabled={busy} onClick={() => void transition(turn, 'start')}>Iniciar servicio</button>
                        <button className="danger" disabled={busy} onClick={() => void transition(turn, 'no-show')}>No llegó</button>
                      </>}
                      {turn.status === 'InService' && <button className="success" disabled={busy} onClick={() => void transition(turn, 'complete')}>Completar</button>}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <section className="dashboard-section" id="barbers-section">
            <div className="dashboard-section-title"><h2>Barberos</h2><p>Disponibilidad y estado del equipo.</p></div>
            <article className="panel">
              <div className="barber-grid">
                {barbers.map(barber => (
                  <div className="barber-card" key={barber.id}>
                    <span className={`status-dot ${barber.status.toLowerCase()}`} />
                    <strong>{barber.name}</strong>
                    <span>Silla {barber.chairNumber}</span>
                    <small>{barber.status}</small>
                    <select value={barber.status} disabled={busy || barber.status === 'Busy'} onChange={event => void changeBarberStatus(barber, event.target.value as BarberStatus)}>
                      <option value="Available">Disponible</option>
                      <option value="Break">Descanso</option>
                      <option value="Offline">Fuera de línea</option>
                      {barber.status === 'Busy' && <option value="Busy">Ocupado</option>}
                    </select>
                  </div>
                ))}
              </div>
            </article>

            {canManageCatalog && (
              <article className="panel dashboard-section">
                <p className="eyebrow">CONFIGURACIÓN</p><h2>Nuevo barbero</h2>
                <form className="form-stack" onSubmit={createBarber}>
                  <input name="name" placeholder="Nombre del barbero" required />
                  <input name="chairNumber" type="number" min="1" placeholder="Número de silla" required />
                  <button className="primary" disabled={busy}>Agregar barbero</button>
                </form>
              </article>
            )}
          </section>

          {canManageCatalog && (
            <section className="dashboard-section" id="services-section">
              <div className="dashboard-section-title"><h2>Servicios</h2><p>Administra el catálogo disponible para los turnos.</p></div>
              <section className="management-grid">
                <article className="panel">
                  <p className="eyebrow">CATÁLOGO</p><h2>Nuevo servicio</h2>
                  <form className="form-stack" onSubmit={createService}>
                    <input name="name" placeholder="Nombre del servicio" required />
                    <input name="price" type="number" min="0" step="0.01" placeholder="Precio" required />
                    <input name="estimatedDurationMinutes" type="number" min="1" placeholder="Duración estimada (min)" required />
                    <input name="description" placeholder="Descripción (opcional)" />
                    <button className="primary" disabled={busy}>Agregar servicio</button>
                  </form>
                </article>

                <article className="panel">
                  <p className="eyebrow">SERVICIOS ACTIVOS</p><h2>{services.filter(service => service.isActive).length} disponibles</h2>
                  <div className="queue-summary">
                    {services.filter(service => service.isActive).slice(0, 6).map(service => (
                      <div className="queue-summary-item" key={service.id}>
                        <span className="queue-summary-ticket">✂</span>
                        <div className="queue-summary-copy"><strong>{service.name}</strong><span>RD${service.price} · {service.estimatedDurationMinutes} min</span></div>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            </section>
          )}

          <footer className="dashboard-footer">
            <span>© {currentYear} BarberTurn. Todos los derechos reservados.</span>
            <span>Tu turno. Tu estilo. Tu tiempo.</span>
          </footer>
        </div>
      </section>
    </main>
  )
}
