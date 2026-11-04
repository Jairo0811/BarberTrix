import { type FormEvent, useMemo, useState } from 'react'
import {
  addAppointment, addTurn, advanceTurn, allowedTurnActions, amount, barberName, barbers, customers,
  initialState, serviceName, services, updateAppointment,
  type DemoRole, type DemoView, type TurnAction,
} from './data'
import './showcase.css'

const roles: { value: DemoRole; label: string; description: string }[] = [
  { value: 'Owner', label: 'Propietario', description: 'Operación y métricas' },
  { value: 'Receptionist', label: 'Recepción', description: 'Turnos y agenda' },
  { value: 'Barber', label: 'Barbero', description: 'Atención diaria' },
  { value: 'Client', label: 'Cliente', description: 'Solicitar atención' },
]

const views: { id: DemoView; name: string; icon: string; allowed: DemoRole[] }[] = [
  { id: 'overview', name: 'Resumen', icon: '▦', allowed: ['Owner', 'Receptionist', 'Barber', 'Client'] },
  { id: 'queue', name: 'Fila digital', icon: '≡', allowed: ['Owner', 'Receptionist', 'Barber', 'Client'] },
  { id: 'appointments', name: 'Citas', icon: '◷', allowed: ['Owner', 'Receptionist', 'Barber', 'Client'] },
  { id: 'services', name: 'Servicios', icon: '✂', allowed: ['Owner', 'Receptionist', 'Barber', 'Client'] },
  { id: 'customers', name: 'CRM', icon: '♙', allowed: ['Owner', 'Receptionist'] },
  { id: 'reports', name: 'Reportes', icon: '▤', allowed: ['Owner'] },
  { id: 'tv', name: 'BarberTrix TV', icon: '▣', allowed: ['Owner', 'Receptionist', 'Barber'] },
]

const turnLabels: Record<string, string> = {
  Waiting: 'En espera', Called: 'Llamado', InService: 'En servicio', Completed: 'Finalizado', Cancelled: 'Cancelado',
}
const appointmentLabels: Record<string, string> = { Confirmed: 'Confirmada', Completed: 'Completada', Cancelled: 'Cancelada' }
const actionLabels: Record<TurnAction, string> = { call: 'Llamar', start: 'Atender', complete: 'Finalizar', cancel: 'Cancelar' }

