import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import type { Barber, Service } from '../../../types'
import { showError, showSuccessToast } from '../../../alerts'
import LockedFeature from '../../../shared/components/LockedFeature'
import type { Appointment, Capabilities, Shop } from '../../../portals/admin/commercialTypes'
import {
  createAppointment,
  listAppointmentBarbers,
  listAppointments,
  listAppointmentServices,
  listAvailability,
  rescheduleAppointment,
  runAppointmentAction,
  type AvailabilitySlot,
} from '../api/appointmentsApi'

type Props = { isDemo: boolean; shop: Shop | null; capabilities: Capabilities | null }
type AgendaView = 'today' | 'week'

const activeStatuses = ['Confirmed', 'CheckedIn']

function dateKeyInZone(value: Date | string, timeZone?: string) {
  const date = typeof value === 'string' ? new Date(value) : value
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || undefined,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function mondayOf(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  const day = date.getUTCDay()
  return addDays(dateKey, day === 0 ? -6 : 1 - day)
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    Confirmed: 'Confirmada', CheckedIn: 'En espera', Completed: 'Completada',
    Cancelled: 'Cancelada', NoShow: 'No llegó',
  }
  return labels[status] ?? status
}

function formatDateTime(value: string, timeZone?: string) {
  return new Intl.DateTimeFormat('es-DO', {
    timeZone: timeZone || undefined,
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))
}

function formatTime(value: string, timeZone?: string) {
  return new Intl.DateTimeFormat('es-DO', {
    timeZone: timeZone || undefined, hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))
}

