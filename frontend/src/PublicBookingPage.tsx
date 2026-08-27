import { FormEvent, useEffect, useMemo, useState } from 'react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { API_URL } from './api'
import './public-booking.css'

type Service = { id: string; name: string; price: number; estimatedDurationMinutes: number }
type Barber = { id: string; name: string; chairNumber: number }
type Shop = { name: string; slug: string; timeZoneId: string; services: Service[]; barbers: Barber[] }
type PublicCapabilities = { canUseAppointments: boolean; canUseTv: boolean }
type TurnResult = { turn: { id: string; ticketNumber: string; status: string }; lookupToken: string; position: number; estimatedWaitMinutes: number }
type Slot = { startsAtUtc: string; endsAtUtc: string; barberId: string; barberName: string }
type AppointmentResult = { appointment: { id: string; serviceName: string; barberName: string; startsAtUtc: string; status: string }; lookupToken: string }

function queryValue(name: string) { return new URLSearchParams((location.hash.split('?')[1] ?? '')).get(name) ?? '' }

export default function PublicBookingPage() {
  const slug = useMemo(() => queryValue('shop'), [])
  const [shop, setShop] = useState<Shop | null>(null)
  const [capabilities, setCapabilities] = useState<PublicCapabilities | null>(null)
  const [mode, setMode] = useState<'queue' | 'appointment'>('queue')
  const [turn, setTurn] = useState<TurnResult | null>(null)
  const [appointment, setAppointment] = useState<AppointmentResult | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const turnId = queryValue('turn'); const token = queryValue('token')
    if (!slug || !turnId || !token) return
    void fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/turns/${encodeURIComponent(turnId)}?token=${encodeURIComponent(token)}`)
      .then(async response => { if (!response.ok) throw new Error('El turno guardado ya no está disponible.'); const payload = await response.json(); setMode('queue'); setTurn({ ...payload, lookupToken: token } as TurnResult) })
      .catch(exception => setError(exception instanceof Error ? exception.message : 'No se pudo recuperar el turno.'))
  }, [slug])

  useEffect(() => {
    const appointmentId = queryValue('appointment'); const token = queryValue('token')
    if (!slug || !appointmentId || !token) return
    void fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/appointments/${encodeURIComponent(appointmentId)}?token=${encodeURIComponent(token)}`)
      .then(async response => { if (!response.ok) throw new Error('La cita guardada ya no está disponible.'); setMode('appointment'); setAppointment({ appointment: await response.json(), lookupToken: token } as AppointmentResult) })
      .catch(exception => setError(exception instanceof Error ? exception.message : 'No se pudo recuperar la cita.'))
  }, [slug])

  useEffect(() => {
    if (!slug) return
    void Promise.all([
      fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}`),
      fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/capabilities`),
    ]).then(async ([shopResponse, capabilitiesResponse]) => {
      if (!shopResponse.ok) throw new Error('No encontramos esta barbería.')
      setShop(await shopResponse.json() as Shop)
      if (capabilitiesResponse.ok) setCapabilities(await capabilitiesResponse.json() as PublicCapabilities)
    }).catch(exception => setError(exception instanceof Error ? exception.message : 'No se pudo cargar la barbería.'))
  }, [slug])

  useEffect(() => {
    if (!slug || !turn) return
    const connection = new HubConnectionBuilder().withUrl(`${API_URL}/hubs/queue`).withAutomaticReconnect().configureLogging(LogLevel.Warning).build()
    connection.on('queueChanged', async () => {
      const response = await fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/turns/${turn.turn.id}?token=${encodeURIComponent(turn.lookupToken)}`)
      if (response.ok) setTurn({ ...turn, ...await response.json() })
    })
    void connection.start().then(() => connection.invoke('JoinPublicShop', slug)).catch(() => undefined)
    return () => { void connection.stop() }
  }, [slug, turn?.turn.id])

  async function createTurn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const data = new FormData(event.currentTarget)
    try {
      const response = await fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/turns`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serviceId: data.get('serviceId'), barberId: data.get('barberId') || null, customerName: data.get('customerName') || null, customerPhone: data.get('customerPhone') || null, idempotencyKey: crypto.randomUUID() }) })
      const payload = await response.json(); if (!response.ok) throw new Error(payload.message ?? 'No se pudo crear el turno.')
      const created = payload as TurnResult
      setTurn(created)
      history.replaceState(null, '', `#/book?shop=${encodeURIComponent(slug)}&turn=${created.turn.id}&token=${encodeURIComponent(created.lookupToken)}`)
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo crear el turno.') } finally { setBusy(false) }
  }

  async function findSlots(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const data = new FormData(event.currentTarget)
    try {
      const response = await fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/appointments/availability?serviceId=${data.get('serviceId')}&date=${data.get('date')}&barberId=${data.get('barberId') || ''}`)
      const payload = await response.json(); if (!response.ok) throw new Error(payload.message ?? payload.detail ?? 'No se pudo consultar la agenda.')
      setSlots(payload as Slot[])
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo consultar la agenda.') } finally { setBusy(false) }
  }

  async function book(slot: Slot, form: HTMLFormElement) {
    setBusy(true); setError(''); const data = new FormData(form)
    try {
      const response = await fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/appointments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serviceId: data.get('serviceId'), barberId: slot.barberId, startsAt: slot.startsAtUtc, customerName: data.get('customerName'), customerPhone: data.get('customerPhone') || null, customerEmail: data.get('customerEmail') || null }) })
      const payload = await response.json(); if (!response.ok) throw new Error(payload.message ?? payload.detail ?? 'No se pudo reservar la cita.')
      const created = payload as AppointmentResult
      setAppointment(created); setSlots([])
      history.replaceState(null, '', `#/book?shop=${encodeURIComponent(slug)}&appointment=${created.appointment.id}&token=${encodeURIComponent(created.lookupToken)}`)
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo reservar la cita.') } finally { setBusy(false) }
  }

  async function cancelSaved(kind: 'turn' | 'appointment') {
    const saved = kind === 'turn' ? turn : appointment
    if (!saved) return
    setBusy(true); setError('')
    const id = kind === 'turn' ? turn!.turn.id : appointment!.appointment.id
    try {
      const response = await fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/${kind === 'turn' ? 'turns' : 'appointments'}/${id}?token=${encodeURIComponent(saved.lookupToken)}`, { method: 'DELETE' })
      if (!response.ok) { const payload = await response.json().catch(() => null); throw new Error(payload?.message ?? 'No se pudo cancelar.') }
      history.replaceState(null, '', `#/book?shop=${encodeURIComponent(slug)}`)
      if (kind === 'turn') setTurn(null); else setAppointment(null)
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo cancelar.') }
    finally { setBusy(false) }
  }

  if (!slug) return <main className="public-booking"><section><h1>Falta identificar la barbería</h1><p>Abre el enlace o escanea el código QR proporcionado por la barbería.</p></section></main>
  if (!shop && !error) return <main className="public-booking"><section><p>Cargando barbería…</p></section></main>

  const appointmentsEnabled = capabilities?.canUseAppointments === true

  return <main className="public-booking">
    <section className="booking-card">
      <a href="#/"><img src="/branding/barberturn-logo.png" alt="BarberTurn" /></a>
      <p className="booking-kicker">{shop?.name}</p><h1>Tu tiempo también importa</h1>
      <div className="booking-tabs"><button className={mode === 'queue' ? 'active' : ''} onClick={() => setMode('queue')}>Tomar turno ahora</button>{appointmentsEnabled && <button className={mode === 'appointment' ? 'active' : ''} onClick={() => setMode('appointment')}>Reservar cita</button>}</div>
      {!appointmentsEnabled && <p className="booking-note">Esta barbería ofrece actualmente atención por orden de llegada.</p>}
      {error && <p className="booking-error" role="alert">{error}</p>}

      {mode === 'queue' && !turn && <form className="booking-form" onSubmit={createTurn}><input name="customerName" placeholder="Tu nombre (opcional)" maxLength={120} /><input name="customerPhone" placeholder="Teléfono (opcional)" maxLength={40} /><select name="serviceId" required defaultValue=""><option value="" disabled>Selecciona un servicio</option>{shop?.services.map(item => <option key={item.id} value={item.id}>{item.name} · RD${item.price}</option>)}</select><select name="barberId" defaultValue=""><option value="">Próximo barbero disponible</option>{shop?.barbers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button disabled={busy}>{busy ? 'Generando…' : 'Obtener mi turno'}</button></form>}
      {mode === 'queue' && turn && <div className="ticket-result"><span>Tu turno</span><strong>{turn.turn.ticketNumber}</strong><p>Estado: {turn.turn.status}</p><p>Posición aproximada: {turn.position || 'En atención'}</p><p>Espera estimada: {turn.estimatedWaitMinutes} minutos</p><small>Conserva este enlace para recibir actualizaciones.</small>{['Waiting', 'Called'].includes(turn.turn.status) && <button disabled={busy} onClick={() => void cancelSaved('turn')}>Cancelar turno</button>}</div>}

      {mode === 'appointment' && appointmentsEnabled && !appointment && <form className="booking-form" onSubmit={findSlots}><input name="customerName" placeholder="Tu nombre" required maxLength={120} /><input name="customerPhone" placeholder="Teléfono" maxLength={40} /><input name="customerEmail" type="email" placeholder="Correo" maxLength={180} /><select name="serviceId" required defaultValue=""><option value="" disabled>Selecciona un servicio</option>{shop?.services.map(item => <option key={item.id} value={item.id}>{item.name} · {item.estimatedDurationMinutes} min</option>)}</select><select name="barberId" defaultValue=""><option value="">Cualquier barbero</option>{shop?.barbers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input name="date" type="date" min={new Date().toISOString().slice(0, 10)} required /><button disabled={busy}>Buscar horarios</button>{slots.length > 0 && <div className="slot-grid">{slots.slice(0, 24).map(slot => <button type="button" key={`${slot.barberId}-${slot.startsAtUtc}`} onClick={event => void book(slot, event.currentTarget.form!)}>{new Date(slot.startsAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<small>{slot.barberName}</small></button>)}</div>}</form>}
      {mode === 'appointment' && appointment && <div className="ticket-result appointment"><span>Cita confirmada</span><strong>{new Date(appointment.appointment.startsAtUtc).toLocaleString()}</strong><p>{appointment.appointment.serviceName} con {appointment.appointment.barberName}</p><small>Guarda este enlace para consultar o cancelar la cita.</small>{appointment.appointment.status === 'Confirmed' && <button disabled={busy} onClick={() => void cancelSaved('appointment')}>Cancelar cita</button>}</div>}
    </section>
  </main>
}
