import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

type BarberStatus = 'Available' | 'Busy' | 'Break' | 'Offline'
type TurnStatus = 'Waiting' | 'Called' | 'InService' | 'Completed' | 'Cancelled' | 'NoShow'
type Barber = { id: string; name: string; chairNumber: number; status: BarberStatus; isActive: boolean }
type Service = { id: string; name: string; description?: string | null; price: number; estimatedDurationMinutes: number; isActive: boolean }
type Turn = { id: string; ticketNumber: string; customerName?: string | null; status: TurnStatus; serviceId: string; serviceName: string; barberId?: string | null; barberName?: string | null; chairNumber?: number | null }
type Auth = { accessToken: string; expiresAtUtc: string; userId: string; barberShopId: string; name: string; role: string }

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
const authStorageKey = 'barberturn.auth'

async function api<T>(path: string, auth: Auth, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken}`, ...init?.headers },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message ?? `Error ${response.status}`)
  }
  return response.json() as Promise<T>
}

function App() {
  const [auth, setAuth] = useState<Auth | null>(() => {
    const value = localStorage.getItem(authStorageKey)
    return value ? JSON.parse(value) as Auth : null
  })
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [turns, setTurns] = useState<Turn[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const canManageCatalog = auth?.role === 'Owner' || auth?.role === 'Administrator'

  const loadQueue = useCallback(async () => {
    if (!auth) return
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
      setError(exception instanceof Error ? exception.message : 'No se pudo cargar la cola.')
    }
  }, [auth])

  useEffect(() => { void loadQueue() }, [loadQueue])

  const metrics = useMemo(() => [
    { label: 'Turnos en espera', value: turns.filter(turn => turn.status === 'Waiting').length.toString().padStart(2, '0') },
    { label: 'Barberos disponibles', value: barbers.filter(barber => barber.status === 'Available').length.toString().padStart(2, '0') },
    { label: 'En servicio', value: turns.filter(turn => turn.status === 'InService').length.toString().padStart(2, '0') },
  ], [barbers, turns])

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const data = new FormData(event.currentTarget)
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
      })
      if (!response.ok) throw new Error('Credenciales inválidas.')
      const nextAuth = await response.json() as Auth
      localStorage.setItem(authStorageKey, JSON.stringify(nextAuth))
      setAuth(nextAuth)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'No se pudo iniciar sesión.')
    } finally { setBusy(false) }
  }

  async function submitAndReload<T>(path: string, body: unknown, method = 'POST') {
    if (!auth) return
    setBusy(true)
    setError('')
    try {
      await api<T>(path, auth, { method, body: JSON.stringify(body) })
      await loadQueue()
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'No se pudo completar la operación.')
      throw exception
    } finally { setBusy(false) }
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
    } catch { /* error is shown globally */ }
  }

  async function createBarber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    try {
      await submitAndReload<Barber>('/api/queue/barbers', { name: data.get('name'), chairNumber: Number(data.get('chairNumber')) })
      form.reset()
    } catch { /* error is shown globally */ }
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
    } catch { /* error is shown globally */ }
  }

  async function changeBarberStatus(barber: Barber, status: BarberStatus) {
    try { await submitAndReload<Barber>(`/api/queue/barbers/${barber.id}/status`, { status }, 'PATCH') } catch { /* error is shown globally */ }
  }

  async function transition(turn: Turn, action: 'call' | 'start' | 'complete' | 'cancel' | 'no-show', barberId?: string) {
    if (!auth) return
    setBusy(true)
    setError('')
    try {
      const suffix = action === 'call' ? `/call/${barberId}` : `/${action}`
      await api<Turn>(`/api/queue/turns/${turn.id}${suffix}`, auth, { method: 'POST' })
      await loadQueue()
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'No se pudo actualizar el turno.')
    } finally { setBusy(false) }
  }

  if (!auth) return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark" aria-label="BarberTurn"><span className="brand-b">B</span><span className="brand-t">T</span></div>
        <p className="eyebrow">BARBERSHOP QUEUE SYSTEM</p>
        <h1>Panel <span>operativo.</span></h1>
        <p className="description">Inicia sesión para administrar la cola de tu barbería.</p>
        <form className="form-stack" onSubmit={login}>
          <input name="email" type="email" placeholder="Correo" required />
          <input name="password" type="password" placeholder="Contraseña" required />
          <button className="primary" disabled={busy}>Entrar</button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  )

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div><p className="eyebrow">BARBERTURN OPERATIONS</p><h2>Cola de hoy</h2></div>
        <div className="session"><span>{auth.name} · {auth.role}</span><button className="secondary" onClick={() => { localStorage.removeItem(authStorageKey); setAuth(null) }}>Salir</button></div>
      </header>

      {error && <p className="error banner">{error}</p>}
      <section className="metrics">{metrics.map(metric => <article key={metric.label} className="metric"><strong>{metric.value}</strong><span>{metric.label}</span></article>)}</section>

      <section className="operations-grid">
        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">NUEVO TURNO</p><h2>Agregar a la fila</h2></div></div>
          <form className="form-stack" onSubmit={createTurn}>
            <input name="customerName" placeholder="Nombre del cliente (opcional)" />
            <select name="serviceId" required defaultValue=""><option value="" disabled>Selecciona servicio</option>{services.filter(service => service.isActive).map(service => <option key={service.id} value={service.id}>{service.name} · RD${service.price}</option>)}</select>
            <select name="barberId" defaultValue=""><option value="">Cualquier barbero</option>{barbers.filter(barber => barber.isActive).map(barber => <option key={barber.id} value={barber.id}>{barber.name} · Silla {barber.chairNumber}</option>)}</select>
            <button className="primary" disabled={busy || services.length === 0}>Generar turno</button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">BARBEROS</p><h2>Estado del equipo</h2></div></div>
          <div className="barber-grid">{barbers.map(barber => <div className="barber-card" key={barber.id}><span className={`status-dot ${barber.status.toLowerCase()}`} /><strong>{barber.name}</strong><span>Silla {barber.chairNumber}</span><small>{barber.status}</small><select value={barber.status} disabled={busy || barber.status === 'Busy'} onChange={event => void changeBarberStatus(barber, event.target.value as BarberStatus)}><option value="Available">Disponible</option><option value="Break">Descanso</option><option value="Offline">Fuera de línea</option>{barber.status === 'Busy' && <option value="Busy">Ocupado</option>}</select></div>)}</div>
        </article>
      </section>

      {canManageCatalog && <section className="management-grid">
        <article className="panel"><p className="eyebrow">CONFIGURACIÓN</p><h2>Nuevo barbero</h2><form className="form-stack" onSubmit={createBarber}><input name="name" placeholder="Nombre del barbero" required /><input name="chairNumber" type="number" min="1" placeholder="Número de silla" required /><button className="primary" disabled={busy}>Agregar barbero</button></form></article>
        <article className="panel"><p className="eyebrow">CATÁLOGO</p><h2>Nuevo servicio</h2><form className="form-stack" onSubmit={createService}><input name="name" placeholder="Nombre del servicio" required /><input name="price" type="number" min="0" step="0.01" placeholder="Precio" required /><input name="estimatedDurationMinutes" type="number" min="1" placeholder="Duración estimada (min)" required /><input name="description" placeholder="Descripción (opcional)" /><button className="primary" disabled={busy}>Agregar servicio</button></form></article>
      </section>}

      <section className="panel queue-panel">
        <div className="panel-heading"><div><p className="eyebrow">COLA EN VIVO</p><h2>Turnos</h2></div><button className="secondary" onClick={() => void loadQueue()}>Actualizar</button></div>
        <div className="turn-list">
          {turns.length === 0 && <p className="empty">No hay turnos activos para hoy.</p>}
          {turns.map(turn => <article className="turn-card" key={turn.id}>
            <div className="ticket"><small>{turn.status}</small><strong>{turn.ticketNumber}</strong></div>
            <div className="turn-copy"><strong>{turn.customerName || 'Cliente sin nombre'}</strong><span>{turn.serviceName}</span><small>{turn.barberName ? `${turn.barberName} · Silla ${turn.chairNumber}` : 'Barbero por asignar'}</small></div>
            <div className="turn-actions">
              {turn.status === 'Waiting' && <>{barbers.filter(barber => barber.status === 'Available').map(barber => <button key={barber.id} disabled={busy} onClick={() => void transition(turn, 'call', barber.id)}>Llamar con {barber.name}</button>)}<button className="danger" disabled={busy} onClick={() => void transition(turn, 'cancel')}>Cancelar</button></>}
              {turn.status === 'Called' && <><button disabled={busy} onClick={() => void transition(turn, 'start')}>Iniciar servicio</button><button className="danger" disabled={busy} onClick={() => void transition(turn, 'no-show')}>No llegó</button></>}
              {turn.status === 'InService' && <button className="success" disabled={busy} onClick={() => void transition(turn, 'complete')}>Completar</button>}
            </div>
          </article>)}
        </div>
      </section>
    </main>
  )
}

export default App
