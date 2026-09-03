import { FormEvent, useEffect, useMemo, useState } from 'react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { API_URL } from './api'
import { useI18n } from './i18n'
import { turnStatusLabel } from './i18n/domainLabels'
import './public-booking.css'

type Service = { id: string; name: string; price: number; estimatedDurationMinutes: number }
type Barber = { id: string; name: string; chairNumber: number }
type Shop = { name: string; slug: string; timeZoneId: string; services: Service[]; barbers: Barber[] }
type PublicCapabilities = { canUseAppointments: boolean; canUseTv: boolean }
type TurnResult = { turn: { id: string; ticketNumber: string; status: string }; lookupToken: string; position: number; estimatedWaitMinutes: number }
type Slot = { startsAtUtc: string; endsAtUtc: string; barberId: string; barberName: string }
type AppointmentResult = { appointment: { id: string; serviceName: string; barberName: string; startsAtUtc: string; status: string }; lookupToken: string }

function queryValue(name: string) {
  return new URLSearchParams((location.hash.split('?')[1] ?? '')).get(name) ?? ''
}

export default function PublicBookingPage() {
  const { locale, t } = useI18n()
  const slug = useMemo(() => queryValue('shop'), [])
  const [shop, setShop] = useState<Shop | null>(null)
  const [capabilities, setCapabilities] = useState<PublicCapabilities | null>(null)
  const [mode, setMode] = useState<'queue' | 'appointment'>('queue')
  const [turn, setTurn] = useState<TurnResult | null>(null)
  const [appointment, setAppointment] = useState<AppointmentResult | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [turnIdempotencyKey, setTurnIdempotencyKey] = useState(() => crypto.randomUUID())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const turnId = queryValue('turn')
    const token = queryValue('token')
    if (!slug || !turnId || !token) return

    void fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/turns/${encodeURIComponent(turnId)}?token=${encodeURIComponent(token)}`)
      .then(async response => {
        if (!response.ok) throw new Error(t('booking.savedTurnUnavailable'))
        const payload = await response.json()
        setMode('queue')
        setTurn({ ...payload, lookupToken: token } as TurnResult)
      })
      .catch(() => setError(t('booking.recoverTurnError')))
  }, [slug, t])

  useEffect(() => {
    const appointmentId = queryValue('appointment')
    const token = queryValue('token')
    if (!slug || !appointmentId || !token) return

    void fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/appointments/${encodeURIComponent(appointmentId)}?token=${encodeURIComponent(token)}`)
      .then(async response => {
        if (!response.ok) throw new Error(t('booking.savedAppointmentUnavailable'))
        setMode('appointment')
        setAppointment({ appointment: await response.json(), lookupToken: token } as AppointmentResult)
      })
      .catch(() => setError(t('booking.recoverAppointmentError')))
  }, [slug, t])

  useEffect(() => {
    if (!slug) return
    void Promise.all([
      fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}`),
      fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/capabilities`),
    ]).then(async ([shopResponse, capabilitiesResponse]) => {
      if (!shopResponse.ok) throw new Error(t('booking.shopNotFound'))
      setShop(await shopResponse.json() as Shop)
      if (capabilitiesResponse.ok) setCapabilities(await capabilitiesResponse.json() as PublicCapabilities)
    }).catch(() => setError(t('booking.loadShopError')))
  }, [slug, t])

  useEffect(() => {
    if (!slug || !turn) return
    const connection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/queue`)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    connection.on('queueChanged', async () => {
      const response = await fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/turns/${turn.turn.id}?token=${encodeURIComponent(turn.lookupToken)}`)
      if (response.ok) setTurn({ ...turn, ...await response.json() })
    })

    void connection.start().then(() => connection.invoke('JoinPublicShop', slug)).catch(() => undefined)
    return () => { void connection.stop() }
  }, [slug, turn?.turn.id])

  async function createTurn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const data = new FormData(event.currentTarget)

    try {
      const response = await fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/turns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: data.get('serviceId'),
          barberId: data.get('barberId') || null,
          customerName: data.get('customerName') || null,
          customerPhone: data.get('customerPhone') || null,
          idempotencyKey: turnIdempotencyKey,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload) throw new Error(t('booking.createTurnError'))

      const created = payload as TurnResult
      setTurn(created)
      history.replaceState(null, '', `#/book?shop=${encodeURIComponent(slug)}&turn=${created.turn.id}&token=${encodeURIComponent(created.lookupToken)}`)
    } catch {
      setError(t('booking.createTurnError'))
    } finally {
      setBusy(false)
    }
  }

  async function findSlots(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const data = new FormData(event.currentTarget)

    try {
      const response = await fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/appointments/availability?serviceId=${data.get('serviceId')}&date=${data.get('date')}&barberId=${data.get('barberId') || ''}`)
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload) throw new Error(t('booking.availabilityError'))
      setSlots(payload as Slot[])
    } catch {
      setError(t('booking.availabilityError'))
    } finally {
      setBusy(false)
    }
  }

  async function book(slot: Slot, form: HTMLFormElement) {
    setBusy(true)
    setError('')
    const data = new FormData(form)

    try {
      const response = await fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: data.get('serviceId'),
          barberId: slot.barberId,
          startsAt: slot.startsAtUtc,
          customerName: data.get('customerName'),
          customerPhone: data.get('customerPhone') || null,
          customerEmail: data.get('customerEmail') || null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload) throw new Error(t('booking.bookError'))

      const created = payload as AppointmentResult
      setAppointment(created)
      setSlots([])
      history.replaceState(null, '', `#/book?shop=${encodeURIComponent(slug)}&appointment=${created.appointment.id}&token=${encodeURIComponent(created.lookupToken)}`)
    } catch {
      setError(t('booking.bookError'))
    } finally {
      setBusy(false)
    }
  }

  async function cancelSaved(kind: 'turn' | 'appointment') {
    const saved = kind === 'turn' ? turn : appointment
    if (!saved) return

    setBusy(true)
    setError('')
    const id = kind === 'turn' ? turn!.turn.id : appointment!.appointment.id

    try {
      const response = await fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/${kind === 'turn' ? 'turns' : 'appointments'}/${id}?token=${encodeURIComponent(saved.lookupToken)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(t('booking.cancelError'))

      history.replaceState(null, '', `#/book?shop=${encodeURIComponent(slug)}`)
      if (kind === 'turn') {
        setTurn(null)
        setTurnIdempotencyKey(crypto.randomUUID())
      } else {
        setAppointment(null)
      }
    } catch {
      setError(t('booking.cancelError'))
    } finally {
      setBusy(false)
    }
  }

  if (!slug) return <main className="public-booking"><section><h1>{t('booking.missingShopTitle')}</h1><p>{t('booking.missingShopText')}</p></section></main>
  if (!shop && !error) return <main className="public-booking"><section><p>{t('booking.loadingShop')}</p></section></main>

  const appointmentsEnabled = capabilities?.canUseAppointments === true

  return <main className="public-booking">
    <section className="booking-card">
      <a href="#/"><img src="/branding/barbertrix-logo.png" alt="BarberTrix" /></a>
      <p className="booking-kicker">{shop?.name}</p>
      <h1>{t('booking.title')}</h1>

      <div className="booking-tabs">
        <button className={mode === 'queue' ? 'active' : ''} onClick={() => setMode('queue')}>{t('customer.takeTurn')}</button>
        {appointmentsEnabled && <button className={mode === 'appointment' ? 'active' : ''} onClick={() => setMode('appointment')}>{t('customer.bookAppointment')}</button>}
      </div>

      {!appointmentsEnabled && <p className="booking-note">{t('booking.walkInOnly')}</p>}
      {error && <p className="booking-error" role="alert">{error}</p>}

      {mode === 'queue' && !turn && <form className="booking-form" onSubmit={createTurn}>
        <input name="customerName" placeholder={t('booking.nameOptional')} maxLength={120} />
        <input name="customerPhone" placeholder={t('booking.phoneOptional')} maxLength={40} />
        <select name="serviceId" required defaultValue="">
          <option value="" disabled>{t('selectService')}</option>
          {shop?.services.map(item => <option key={item.id} value={item.id}>{item.name} · RD${item.price}</option>)}
        </select>
        <select name="barberId" defaultValue="">
          <option value="">{t('booking.nextBarber')}</option>
          {shop?.barbers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button disabled={busy}>{busy ? t('booking.generating') : t('booking.getTurn')}</button>
      </form>}

      {mode === 'queue' && turn && <div className="ticket-result">
        <span>{t('booking.yourTurn')}</span>
        <strong>{turn.turn.ticketNumber}</strong>
        <p>{t('booking.status', { status: turnStatusLabel(t, turn.turn.status) })}</p>
        <p>{t('booking.position', { position: turn.position > 0 ? turn.position : t('booking.servingNow') })}</p>
        <p>{t('booking.estimatedWait', { minutes: turn.estimatedWaitMinutes })}</p>
        <small>{t('booking.keepTurnLink')}</small>
        {['Waiting', 'Called'].includes(turn.turn.status) && <button disabled={busy} onClick={() => void cancelSaved('turn')}>{t('booking.cancelTurn')}</button>}
      </div>}

      {mode === 'appointment' && appointmentsEnabled && !appointment && <form className="booking-form" onSubmit={findSlots}>
        <input name="customerName" placeholder={t('booking.name')} required maxLength={120} />
        <input name="customerPhone" placeholder={t('booking.phone')} maxLength={40} />
        <input name="customerEmail" type="email" placeholder={t('common.email')} maxLength={180} />
        <select name="serviceId" required defaultValue="">
          <option value="" disabled>{t('selectService')}</option>
          {shop?.services.map(item => <option key={item.id} value={item.id}>{item.name} · {item.estimatedDurationMinutes} min</option>)}
        </select>
        <select name="barberId" defaultValue="">
          <option value="">{t('anyBarber')}</option>
          {shop?.barbers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <input name="date" type="date" min={new Date().toISOString().slice(0, 10)} required />
        <button disabled={busy}>{t('booking.searchSlots')}</button>
        {slots.length > 0 && <div className="slot-grid">{slots.slice(0, 24).map(slot => <button type="button" key={`${slot.barberId}-${slot.startsAtUtc}`} onClick={event => void book(slot, event.currentTarget.form!)}>
          {new Date(slot.startsAtUtc).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}<small>{slot.barberName}</small>
        </button>)}</div>}
      </form>}

      {mode === 'appointment' && appointment && <div className="ticket-result appointment">
        <span>{t('booking.appointmentConfirmed')}</span>
        <strong>{new Date(appointment.appointment.startsAtUtc).toLocaleString(locale)}</strong>
        <p>{t('booking.appointmentWith', { service: appointment.appointment.serviceName, barber: appointment.appointment.barberName })}</p>
        <small>{t('booking.keepAppointmentLink')}</small>
        {appointment.appointment.status === 'Confirmed' && <button disabled={busy} onClick={() => void cancelSaved('appointment')}>{t('booking.cancelAppointment')}</button>}
      </div>}
    </section>
  </main>
}