export default function AppointmentsSection({ isDemo, shop, capabilities }: Props) {
  const today = dateKeyInZone(new Date(), shop?.timeZoneId)
  const [view, setView] = useState<AgendaView>('today')
  const [selectedDate, setSelectedDate] = useState(today)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [barberFilter, setBarberFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [bookingQr, setBookingQr] = useState('')
  const [busy, setBusy] = useState(false)
  const [formDate, setFormDate] = useState(today)
  const [formServiceId, setFormServiceId] = useState('')
  const [formBarberId, setFormBarberId] = useState('')
  const [formSlot, setFormSlot] = useState('')
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [editDate, setEditDate] = useState(today)
  const [editBarberId, setEditBarberId] = useState('')
  const [editSlot, setEditSlot] = useState('')
  const [editSlots, setEditSlots] = useState<AvailabilitySlot[]>([])

  const load = useCallback(async () => {
    if (!capabilities?.canUseAppointments) { setAppointments([]); return }
    const from = new Date(Date.now() - 36 * 60 * 60 * 1000)
    const to = new Date(Date.now() + 10 * 86400000)
    const [nextAppointments, nextBarbers, nextServices] = await Promise.all([
      listAppointments(from, to), listAppointmentBarbers(), listAppointmentServices(),
    ])
    setAppointments(nextAppointments)
    setBarbers(nextBarbers.filter(item => item.isActive))
    setServices(nextServices.filter(item => item.isActive))
  }, [capabilities?.canUseAppointments])

  useEffect(() => { void load().catch(() => undefined) }, [load])
  useEffect(() => {
    setSelectedDate(today)
    setFormDate(today)
  }, [today])
  useEffect(() => {
    if (!shop) { setBookingQr(''); return }
    void QRCode.toDataURL(`${location.origin}/#/customer?shop=${encodeURIComponent(shop.slug)}`, { width: 320, margin: 2, color: { dark: '#09111f', light: '#ffffff' } }).then(setBookingQr)
  }, [shop])

  useEffect(() => {
    setFormSlot('')
    if (!shop || !formServiceId || !formBarberId || !formDate) { setSlots([]); return }
    void listAvailability(shop.slug, formServiceId, formDate, formBarberId).then(setSlots).catch(() => setSlots([]))
  }, [shop, formServiceId, formBarberId, formDate])

  useEffect(() => {
    setEditSlot('')
    if (!shop || !editing || !editBarberId || !editDate) { setEditSlots([]); return }
    void listAvailability(shop.slug, editing.serviceId, editDate, editBarberId).then(setEditSlots).catch(() => setEditSlots([]))
  }, [shop, editing, editBarberId, editDate])

  const visibleAppointments = useMemo(() => {
    const weekStart = mondayOf(selectedDate)
    const weekEnd = addDays(weekStart, 7)
    return appointments.filter(item => {
      const dateKey = dateKeyInZone(item.startsAtUtc, shop?.timeZoneId)
      const inRange = view === 'today' ? dateKey === selectedDate : dateKey >= weekStart && dateKey < weekEnd
      const barberMatches = barberFilter === 'all' || item.barberId === barberFilter
      const statusMatches = statusFilter === 'all'
        || (statusFilter === 'active' ? activeStatuses.includes(item.status) : item.status === statusFilter)
      return inRange && barberMatches && statusMatches
    })
  }, [appointments, barberFilter, selectedDate, shop?.timeZoneId, statusFilter, view])

  const groupedAppointments = useMemo(() => {
    const groups = new Map<string, Appointment[]>()
    for (const item of visibleAppointments) {
      const key = dateKeyInZone(item.startsAtUtc, shop?.timeZoneId)
      groups.set(key, [...(groups.get(key) ?? []), item])
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [visibleAppointments, shop?.timeZoneId])

  async function appointmentAction(id: string, action: 'check-in' | 'complete' | 'no-show' | 'cancel') {
    setBusy(true)
    try {
      await runAppointmentAction(id, action)
      await load()
      void showSuccessToast('Cita actualizada')
    } catch (error) {
      await showError('No se pudo actualizar la cita', error instanceof Error ? error.message : 'Error inesperado')
    } finally { setBusy(false) }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!formSlot) return
    const form = event.currentTarget
    const data = new FormData(form)
    setBusy(true)
    try {
      await createAppointment({
        serviceId: formServiceId,
        barberId: formBarberId,
        startsAt: formSlot,
        customerName: String(data.get('customerName') ?? '').trim(),
        customerPhone: String(data.get('customerPhone') ?? '').trim() || undefined,
        customerEmail: String(data.get('customerEmail') ?? '').trim() || undefined,
      })
      form.reset()
      setFormServiceId(''); setFormBarberId(''); setFormSlot(''); setSlots([])
      await load()
      void showSuccessToast('Cita creada')
    } catch (error) {
      await showError('No se pudo crear la cita', error instanceof Error ? error.message : 'Error inesperado')
    } finally { setBusy(false) }
  }

  function beginReschedule(item: Appointment) {
    setEditing(item)
    setEditDate(dateKeyInZone(item.startsAtUtc, shop?.timeZoneId))
    setEditBarberId(item.barberId)
    setEditSlot('')
  }

  async function saveReschedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing || !editSlot) return
    setBusy(true)
    try {
      await rescheduleAppointment(editing.id, { barberId: editBarberId, startsAt: editSlot })
      setEditing(null); setEditSlot(''); setEditSlots([])
      await load()
      void showSuccessToast('Cita reprogramada')
    } catch (error) {
      await showError('No se pudo reprogramar la cita', error instanceof Error ? error.message : 'Error inesperado')
    } finally { setBusy(false) }
  }

  return (
    <section className="panel dashboard-section appointments-workspace" id="appointments-section">
      <div className="panel-heading">
        <div><p className="eyebrow">AGENDA HÍBRIDA</p><h2>Agenda de citas</h2><p className="appointments-lead">Organiza la semana, filtra por barbero y mueve reservas sin salir del panel.</p></div>
        {shop && capabilities?.canUseAppointments && <a className="secondary-link" href={`#/customer?shop=${shop.slug}`}>Portal del cliente</a>}
      </div>

      {!capabilities?.canUseAppointments ? <LockedFeature title="Citas y agenda híbrida" text="Reserva horarios, combina citas con turnos por llegada y gestiona la agenda del equipo." /> : <>
        <div className="appointments-toolbar" aria-label="Controles de agenda">
          <div className="agenda-view-switch" role="group" aria-label="Vista de agenda">
            <button type="button" className={view === 'today' ? 'active' : ''} onClick={() => setView('today')}>Hoy</button>
            <button type="button" className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Semana</button>
          </div>
          <label>Fecha<input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} /></label>
          <label>Barbero<select value={barberFilter} onChange={event => setBarberFilter(event.target.value)}><option value="all">Todos</option>{barbers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Estado<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="active">Activas</option><option value="all">Todos</option><option value="Confirmed">Confirmadas</option><option value="CheckedIn">En espera</option><option value="Completed">Completadas</option><option value="NoShow">No llegó</option><option value="Cancelled">Canceladas</option></select></label>
        </div>

        <div className="agenda-summary"><strong>{visibleAppointments.length}</strong><span>{view === 'today' ? 'citas en el día seleccionado' : 'citas en la semana seleccionada'}</span></div>

        <div className="agenda-days">
          {groupedAppointments.length ? groupedAppointments.map(([dateKey, items]) => <section className="agenda-day" key={dateKey}>
            <h3>{new Intl.DateTimeFormat('es-DO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${dateKey}T12:00:00Z`))}</h3>
            <div className="business-list appointment-list">{items.map(item => <article key={item.id} className={`appointment-card status-${item.status.toLowerCase()}`}>
              <div className="appointment-time"><strong>{formatTime(item.startsAtUtc, shop?.timeZoneId)}</strong><span>{formatTime(item.endsAtUtc, shop?.timeZoneId)}</span></div>
              <div className="appointment-details"><strong>{item.customerName}</strong><span>{item.serviceName} · {item.barberName}</span><small>{item.customerPhone || item.customerEmail || 'Sin contacto registrado'}</small></div>
              <span className="appointment-status">{statusLabel(item.status)}</span>
              {!isDemo && <div className="billing-actions appointment-actions">
                {item.status === 'Confirmed' && <><button disabled={busy} onClick={() => beginReschedule(item)}>Reprogramar</button><button disabled={busy} onClick={() => void appointmentAction(item.id, 'check-in')}>Check-in</button><button disabled={busy} onClick={() => void appointmentAction(item.id, 'no-show')}>No llegó</button><button className="danger" disabled={busy} onClick={() => void appointmentAction(item.id, 'cancel')}>Cancelar</button></>}
                {item.status === 'CheckedIn' && <button disabled={busy} onClick={() => void appointmentAction(item.id, 'complete')}>Completar</button>}
              </div>}
            </article>)}</div>
          </section>) : <div className="agenda-empty"><strong>Agenda despejada</strong><span>No hay citas que coincidan con esta vista y filtros.</span></div>}
        </div>

        {!isDemo && <section className="appointment-admin-grid">
          <article className="appointment-form-card">
            <p className="eyebrow">NUEVA RESERVA</p><h3>Crear cita</h3>
            <form className="business-form appointment-form" onSubmit={create}>
              <input name="customerName" placeholder="Nombre del cliente" required />
              <input name="customerPhone" placeholder="Teléfono" inputMode="tel" />
              <input name="customerEmail" placeholder="Correo" type="email" />
              <select value={formServiceId} onChange={event => setFormServiceId(event.target.value)} required><option value="">Servicio</option>{services.map(item => <option key={item.id} value={item.id}>{item.name} · {item.estimatedDurationMinutes} min</option>)}</select>
              <select value={formBarberId} onChange={event => setFormBarberId(event.target.value)} required><option value="">Barbero</option>{barbers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <input type="date" value={formDate} min={today} onChange={event => setFormDate(event.target.value)} required />
              <select value={formSlot} onChange={event => setFormSlot(event.target.value)} required disabled={!slots.length}><option value="">{slots.length ? 'Horario disponible' : 'Sin horarios disponibles'}</option>{slots.map(slot => <option key={`${slot.barberId}-${slot.startsAtUtc}`} value={slot.startsAtUtc}>{formatTime(slot.startsAtUtc, shop?.timeZoneId)}</option>)}</select>
              <button disabled={busy || !formSlot}>Crear cita</button>
            </form>
          </article>

          {bookingQr && <article className="booking-qr appointment-self-service"><img src={bookingQr} alt="Código QR del portal de clientes" /><div><strong>Autoservicio del cliente</strong><span>Comparte el QR para que tus clientes reserven o tomen turno sin intervención del personal.</span><a href={bookingQr} download={`barberturn-${shop?.slug ?? 'clientes'}-qr.png`}>Descargar QR</a></div></article>}
        </section>}

        {editing && <div className="appointment-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setEditing(null) }}>
          <section className="appointment-modal" role="dialog" aria-modal="true" aria-labelledby="reschedule-title">
            <p className="eyebrow">REPROGRAMAR</p><h3 id="reschedule-title">{editing.customerName}</h3><p>{editing.serviceName} · actualmente {formatDateTime(editing.startsAtUtc, shop?.timeZoneId)}</p>
            <form className="business-form appointment-form" onSubmit={saveReschedule}>
              <select value={editBarberId} onChange={event => setEditBarberId(event.target.value)} required>{barbers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <input type="date" value={editDate} min={today} onChange={event => setEditDate(event.target.value)} required />
              <select value={editSlot} onChange={event => setEditSlot(event.target.value)} required disabled={!editSlots.length}><option value="">{editSlots.length ? 'Nuevo horario' : 'Sin horarios disponibles'}</option>{editSlots.map(slot => <option key={`${slot.barberId}-${slot.startsAtUtc}`} value={slot.startsAtUtc}>{formatTime(slot.startsAtUtc, shop?.timeZoneId)}</option>)}</select>
              <div className="billing-actions"><button type="button" className="secondary-link" onClick={() => setEditing(null)}>Cerrar</button><button disabled={busy || !editSlot}>Guardar cambio</button></div>
            </form>
          </section>
        </div>}
      </>}
    </section>
  )
}
