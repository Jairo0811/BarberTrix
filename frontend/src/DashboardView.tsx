import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBars,
  faBolt,
  faChartColumn,
  faClock,
  faFlask,
  faHouse,
  faListOl,
  faPlus,
  faRightFromBracket,
  faRotate,
  faScissors,
  faShieldHalved,
  faTv,
  faUserTie,
  faUsers,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import type { Auth, Barber, BarberStatus, Service, Turn } from './types'
import { confirmDestructive, showError, showSuccessToast } from './alerts'
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
  { id: 'dashboard-overview', label: 'Dashboard', icon: faHouse },
  { id: 'queue-section', label: 'Cola en vivo', icon: faListOl },
  { id: 'barbers-section', label: 'Barberos', icon: faUserTie },
  { id: 'services-section', label: 'Servicios', icon: faScissors, requiresCatalogAccess: true },
]

const futureItems = [
  { label: 'Clientes', icon: faUsers },
  { label: 'BarberTurn TV', icon: faTv },
  { label: 'Reportes', icon: faChartColumn },
]

function formatRole(role: string) {
  if (role === 'Owner') return 'Propietario'
  if (role === 'Administrator') return 'Administrador'
  return role
}

function getErrorMessage(exception: unknown, fallback: string) {
  return exception instanceof Error ? exception.message : fallback
}