export default function ShowcasePage() {
  const [role, setRole] = useState<DemoRole>('Owner')
  const [view, setView] = useState<DemoView>('overview')
  const [state, setState] = useState(initialState)
  const [turnName, setTurnName] = useState('')
  const [turnService, setTurnService] = useState<string>(services[0].id)
  const [appointmentName, setAppointmentName] = useState('')
  const [appointmentService, setAppointmentService] = useState<string>(services[0].id)
  const [appointmentBarber, setAppointmentBarber] = useState<string>(barbers[0].id)
  const [appointmentDate, setAppointmentDate] = useState('')
  const [notice, setNotice] = useState('')

  const waiting = state.turns.filter(turn => turn.status === 'Waiting').length
  const active = state.turns.filter(turn => turn.status === 'Called' || turn.status === 'InService').length
  const completed = state.turns.filter(turn => turn.status === 'Completed').length
  const openAppointments = state.appointments.filter(item => item.status === 'Confirmed').length
  const visibleViews = useMemo(() => views.filter(item => item.allowed.includes(role)), [role])

  function selectRole(next: DemoRole) {
    setRole(next)
    setView('overview')
    setNotice(`Vista de ${roles.find(item => item.value === next)?.label.toLowerCase()} activada.`)
  }

  function createTurn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!turnName.trim()) return
    setState(previous => addTurn(previous, turnName, turnService))
    setNotice(`Turno simulado generado para ${turnName.trim()}.`)
    setTurnName('')
  }

  function changeTurn(id: string, action: TurnAction) {
    setState(previous => advanceTurn(previous, id, action))
    setNotice(`Estado del turno actualizado en esta sesión de demostración.`)
  }

  function createAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const previous = state
    const next = addAppointment(previous, appointmentName, appointmentService, appointmentBarber, appointmentDate)
    if (next === previous) {
      setNotice('Comprueba que la fecha sea futura y que el barbero no tenga otra cita a la misma hora.')
      return
    }
    setState(next)
    setNotice('Cita ficticia registrada; no se realizó ninguna reserva real.')
    setAppointmentName('')
  }

  function reset() {
    setState(initialState())
    setTurnName('')
    setAppointmentName('')
    setNotice('Datos ficticios restablecidos.')
  }

  return (
    <main className="bt-showcase" aria-label="BarberTrix Showcase">
      <header className="bt-showcase-header">
        <a href="#/" className="bt-showcase-brand" aria-label="Volver a BarberTrix">
          <img src="/branding/barbertrix-logo.webp" alt="BarberTrix" />
          <span>SHOWCASE <small>DEMO INTERACTIVA</small></span>
        </a>
        <div className="bt-showcase-header-actions">
          <span className="bt-showcase-safe">● Datos 100% ficticios</span>
          <button type="button" className="bt-showcase-ghost" onClick={reset}>Reiniciar demo</button>
          <a href="#/" className="bt-showcase-ghost">Salir</a>
        </div>
      </header>

      <div className="bt-showcase-rail" role="group" aria-label="Explorar roles">
        {roles.map(item => (
          <button type="button" key={item.value} className={role === item.value ? 'active' : ''} aria-pressed={role === item.value} onClick={() => selectRole(item.value)}>
            <strong>{item.label}</strong><small>{item.description}</small>
          </button>
        ))}
      </div>

      <div className="bt-showcase-shell">
        <aside className="bt-showcase-side" aria-label="Módulos de demostración">
          <p className="bt-showcase-side-label">BARBERÍA CENTRAL · DEMO</p>
          <nav aria-label="Secciones del showcase">
            {visibleViews.map(item => (
              <button key={item.id} type="button" aria-current={view === item.id ? 'page' : undefined} className={view === item.id ? 'active' : ''} onClick={() => { setView(item.id); setNotice('') }}>
                <span aria-hidden="true">{item.icon}</span>{item.name}
              </button>
            ))}
          </nav>
          <p className="bt-showcase-side-foot">Sin API, JWT ni SQL Server. Los cambios se conservan solo mientras la página permanezca abierta.</p>
        </aside>

        <div className="bt-showcase-content">
          <div className="bt-showcase-title">
            <div><span className="bt-showcase-eyebrow">BARBERTRIX · ENTORNO DE EXHIBICIÓN</span><h1>{visibleViews.find(item => item.id === view)?.name ?? 'Resumen'}</h1><p>Explora las funcionalidades con información de ejemplo. Ninguna acción afecta una barbería real.</p></div>
            <span className="bt-showcase-chip">SIMULACIÓN</span>
          </div>
          {notice && <p className="bt-showcase-notice" role="status">{notice}</p>}

          {view === 'overview' && <>
            <section className="bt-showcase-kpis" aria-label="Indicadores simulados">
              <div><small>En espera</small><strong>{waiting}</strong><span>Turnos de ejemplo</span></div>
              <div><small>En atención</small><strong>{active}</strong><span>Llamados y en servicio</span></div>
              <div><small>Citas pendientes</small><strong>{openAppointments}</strong><span>Agenda simulada</span></div>
              <div><small>Finalizados</small><strong>{completed}</strong><span>Esta sesión</span></div>
            </section>
            <div className="bt-showcase-two">
              <section className="bt-showcase-panel"><h2>Próximos turnos</h2><p className="bt-showcase-muted">Cola ficticia de Barbería Central</p>
                {state.turns.filter(t => t.status === 'Waiting' || t.status === 'Called').slice(0, 4).map(t => <div className="bt-showcase-line" key={t.id}><b>{t.ticket}</b><span>{t.customer}</span><em>{turnLabels[t.status]}</em></div>)}
                <button className="bt-showcase-action" onClick={() => setView('queue')}>Gestionar fila</button>
              </section>
              <section className="bt-showcase-panel"><h2>Equipo disponible</h2><p className="bt-showcase-muted">Distribución de sillas de ejemplo</p>
                {barbers.map(b => <div className="bt-showcase-line" key={b.id}><b>#{b.chair}</b><span>{b.name}</span><em>{b.available ? 'Disponible' : 'Ocupado'}</em></div>)}
                <button className="bt-showcase-action" onClick={() => setView('appointments')}>Ver agenda</button>
              </section>
            </div>
          </>}

          {view === 'queue' && <>
            <section className="bt-showcase-panel"><h2>Crear turno de demostración</h2><p className="bt-showcase-muted">No envíes datos personales: utiliza nombres inventados.</p>
              <form className="bt-showcase-form" onSubmit={createTurn}>
                <label>Nombre ficticio<input maxLength={80} value={turnName} onChange={event => setTurnName(event.target.value)} placeholder="Ej.: Cliente Demo" required /></label>
                <label>Servicio<select value={turnService} onChange={event => setTurnService(event.target.value)}>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                <button type="submit" className="bt-showcase-action">Generar turno</button>
              </form>
            </section>
            <section className="bt-showcase-panel"><h2>Fila digital</h2><div className="bt-showcase-list">
              {state.turns.map(t => <div className="bt-showcase-ticket" key={t.id}>
                <div><strong>{t.ticket}</strong><div><b>{t.customer}</b><small>{serviceName(t.serviceId)} · {barberName(t.barberId)}</small></div></div>
                <div className="bt-showcase-ticket-actions"><span className={`bt-showcase-status bt-${t.status}`}>{turnLabels[t.status]}</span>
                  {role !== 'Client' && allowedTurnActions[t.status].map(action => <button type="button" key={action} onClick={() => changeTurn(t.id, action)}>{actionLabels[action]}</button>)}
                </div>
              </div>)}
            </div></section>
          </>}

          {view === 'appointments' && <>
            <section className="bt-showcase-panel"><h2>Agendar cita simulada</h2><p className="bt-showcase-muted">No se notificará a ninguna barbería ni cliente.</p>
              <form className="bt-showcase-form" onSubmit={createAppointment}>
                <label>Nombre ficticio<input maxLength={80} value={appointmentName} onChange={event => setAppointmentName(event.target.value)} placeholder="Ej.: Cliente Demo" required /></label>
                <label>Servicio<select value={appointmentService} onChange={event => setAppointmentService(event.target.value)}>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                <label>Profesional<select value={appointmentBarber} onChange={event => setAppointmentBarber(event.target.value)}>{barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
                <label>Fecha y hora<input type="datetime-local" value={appointmentDate} onChange={event => setAppointmentDate(event.target.value)} required /></label>
                <button className="bt-showcase-action" type="submit">Simular reserva</button>
              </form>
            </section>
            <section className="bt-showcase-panel"><h2>Agenda ficticia</h2><div className="bt-showcase-list">
              {state.appointments.map(a => <div className="bt-showcase-ticket" key={a.id}><div><strong className="bt-showcase-date">{a.startsAt.replace('T', ' · ')}</strong><div><b>{a.customer}</b><small>{serviceName(a.serviceId)} · {barberName(a.barberId)}</small></div></div><div className="bt-showcase-ticket-actions"><span className="bt-showcase-status">{appointmentLabels[a.status]}</span>{role !== 'Client' && a.status === 'Confirmed' && <><button type="button" onClick={() => setState(p => updateAppointment(p, a.id, 'Completed'))}>Completar</button><button type="button" onClick={() => setState(p => updateAppointment(p, a.id, 'Cancelled'))}>Cancelar</button></>}</div></div>)}
            </div></section>
          </>}

          {view === 'services' && <section className="bt-showcase-panel"><h2>Catálogo de servicios</h2><p className="bt-showcase-muted">Precios referenciales completamente ficticios.</p><div className="bt-showcase-services">{services.map(s => <article key={s.id}><span>✂</span><h3>{s.name}</h3><p>{s.minutes} minutos</p><strong>{amount(s.price)}</strong></article>)}</div></section>}
          {view === 'customers' && <section className="bt-showcase-panel"><h2>Clientes ficticios</h2><p className="bt-showcase-muted">No se incluyen datos personales de usuarios reales.</p><div className="bt-showcase-list">{customers.map(c => <div className="bt-showcase-line" key={c.id}><b>{c.name}</b><span>{c.preference}</span><em>{c.visits} visitas simuladas</em></div>)}</div></section>}
          {view === 'reports' && <><section className="bt-showcase-kpis"><div><small>Servicios en catálogo</small><strong>{services.length}</strong><span>Ejemplos</span></div><div><small>Barberos</small><strong>{barbers.length}</strong><span>Equipo ficticio</span></div><div><small>Turnos generados</small><strong>{state.turns.length}</strong><span>Esta sesión</span></div><div><small>Reservas generadas</small><strong>{state.appointments.length}</strong><span>Esta sesión</span></div></section><section className="bt-showcase-panel"><h2>Reportes de operación</h2><p>Estos indicadores son ilustrativos. No representan ventas, cobros, clientes reales ni métricas financieras certificadas.</p></section></>}
          {view === 'tv' && <section className="bt-showcase-tv"><span>BARBERTRIX TV · VISTA SIMULADA</span><h2>¡ES TU TURNO!</h2>{state.turns.filter(t => t.status === 'Called' || t.status === 'InService').map(t => <div key={t.id}><strong>{t.ticket}</strong><p>{t.customer} · {barberName(t.barberId)}</p></div>)}{!state.turns.some(t => t.status === 'Called' || t.status === 'InService') && <p>Esperando el siguiente llamado</p>}<small>Sin emparejamiento real, audio ni SignalR</small></section>}
        </div>
      </div>
      <footer className="bt-showcase-footer">BarberTrix Showcase · Datos inventados · Sin operaciones reales ni conexiones con la API</footer>
    </main>
  )
}
