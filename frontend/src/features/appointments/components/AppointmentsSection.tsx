import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import type { Barber, Service } from '../../../types'
import { showError, showSuccessToast } from '../../../alerts'
import { apiErrorMessage } from '../../../apiErrorMessages'
import { useI18n } from '../../../i18n'
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
const localizedStatuses = new Set(['Confirmed', 'CheckedIn', 'Completed', 'Cancelled', 'NoShow'])

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

function formatDateTime(value: string, locale: string, timeZone?: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timeZone || undefined,
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))
}

function formatTime(value: string, locale: string, timeZone?: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timeZone || undefined, hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))
}

export default function AppointmentsSection({ isDemo, shop, capabilities }: Props) {
  const { locale, t } = useI18n()
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

  const statusLabel = (status: string) => localizedStatuses.has(status) ? t(`appointmentsAdmin.status.${status}`) : t('status.unknown')
  const durationLabel = (minutes: number) => new Intl.NumberFormat(locale, { style: 'unit', unit: 'minute', unitDisplay: 'short' }).format(minutes)

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
      void showSuccessToast(t('appointmentsAdmin.updated'))
    } catch (error) {
      await showError(t('appointmentsAdmin.updateError'), apiErrorMessage(error, locale, t('appointmentsAdmin.updateError')))
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
      void showSuccessToast(t('appointmentsAdmin.created'))
    } catch (error) {
      await showError(t('appointmentsAdmin.createError'), apiErrorMessage(error, locale, t('appointmentsAdmin.createError')))
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
      void showSuccessToast(t('appointmentsAdmin.rescheduled'))
    } catch (error) {
      await showError(t('appointmentsAdmin.rescheduleError'), apiErrorMessage(error, locale, t('appointmentsAdmin.rescheduleError')))
    } finally { setBusy(false) }
  }

  return (
    <section className="panel dashboard-section appointments-workspace" id="appointments-section">
      <div className="panel-heading">
        <div><p className="eyebrow">{t('appointmentsAdmin.eyebrow')}</p><h2>{t('appointmentsAdmin.title')}</h2><p className="appointments-lead">{t('appointmentsAdmin.lead')}</p></div>
        {shop && capabilities?.canUseAppointments && <a className="secondary-link" href={`#/customer?shop=${shop.slug}`}>{t('appointmentsAdmin.customerPortal')}</a>}
      </div>

      {!capabilities?.canUseAppointments ? <LockedFeature title={t('appointmentsAdmin.lockedTitle')} text={t('appointmentsAdmin.lockedText')} /> : <>
        <div className="appointments-toolbar" aria-label={t('appointmentsAdmin.controls')}>
          <div className="agenda-view-switch" role="group" aria-label={t('appointmentsAdmin.view')}>
            <button type="button" className={view === 'today' ? 'active' : ''} onClick={() => setView('today')}>{t('appointmentsAdmin.today')}</button>
            <button type="button" className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>{t('appointmentsAdmin.week')}</button>
          </div>
          <label>{t('appointmentsAdmin.date')}<input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} /></label>
          <label>{t('appointmentsAdmin.barber')}<select value={barberFilter} onChange={event => setBarberFilter(event.target.value)}><option value="all">{t('commercial.all')}</option>{barbers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>{t('appointmentsAdmin.status')}<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="active">{t('appointmentsAdmin.active')}</option><option value="all">{t('commercial.all')}</option><option value="Confirmed">{t('appointmentsAdmin.status.Confirmed')}</option><option value="CheckedIn">{t('appointmentsAdmin.status.CheckedIn')}</option><option value="Completed">{t('appointmentsAdmin.status.Completed')}</option><option value="NoShow">{t('appointmentsAdmin.status.NoShow')}</option><option value="Cancelled">{t('appointmentsAdmin.status.Cancelled')}</option></select></label>
        </div>

        <div className="agenda-summary"><strong>{visibleAppointments.length}</strong><span>{view === 'today' ? t('appointmentsAdmin.daySummary') : t('appointmentsAdmin.weekSummary')}</span></div>

        <div className="agenda-days">
          {groupedAppointments.length ? groupedAppointments.map(([dateKey, items]) => <section className="agenda-day" key={dateKey}>
            <h3>{new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${dateKey}T12:00:00Z`))}</h3>
            <div className="business-list appointment-list">{items.map(item => <article key={item.id} className={`appointment-card status-${item.status.toLowerCase()}`}>
              <div className="appointment-time"><strong>{formatTime(item.startsAtUtc, locale, shop?.timeZoneId)}</strong><span>{formatTime(item.endsAtUtc, locale, shop?.timeZoneId)}</span></div>
              <div className="appointment-details"><strong>{item.customerName}</strong><span>{item.serviceName} · {item.barberName}</span><small>{item.customerPhone || item.customerEmail || t('appointmentsAdmin.noContact')}</small></div>
              <span className="appointment-status">{statusLabel(item.status)}</span>
              {!isDemo && <div className="billing-actions appointment-actions">
                {item.status === 'Confirmed' && <><button disabled={busy} onClick={() => beginReschedule(item)}>{t('appointmentsAdmin.reschedule')}</button><button disabled={busy} onClick={() => void appointmentAction(item.id, 'check-in')}>{t('appointmentsAdmin.checkIn')}</button><button disabled={busy} onClick={() => void appointmentAction(item.id, 'no-show')}>{t('appointmentsAdmin.status.NoShow')}</button><button className="danger" disabled={busy} onClick={() => void appointmentAction(item.id, 'cancel')}>{t('appointmentsAdmin.cancel')}</button></>}
                {item.status === 'CheckedIn' && <button disabled={busy} onClick={() => void appointmentAction(item.id, 'complete')}>{t('appointmentsAdmin.complete')}</button>}
              </div>}
            </article>)}</div>
          </section>) : <div className="agenda-empty"><strong>{t('appointmentsAdmin.emptyTitle')}</strong><span>{t('appointmentsAdmin.emptyText')}</span></div>}
        </div>

        {!isDemo && <section className="appointment-admin-grid">
          <article className="appointment-form-card">
            <p className="eyebrow">{t('appointmentsAdmin.newEyebrow')}</p><h3>{t('appointmentsAdmin.createTitle')}</h3>
            <form className="business-form appointment-form" onSubmit={create}>
              <input name="customerName" placeholder={t('appointmentsAdmin.customerName')} required />
              <input name="customerPhone" placeholder={t('appointmentsAdmin.phone')} inputMode="tel" />
              <input name="customerEmail" placeholder={t('appointmentsAdmin.email')} type="email" />
              <select value={formServiceId} onChange={event => setFormServiceId(event.target.value)} required><option value="">{t('appointmentsAdmin.service')}</option>{services.map(item => <option key={item.id} value={item.id}>{item.name} · {durationLabel(item.estimatedDurationMinutes)}</option>)}</select>
              <select value={formBarberId} onChange={event => setFormBarberId(event.target.value)} required><option value="">{t('appointmentsAdmin.barber')}</option>{barbers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <input type="date" value={formDate} min={today} onChange={event => setFormDate(event.target.value)} required />
              <select value={formSlot} onChange={event => setFormSlot(event.target.value)} required disabled={!slots.length}><option value="">{slots.length ? t('appointmentsAdmin.slotAvailable') : t('appointmentsAdmin.noSlots')}</option>{slots.map(slot => <option key={`${slot.barberId}-${slot.startsAtUtc}`} value={slot.startsAtUtc}>{formatTime(slot.startsAtUtc, locale, shop?.timeZoneId)}</option>)}</select>
              <button disabled={busy || !formSlot}>{t('appointmentsAdmin.create')}</button>
            </form>
          </article>

          {bookingQr && <article className="booking-qr appointment-self-service"><img src={bookingQr} alt={t('appointmentsAdmin.qrAlt')} /><div><strong>{t('appointmentsAdmin.selfService')}</strong><span>{t('appointmentsAdmin.selfServiceText')}</span><a href={bookingQr} download={`barbertrix-${shop?.slug ?? 'customers'}-qr.png`}>{t('appointmentsAdmin.downloadQr')}</a></div></article>}
        </section>}

        {editing && <div className="appointment-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setEditing(null) }}>
          <section className="appointment-modal" role="dialog" aria-modal="true" aria-labelledby="reschedule-title">
            <p className="eyebrow">{t('appointmentsAdmin.rescheduleEyebrow')}</p><h3 id="reschedule-title">{editing.customerName}</h3><p>{editing.serviceName} · {t('appointmentsAdmin.currently', { date: formatDateTime(editing.startsAtUtc, locale, shop?.timeZoneId) })}</p>
            <form className="business-form appointment-form" onSubmit={saveReschedule}>
              <select value={editBarberId} onChange={event => setEditBarberId(event.target.value)} required>{barbers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <input type="date" value={editDate} min={today} onChange={event => setEditDate(event.target.value)} required />
              <select value={editSlot} onChange={event => setEditSlot(event.target.value)} required disabled={!editSlots.length}><option value="">{editSlots.length ? t('appointmentsAdmin.newSlot') : t('appointmentsAdmin.noSlots')}</option>{editSlots.map(slot => <option key={`${slot.barberId}-${slot.startsAtUtc}`} value={slot.startsAtUtc}>{formatTime(slot.startsAtUtc, locale, shop?.timeZoneId)}</option>)}</select>
              <div className="billing-actions"><button type="button" className="secondary-link" onClick={() => setEditing(null)}>{t('commercial.close')}</button><button disabled={busy || !editSlot}>{t('appointmentsAdmin.saveChange')}</button></div>
            </form>
          </section>
        </div>}
      </>}
    </section>
  )
}