export default function DashboardView({ auth, isDemo, onLogout }: DashboardViewProps) {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [turns, setTurns] = useState<Turn[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('dashboard-overview')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)

  const canManageCatalog = auth.role === 'Owner' || auth.role === 'Administrator'
  const visibleNavItems = useMemo(
    () => navItems.filter(item => !item.requiresCatalogAccess || canManageCatalog),
    [canManageCatalog],
  )

  const loadQueue = useCallback(async () => {
    setLoading(true)
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
      const message = getErrorMessage(exception, 'No se pudo cargar la operación de la barbería.')
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [auth])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  useEffect(() => {
    const sections = visibleNavItems
      .map(item => document.getElementById(item.id))
      .filter((section): section is HTMLElement => section !== null)

    const observer = new IntersectionObserver(
      entries => {
        const visibleSection = entries
          .filter(entry => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0]

        if (visibleSection) setActiveSection(visibleSection.target.id)
      },
      { rootMargin: '-18% 0px -68% 0px', threshold: [0, 0.2, 0.5] },
    )

    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [visibleNavItems])

  useEffect(() => {
    if (!mobileNavOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const closeDrawer = () => {
      setMobileNavOpen(false)
      window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus())
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDrawer()
        return
      }

      if (event.key !== 'Tab' || !sidebarRef.current) return

      const focusableElements = Array.from(
        sidebarRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      )

      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    window.requestAnimationFrame(() => {
      sidebarRef.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus()
    })

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileNavOpen])

  function navigateToSection(id: string) {
    setActiveSection(id)
    setMobileNavOpen(false)
    const section = document.getElementById(id)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    section?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }

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
      const message = getErrorMessage(exception, 'No se pudo completar la operación.')
      setError(message)
      await showError('No se pudo completar la operación', message)
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
      void showSuccessToast('Turno creado correctamente')
    } catch {
      // El error se informa desde submitAndReload.
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
      void showSuccessToast('Barbero agregado correctamente')
    } catch {
      // El error se informa desde submitAndReload.
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
      void showSuccessToast('Servicio agregado correctamente')
    } catch {
      // El error se informa desde submitAndReload.
    }
  }

  async function changeBarberStatus(barber: Barber, status: BarberStatus) {
    try {
      await submitAndReload<Barber>(`/api/queue/barbers/${barber.id}/status`, { status }, 'PATCH')
      void showSuccessToast(`Estado de ${barber.name} actualizado`)
    } catch {
      // El error se informa desde submitAndReload.
    }
  }

  async function transition(
    turn: Turn,
    action: 'call' | 'start' | 'complete' | 'cancel' | 'no-show',
    barberId?: string,
  ) {
    if (action === 'cancel') {
      const confirmed = await confirmDestructive(
        '¿Cancelar este turno?',
        `El turno ${turn.ticketNumber} dejará de aparecer en la cola activa.`,
        'Sí, cancelar',
      )
      if (!confirmed) return
    }

    if (action === 'no-show') {
      const confirmed = await confirmDestructive(
        '¿Marcar como no presentado?',
        `El turno ${turn.ticketNumber} será marcado como No Show.`,
        'Sí, marcar',
      )
      if (!confirmed) return
    }

    setBusy(true)
    setError('')

    try {
      const suffix = action === 'call' ? `/call/${barberId}` : `/${action}`
      await api<Turn>(`/api/queue/turns/${turn.id}${suffix}`, auth, { method: 'POST' })
      await loadQueue()

      const successMessage = {
        call: 'Cliente llamado correctamente',
        start: 'Servicio iniciado',
        complete: 'Turno completado',
        cancel: 'Turno cancelado',
        'no-show': 'Turno marcado como no presentado',
      }[action]

      void showSuccessToast(successMessage)
    } catch (exception) {
      const message = getErrorMessage(exception, 'No se pudo actualizar el turno.')
      setError(message)
      await showError('No se pudo actualizar el turno', message)
    } finally {
      setBusy(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const today = new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())
  const queuePreview = turns.slice(0, 4)
  const activeServices = services.filter(service => service.isActive).length
  const activeBarbers = barbers.filter(barber => barber.isActive).length

  return (
    <main className={`dashboard-app${isDemo ? ' dashboard-demo' : ' dashboard-admin'}`}>
      {mobileNavOpen && (
        <button
          className="dashboard-nav-backdrop"
          type="button"
          aria-label="Cerrar navegación"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside id="dashboard-sidebar" ref={sidebarRef} className={`dashboard-sidebar${mobileNavOpen ? ' mobile-open' : ''}`} aria-label="Navegación del panel">
        <div className="dashboard-brand-row">
          <div className="dashboard-brand">
            <img src="/branding/barberturn-logo.png" alt="BarberTurn" />
          </div>
          <button className="dashboard-sidebar-close" type="button" aria-label="Cerrar menú" onClick={() => setMobileNavOpen(false)}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {isDemo ? (
          <span className="demo-pill"><FontAwesomeIcon icon={faFlask} /> MODO DEMO</span>
        ) : canManageCatalog ? (
          <span className="admin-pill"><FontAwesomeIcon icon={faShieldHalved} /> PANEL ADMIN</span>
        ) : null}

        <nav className="dashboard-nav">
          {visibleNavItems.map(item => (
            <button
              key={item.id}
              className={activeSection === item.id ? 'active' : undefined}
              type="button"
              aria-current={activeSection === item.id ? 'page' : undefined}
              onClick={() => navigateToSection(item.id)}
            >
              <span className="nav-icon" aria-hidden="true"><FontAwesomeIcon icon={item.icon} /></span>
              <span>{item.label}</span>
            </button>
          ))}

          {futureItems.map(item => (
            <button key={item.label} type="button" disabled title="Disponible en una fase posterior">
              <span className="nav-icon" aria-hidden="true"><FontAwesomeIcon icon={item.icon} /></span>
              <span>{item.label}</span>
              <small className="nav-coming-soon">Próximamente</small>
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-footer">
          <div className="sidebar-session-summary">
            <strong>{auth.name}</strong>
            <small>{isDemo ? 'Sesión temporal' : formatRole(auth.role)}</small>
          </div>
          <button className="sidebar-logout" type="button" onClick={onLogout}>
            <FontAwesomeIcon icon={faRightFromBracket} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-left">
            <button
              ref={mobileMenuButtonRef}
              className="dashboard-mobile-menu"
              type="button"
              aria-label="Abrir menú"
              aria-expanded={mobileNavOpen}
              aria-controls="dashboard-sidebar"
              onClick={() => setMobileNavOpen(true)}
            >
              <FontAwesomeIcon icon={faBars} />
            </button>
            <div className="dashboard-topbar-copy">
              <strong>{isDemo ? 'BarberTurn Demo' : 'BarberTurn Admin'}</strong>
              <span>{isDemo ? 'Entorno guiado de demostración' : 'Centro de control operativo'}</span>
            </div>
          </div>

          <div className="dashboard-user">
            {isDemo ? <span className="demo-pill">DEMO</span> : canManageCatalog && <span className="admin-pill compact">ADMIN</span>}
            <div className="dashboard-user-copy">
              <strong>{auth.name}</strong>
              <small>{formatRole(auth.role)}</small>
            </div>
            <span className="dashboard-avatar" aria-hidden="true">{auth.name.charAt(0).toUpperCase()}</span>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="dashboard-section dashboard-overview-section" id="dashboard-overview">
            <div className="dashboard-heading">
              <div>
                <span className="dashboard-heading-kicker">{isDemo ? 'EXPERIENCIA DE PRUEBA' : 'OPERACIÓN DEL DÍA'}</span>
                <h1>{isDemo ? 'Panel de demostración' : 'Panel de administración'}</h1>
                <p>{isDemo ? 'Explora el flujo completo con datos temporales y acciones seguras.' : 'Supervisa la cola, el equipo y el catálogo desde un solo lugar.'}</p>
              </div>
              <span className="dashboard-date">{today}</span>
            </div>

            {isDemo ? (
              <div className="dashboard-context-banner demo-banner">
                <span className="context-banner-icon"><FontAwesomeIcon icon={faFlask} /></span>
                <div>
                  <strong>Estás explorando BarberTurn en modo demo</strong>
                  <span>Puedes crear turnos, cambiar estados y recorrer el flujo operativo. Los datos de esta sesión son temporales.</span>
                </div>
                <span className="demo-pill">ENTORNO DE PRUEBA</span>
              </div>
            ) : canManageCatalog ? (
              <div className="dashboard-context-banner admin-banner">
                <span className="context-banner-icon"><FontAwesomeIcon icon={faShieldHalved} /></span>
                <div>
                  <strong>Centro de administración activo</strong>
                  <span>Tienes permisos para gestionar turnos, barberos y el catálogo de servicios de la barbería.</span>
                </div>
                <span className="admin-pill">{formatRole(auth.role).toUpperCase()}</span>
              </div>
            ) : null}

            {error && <p className="error banner" role="alert">{error}</p>}

            <div className={`dashboard-kpis${loading ? ' is-loading' : ''}`} aria-busy={loading}>
              <article className="dashboard-kpi">
                <span className="kpi-icon"><FontAwesomeIcon icon={faClock} /></span>
                <div><strong>{loading ? '—' : overview.waiting}</strong><span>Turnos en espera</span><small>{loading ? 'Cargando operación…' : 'Cola pendiente'}</small></div>
              </article>
              <article className="dashboard-kpi">
                <span className="kpi-icon"><FontAwesomeIcon icon={faScissors} /></span>
                <div><strong>{loading ? '—' : overview.inService}</strong><span>En servicio</span><small>{loading ? 'Cargando operación…' : 'Atenciones activas'}</small></div>
              </article>
              <article className="dashboard-kpi">
                <span className="kpi-icon"><FontAwesomeIcon icon={faUserTie} /></span>
                <div><strong>{loading ? '—' : overview.availableBarbers}</strong><span>Barberos disponibles</span><small>{loading ? 'Cargando equipo…' : `${activeBarbers} activos en el equipo`}</small></div>
              </article>
              <article className="dashboard-kpi">
                <span className="kpi-icon"><FontAwesomeIcon icon={faListOl} /></span>
                <div><strong>{loading ? '—' : activeServices}</strong><span>Servicios activos</span><small>{loading ? 'Cargando catálogo…' : 'Catálogo disponible'}</small></div>
              </article>
            </div>

            <div className="dashboard-overview-grid">
              <article className="dashboard-card">
                <div className="dashboard-card-header">
                  <div><h2>Resumen de la cola</h2><p>Turnos más recientes de la operación.</p></div>
                  <button className="secondary" type="button" disabled={loading} onClick={() => void loadQueue()}><FontAwesomeIcon icon={faRotate} /> Actualizar</button>
                </div>

                <div className="queue-summary">
                  {queuePreview.length === 0 && !loading && <p className="empty">No hay turnos activos en este momento.</p>}
                  {loading && <p className="empty">Cargando turnos…</p>}
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

              <article className="dashboard-card dashboard-actions-card">
                <div className="dashboard-card-header">
                  <div><h2><FontAwesomeIcon icon={faBolt} /> Accesos rápidos</h2><p>Acciones frecuentes.</p></div>
                </div>
                <div className="quick-actions">
                  <button type="button" onClick={() => navigateToSection('queue-section')}><span className="quick-icon"><FontAwesomeIcon icon={faPlus} /></span>Crear nuevo turno</button>
                  <button type="button" onClick={() => navigateToSection('barbers-section')}><span className="quick-icon"><FontAwesomeIcon icon={faUserTie} /></span>Gestionar barberos</button>
                  {canManageCatalog && <button type="button" onClick={() => navigateToSection('services-section')}><span className="quick-icon"><FontAwesomeIcon icon={faScissors} /></span>Gestionar servicios</button>}
                  <button type="button" disabled={loading} onClick={() => void loadQueue()}><span className="quick-icon"><FontAwesomeIcon icon={faRotate} /></span>Actualizar operación</button>
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
                  <button className="primary" disabled={busy || loading || activeServices === 0}><FontAwesomeIcon icon={faPlus} /> Generar turno</button>
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
                <button className="secondary" type="button" disabled={loading} onClick={() => void loadQueue()}><FontAwesomeIcon icon={faRotate} /> Actualizar</button>
              </div>

              <div className="turn-list">
                {turns.length === 0 && !loading && <p className="empty">No hay turnos activos para hoy.</p>}
                {loading && <p className="empty">Cargando cola…</p>}
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
                  <button className="primary" disabled={busy}><FontAwesomeIcon icon={faPlus} /> Agregar barbero</button>
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
                    <button className="primary" disabled={busy}><FontAwesomeIcon icon={faPlus} /> Agregar servicio</button>
                  </form>
                </article>

                <article className="panel">
                  <p className="eyebrow">SERVICIOS ACTIVOS</p><h2>{activeServices} disponibles</h2>
                  <div className="queue-summary">
                    {services.filter(service => service.isActive).slice(0, 6).map(service => (
                      <div className="queue-summary-item" key={service.id}>
                        <span className="queue-summary-ticket"><FontAwesomeIcon icon={faScissors} /></span>
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
