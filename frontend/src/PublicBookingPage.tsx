import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { API_URL } from './api'
import { BarberAvatar } from './BarberAvatar'
import { useI18n } from './i18n'
import { turnStatusLabel } from './i18n/domainLabels'
import './public-booking.css'

type Service = { id: string; name: string; price: number; estimatedDurationMinutes: number }
type Barber = { id: string; name: string; chairNumber: number }
type ShopProfile = { description?: string | null; logoUrl?: string | null; coverImageUrl?: string | null; whatsAppPhone?: string | null; publicPhone?: string | null; address?: string | null; city?: string | null; latitude?: number | null; longitude?: number | null }
type Shop = { id: string; name: string; slug: string; timeZoneId: string; services: Service[]; barbers: Barber[]; profile?: ShopProfile | null }

function safeImage(url?: string | null) { return url && /^(https?:\/\/|\/)/i.test(url) ? url : null }

type QueueSummary = { waiting: number; waitMinutes: number }

function ShopHeader({ shop, title, queue, waitingLabel }: { shop: Shop | null; title: string; queue: QueueSummary | null; waitingLabel: string }) {
  const p = shop?.profile
  const cover = safeImage(p?.coverImageUrl)
  const logo = safeImage(p?.logoUrl)
  const wa = p?.whatsAppPhone?.replace(/\D/g, '')
  const place = [p?.address, p?.city].filter(Boolean).join(', ')
  const mapUrl = p?.latitude != null && p?.longitude != null ? `https://www.google.com/maps?q=${p.latitude},${p.longitude}` : place ? `https://www.google.com/maps?q=${encodeURIComponent(place)}` : null
  return <header className="shop-hero">
    {cover && <img className="shop-cover" src={cover} alt="" loading="eager" decoding="async" />}
    <div className="shop-identity">
      {logo ? <img className="shop-logo" src={logo} alt="" decoding="async" /> : <span className="shop-logo shop-logo-fallback" aria-hidden="true">{(shop?.name ?? 'B').trim().charAt(0).toUpperCase()}</span>}
      <div><h1>{shop?.name}</h1>{p?.description && <p className="shop-description">{p.description}</p>}</div>
    </div>
    {(wa || p?.publicPhone || mapUrl) && <div className="shop-actions">
      {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">WhatsApp</a>}
      {p?.publicPhone && <a href={`tel:${p.publicPhone.replace(/[^\d+]/g, '')}`}>{p.publicPhone}</a>}
      {mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer">{place || 'Maps'}</a>}
    </div>}
    {queue && <p className="shop-live" role="status"><span className="shop-live-dot" aria-hidden="true" /><strong>{queue.waiting}</strong> {waitingLabel}{queue.waitMinutes > 0 && <> · ~{queue.waitMinutes} min</>}</p>}
    <p className="booking-kicker">{title}</p>
  </header>
}

function ServiceChoices({ services, label }: { services: Service[]; label: string }) {
  return <fieldset className="choice-group"><legend>{label}</legend>
    {services.map(item => <label key={item.id} className="choice-card">
      <input type="radio" name="serviceId" value={item.id} required />
      <span className="choice-body"><strong>{item.name}</strong><small>{item.estimatedDurationMinutes} min</small></span>
      <span className="choice-price">RD${item.price}</span>
    </label>)}
  </fieldset>
}

function BarberChoices({ barbers, label, anyLabel, shopId }: { barbers: Barber[]; label: string; anyLabel: string; shopId?: string }) {
  return <fieldset className="choice-group choice-group-barbers"><legend>{label}</legend>
    <label className="choice-card"><input type="radio" name="barberId" value="" defaultChecked /><span className="choice-avatar" aria-hidden="true">✂</span><span className="choice-body"><strong>{anyLabel}</strong></span></label>
    {barbers.map(item => <label key={item.id} className="choice-card">
      <input type="radio" name="barberId" value={item.id} />
      <BarberAvatar shopId={shopId} barberId={item.id} name={item.name} />
      <span className="choice-body"><strong>{item.name}</strong><small>#{item.chairNumber}</small></span>
    </label>)}
  </fieldset>
}
type PublicCapabilities = { canUseAppointments: boolean; canUseTv: boolean }
type TurnResult = { turn: { id: string; ticketNumber: string; status: string }; lookupToken: string; position: number; estimatedWaitMinutes: number }
type Slot = { startsAtUtc: string; endsAtUtc: string; barberId: string; barberName: string }
type AppointmentResult = { appointment: { id: string; serviceName: string; barberName: string; startsAtUtc: string; status: string }; lookupToken: string }

function queryValue(name: string) {
  return new URLSearchParams((location.hash.split('?')[1] ?? '')).get(name) ?? ''
}

function dateInZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

function availabilityKey(form: FormData) {
  return JSON.stringify([form.get('serviceId'), form.get('barberId'), form.get('date')])
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
  const [slotsKey, setSlotsKey] = useState<string | null>(null)
  const availabilityVersion = useRef(0)
  const bookingInFlight = useRef(false)
  const [turnIdempotencyKey, setTurnIdempotencyKey] = useState(() => crypto.randomUUID())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [queueInfo, setQueueInfo] = useState<QueueSummary | null>(null)

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

  // The ticket number in the tab title helps clients who switch apps while waiting.
  useEffect(() => {
    if (!turn) return
    const previous = document.title
    document.title = `${turn.turn.ticketNumber} · ${shop?.name ?? 'BarberTrix'}`
    return () => { document.title = previous }
  }, [turn?.turn.ticketNumber, shop?.name])

  // Haptic nudge when the barber calls this turn (supported browsers only).
  useEffect(() => {
    if (turn?.turn.status === 'Called' && typeof navigator.vibrate === 'function') navigator.vibrate([200, 100, 200])
  }, [turn?.turn.status])

  useEffect(() => {
    if (!shop || turn || appointment) return
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/queue`)
        if (!response.ok || cancelled) return
        const data = await response.json() as { turns: { status: string }[]; estimatedWaitMinutes: number }
        if (!cancelled) setQueueInfo({ waiting: data.turns.filter(item => item.status === 'Waiting').length, waitMinutes: data.estimatedWaitMinutes })
      } catch { /* informational only */ }
    }
    void load()
    const timer = window.setInterval(() => void load(), 30000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [shop, slug, turn, appointment])

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
    const version = ++availabilityVersion.current
    const key = availabilityKey(data)
    setSlots([])
    setSlotsKey(null)

    try {
      const response = await fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/appointments/availability?serviceId=${encodeURIComponent(String(data.get('serviceId')))}&date=${encodeURIComponent(String(data.get('date')))}&barberId=${encodeURIComponent(String(data.get('barberId') || ''))}`)
      const payload = await response.json().catch(() => null)
      if (!response.ok || !Array.isArray(payload)) throw new Error(t('booking.availabilityError'))
      if (version === availabilityVersion.current) {
        setSlots(payload as Slot[])
        setSlotsKey(key)
      }
    } catch {
      if (version === availabilityVersion.current) setError(t('booking.availabilityError'))
    } finally {
      setBusy(false)
    }
  }

  async function book(slot: Slot, form: HTMLFormElement) {
    if (bookingInFlight.current || !form.reportValidity()) return
    const data = new FormData(form)
    if (slotsKey !== availabilityKey(data) || !slots.some(item => item.barberId === slot.barberId && item.startsAtUtc === slot.startsAtUtc)) {
      setSlots([])
      setSlotsKey(null)
      setError(t('booking.availabilityError'))
      return
    }
    bookingInFlight.current = true
    setBusy(true)
    setError('')

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
      setSlotsKey(null)
      history.replaceState(null, '', `#/book?shop=${encodeURIComponent(slug)}&appointment=${created.appointment.id}&token=${encodeURIComponent(created.lookupToken)}`)
    } catch {
      setError(t('booking.bookError'))
    } finally {
      bookingInFlight.current = false
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
  if (!shop) return <main className="public-booking"><section className="booking-card">
    <p className={error ? 'booking-error' : ''} role={error ? 'alert' : 'status'}>{error || t('booking.loadingShop')}</p>
  </section></main>

  const appointmentsEnabled = capabilities?.canUseAppointments === true

  return <main className="public-booking">
    <section className="booking-card">
      <ShopHeader shop={shop} title={t('booking.title')} queue={queueInfo} waitingLabel={t('waiting')} />

      <div className="booking-tabs">
        <button className={mode === 'queue' ? 'active' : ''} onClick={() => setMode('queue')}>{t('customer.takeTurn')}</button>
        {appointmentsEnabled && <button className={mode === 'appointment' ? 'active' : ''} onClick={() => setMode('appointment')}>{t('customer.bookAppointment')}</button>}
      </div>

      {!appointmentsEnabled && <p className="booking-note">{t('booking.walkInOnly')}</p>}
      {error && <p className="booking-error" role="alert">{error}</p>}

      {mode === 'queue' && !turn && <form className="booking-form" onSubmit={createTurn}>
        <label className="booking-field"><span>{t('booking.nameOptional')}</span><input name="customerName" autoComplete="name" placeholder={t('booking.nameOptional')} maxLength={120} /></label>
        <label className="booking-field"><span>{t('booking.phoneOptional')}</span><input name="customerPhone" type="tel" autoComplete="tel" placeholder={t('booking.phoneOptional')} maxLength={40} /></label>
        <ServiceChoices services={shop?.services ?? []} label={t('selectService')} />
        <BarberChoices shopId={shop?.id} barbers={shop?.barbers ?? []} label={t('anyBarber')} anyLabel={t('booking.nextBarber')} />
        <button disabled={busy}>{busy ? t('booking.generating') : t('booking.getTurn')}</button>
      </form>}

      {mode === 'queue' && turn && <div className={`ticket-result ticket-${turn.turn.status.toLowerCase()}`} aria-live="polite">
        <span className="ticket-kicker">{t('booking.yourTurn')}</span>
        <strong className="ticket-number">{turn.turn.ticketNumber}</strong>
        <span className="ticket-pill">{turnStatusLabel(t, turn.turn.status)}</span>
        <p className="ticket-row">{t('booking.position', { position: turn.position > 0 ? turn.position : t('booking.servingNow') })}</p>
        <p className="ticket-row">{t('booking.estimatedWait', { minutes: turn.estimatedWaitMinutes })}</p>
        <small>{t('booking.keepTurnLink')}</small>
        {['Waiting', 'Called'].includes(turn.turn.status) && <button disabled={busy} onClick={() => void cancelSaved('turn')}>{t('booking.cancelTurn')}</button>}
      </div>}

      {mode === 'appointment' && appointmentsEnabled && !appointment && <form className="booking-form" onSubmit={findSlots} onChange={event => {
        if (['serviceId', 'barberId', 'date'].includes(event.target.getAttribute('name') ?? '')) {
          availabilityVersion.current += 1
          setSlots([])
          setSlotsKey(null)
          setError('')
        }
      }}>
        <label className="booking-field"><span>{t('booking.name')}</span><input name="customerName" autoComplete="name" placeholder={t('booking.name')} required maxLength={120} /></label>
        <label className="booking-field"><span>{t('booking.phone')}</span><input name="customerPhone" type="tel" autoComplete="tel" placeholder={t('booking.phone')} maxLength={40} /></label>
        <label className="booking-field"><span>{t('common.email')}</span><input name="customerEmail" type="email" autoComplete="email" placeholder={t('common.email')} maxLength={180} /></label>
        <ServiceChoices services={shop?.services ?? []} label={t('selectService')} />
        <BarberChoices shopId={shop?.id} barbers={shop?.barbers ?? []} label={t('anyBarber')} anyLabel={t('anyBarber')} />
        <label className="booking-field"><span>{t('appointmentsAdmin.date')}</span><input name="date" type="date" min={dateInZone(shop.timeZoneId)} required /></label>
        <button disabled={busy}>{t('booking.searchSlots')}</button>
        {slots.length > 0 && <div className="slot-grid">{slots.map(slot => <button type="button" disabled={busy} key={`${slot.barberId}-${slot.startsAtUtc}`} onClick={event => { if (event.currentTarget.form) void book(slot, event.currentTarget.form) }}>
          {new Date(slot.startsAtUtc).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: shop.timeZoneId })}<small>{slot.barberName}</small>
        </button>)}</div>}
      </form>}

      {mode === 'appointment' && appointment && <div className="ticket-result appointment">
        <span>{t('booking.appointmentConfirmed')}</span>
        <strong>{new Date(appointment.appointment.startsAtUtc).toLocaleString(locale, { timeZone: shop.timeZoneId })}</strong>
        <p>{t('booking.appointmentWith', { service: appointment.appointment.serviceName, barber: appointment.appointment.barberName })}</p>
        <small>{t('booking.keepAppointmentLink')}</small>
        {appointment.appointment.status === 'Confirmed' && <button disabled={busy} onClick={() => void cancelSaved('appointment')}>{t('booking.cancelAppointment')}</button>}
      </div>}
    </section>
  </main>
}
