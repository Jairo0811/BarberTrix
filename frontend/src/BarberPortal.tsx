import { useCallback, useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarCheck, faRightFromBracket, faRotate, faScissors, faUserClock } from '@fortawesome/free-solid-svg-icons'
import type { Auth, Barber, BarberStatus, Turn } from './types'
import { api } from './api'
import { showError, showSuccessToast } from './alerts'
import './dashboard.css'
import './role-portals.css'

type Appointment = { id: string; serviceName: string; barberId: string; barberName: string; startsAtUtc: string; customerName: string; status: string }
type Capabilities = { canUseAppointments: boolean; isDemo: boolean }

export default function BarberPortal({ auth, onLogout }: { auth: Auth; onLogout: () => void }) {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [turns, setTurns] = useState<Turn[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const ownBarber = useMemo(() => barbers.find(item => item.id === auth.barberId), [auth.barberId, barbers])
  const assignedTurns = useMemo(() => turns.filter(item => item.barberId === auth.barberId), [auth.barberId, turns])
  const availableTurns = useMemo(() => turns.filter(item => item.status === 'Waiting' && !item.barberId), [turns])
  const activeTurn = assignedTurns.find(item => item.status === 'Called' || item.status === 'InService')

  const load = useCallback(async () => {
    try {
      const [nextBarbers, nextTurns, nextCapabilities] = await Promise.all([
        api<Barber[]>('/api/queue/barbers'),
        api<Turn[]>('/api/queue/turns'),
        api<Capabilities>('/api/capabilities'),
      ])
      setBarbers(nextBarbers)
      setTurns(nextTurns)
      setCapabilities(nextCapabilities)
      if (nextCapabilities.canUseAppointments) {
        const now = new Date()
        const future = new Date(now.getTime() + 14 * 86400000)
        setAppointments(await api<Appointment[]>(`/api/appointments?from=${encodeURIComponent(now.toISOString())}&to=${encodeURIComponent(future.toISOString())}`))
      } else {
        setAppointments([])
      }
      setError('')
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'No se pudo cargar tu jornada.')
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function updateStatus(status: BarberStatus) {
    if (!auth.barberId) return
    setBusy(true)
    try {
      await api(`/api/queue/barbers/${auth.barberId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      await load()
      void showSuccessToast('Estado actualizado')
    } catch (exception) {
      await showError('No se pudo actualizar tu estado', exception instanceof Error ? exception.message : 'Error inesperado')
    } finally { setBusy(false) }
  }

  async function transition(turn: Turn, action: 'call' | 'start' | 'complete' | 'no-show') {
    if (!auth.barberId) return
    setBusy(true)
    try {
      const suffix = action === 'call' ? `/call/${auth.barberId}` : `/${action}`
      await api(`/api/queue/turns/${turn.id}${suffix}`, { method: 'POST' })
      await load()
      void showSuccessToast('Turno actualizado')
    } catch (exception) {
      await showError('No se pudo actualizar el turno', exception instanceof Error ? exception.message : 'Error inesperado')
    } finally { setBusy(false) }
  }

  return <main className="role-portal barber-portal">
    <header className="role-portal-header">
      <a href="#/"><img src="/branding/barberturn-logo.png" alt="BarberTurn" /></a>
      <div className="role-portal-user"><div><strong>{auth.name}</strong><span>Portal del barbero</span></div><button onClick={onLogout}><FontAwesomeIcon icon={faRightFromBracket} /> Cerrar sesión</button></div>
    </header>

    <section className="role-portal-content">
      <div className="role-portal-heading"><div><span>MI JORNADA</span><h1>Tu trabajo de hoy, sin ruido administrativo.</h1><p>Aquí solo aparecen las funciones necesarias para atender clientes y controlar tu disponibilidad.</p></div><button className="portal-secondary" disabled={busy} onClick={() => void load()}><FontAwesomeIcon icon={faRotate} /> Actualizar</button></div>
      {error && <p className="portal-error" role="alert">{error}</p>}

      <section className="portal-kpis">
        <article><FontAwesomeIcon icon={faScissors} /><div><strong>{ownBarber?.status ?? '—'}</strong><span>Mi estado</span></div></article>
        <article><FontAwesomeIcon icon={faUserClock} /><div><strong>{assignedTurns.filter(item => ['Waiting', 'Called', 'InService'].includes(item.status)).length}</strong><span>Clientes asignados</span></div></article>
        <article><FontAwesomeIcon icon={faCalendarCheck} /><div><strong>{appointments.length}</strong><span>Próximas citas</span></div></article>
      </section>

      <section className="portal-grid">
        <article className="portal-card featured">
          <p className="portal-kicker">ATENCIÓN ACTUAL</p>
          {activeTurn ? <><h2>{activeTurn.ticketNumber} · {activeTurn.customerName || 'Cliente'}</h2><p>{activeTurn.serviceName}</p><div className="portal-actions">{activeTurn.status === 'Called' && <><button disabled={busy} onClick={() => void transition(activeTurn, 'start')}>Iniciar servicio</button><button className="danger" disabled={busy} onClick={() => void transition(activeTurn, 'no-show')}>No llegó</button></>}{activeTurn.status === 'InService' && <button disabled={busy} onClick={() => void transition(activeTurn, 'complete')}>Completar servicio</button>}</div></> : <><h2>No tienes un cliente activo.</h2><p>Puedes tomar el próximo turno disponible cuando estés listo.</p></>}
        </article>

        <article className="portal-card">
          <p className="portal-kicker">DISPONIBILIDAD</p><h2>Cambiar mi estado</h2>
          <div className="portal-actions wrap"><button disabled={busy || ownBarber?.status === 'Available'} onClick={() => void updateStatus('Available')}>Disponible</button><button disabled={busy || ownBarber?.status === 'Break'} onClick={() => void updateStatus('Break')}>Descanso</button><button disabled={busy || ownBarber?.status === 'Offline'} onClick={() => void updateStatus('Offline')}>Fuera de línea</button></div>
        </article>
      </section>

      <section className="portal-card">
        <div className="portal-section-title"><div><p className="portal-kicker">FILA</p><h2>Próximos clientes</h2></div></div>
        <div className="portal-list">{assignedTurns.filter(item => item.status === 'Waiting').map(turn => <article key={turn.id}><div><strong>{turn.ticketNumber} · {turn.customerName || 'Cliente'}</strong><span>{turn.serviceName}</span></div><span>{turn.status}</span></article>)}{availableTurns.slice(0, 5).map(turn => <article key={turn.id}><div><strong>{turn.ticketNumber} · {turn.customerName || 'Cliente'}</strong><span>{turn.serviceName} · sin barbero asignado</span></div><button disabled={busy || ownBarber?.status !== 'Available'} onClick={() => void transition(turn, 'call')}>Atender</button></article>)}{assignedTurns.length === 0 && availableTurns.length === 0 && <p>No hay clientes pendientes.</p>}</div>
      </section>

      <section className="portal-card">
        <p className="portal-kicker">AGENDA</p><h2>Mis próximas citas</h2>
        {!capabilities?.canUseAppointments ? <div className="locked-feature-inline"><strong>Disponible con BarberTurn Pro</strong><span>La barbería debe tener Pro o Business activo para habilitar citas.</span></div> : <div className="portal-list">{appointments.map(item => <article key={item.id}><div><strong>{item.customerName}</strong><span>{item.serviceName}</span></div><span>{new Date(item.startsAtUtc).toLocaleString()}</span></article>)}{appointments.length === 0 && <p>No tienes citas próximas.</p>}</div>}
      </section>
    </section>
  </main>
}
