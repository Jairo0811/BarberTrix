import { useCallback, useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarCheck, faRightFromBracket, faRotate, faScissors, faUserClock } from '@fortawesome/free-solid-svg-icons'
import type { Auth, Barber, BarberStatus, Turn } from './types'
import { api } from './api'
import { showError, showSuccessToast } from './alerts'
import { useI18n } from './i18n'
import { barberStatusLabel, turnStatusLabel } from './i18n/domainLabels'
import './dashboard.css'
import './role-portals.css'

type Appointment = { id: string; serviceName: string; barberId: string; barberName: string; startsAtUtc: string; customerName: string; status: string }
type Capabilities = { canUseAppointments: boolean; isDemo: boolean }

export default function BarberPortal({ auth, onLogout }: { auth: Auth; onLogout: () => void }) {
  const { locale, t } = useI18n()
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
    } catch {
      setError(t('barber.loadError'))
    }
  }, [t])

  useEffect(() => { void load() }, [load])

  async function updateStatus(status: BarberStatus) {
    if (!auth.barberId) return
    setBusy(true)
    try {
      await api(`/api/queue/barbers/${auth.barberId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      await load()
      void showSuccessToast(t('barber.statusUpdated'))
    } catch {
      await showError(t('barber.updateStatusError'), t('barber.unexpectedError'))
    } finally {
      setBusy(false)
    }
  }

  async function transition(turn: Turn, action: 'call' | 'start' | 'complete' | 'no-show') {
    if (!auth.barberId) return
    setBusy(true)
    try {
      const suffix = action === 'call' ? `/call/${auth.barberId}` : `/${action}`
      await api(`/api/queue/turns/${turn.id}${suffix}`, { method: 'POST' })
      await load()
      void showSuccessToast(t('barber.turnUpdated'))
    } catch {
      await showError(t('barber.updateTurnError'), t('barber.unexpectedError'))
    } finally {
      setBusy(false)
    }
  }

  return <main className="role-portal barber-portal">
    <header className="role-portal-header">
      <a href="#/"><img src="/branding/barberturn-logo.png" alt="BarberTurn" /></a>
      <div className="role-portal-user">
        <div><strong>{auth.name}</strong><span>{t('barber.portal')}</span></div>
        <button onClick={onLogout}><FontAwesomeIcon icon={faRightFromBracket} /> {t('logout')}</button>
      </div>
    </header>

    <section className="role-portal-content">
      <div className="role-portal-heading">
        <div><span>{t('barber.kicker')}</span><h1>{t('barber.title')}</h1><p>{t('barber.subtitle')}</p></div>
        <button className="portal-secondary" disabled={busy} onClick={() => void load()}><FontAwesomeIcon icon={faRotate} /> {t('refresh')}</button>
      </div>
      {error && <p className="portal-error" role="alert">{error}</p>}

      <section className="portal-kpis">
        <article><FontAwesomeIcon icon={faScissors} /><div><strong>{ownBarber ? barberStatusLabel(t, ownBarber.status) : '—'}</strong><span>{t('barber.myStatus')}</span></div></article>
        <article><FontAwesomeIcon icon={faUserClock} /><div><strong>{assignedTurns.filter(item => ['Waiting', 'Called', 'InService'].includes(item.status)).length}</strong><span>{t('barber.assignedCustomers')}</span></div></article>
        <article><FontAwesomeIcon icon={faCalendarCheck} /><div><strong>{appointments.length}</strong><span>{t('barber.upcomingAppointments')}</span></div></article>
      </section>

      <section className="portal-grid">
        <article className="portal-card featured">
          <p className="portal-kicker">{t('barber.currentKicker')}</p>
          {activeTurn ? <>
            <h2>{activeTurn.ticketNumber} · {activeTurn.customerName || t('barber.customerFallback')}</h2>
            <p>{activeTurn.serviceName}</p>
            <div className="portal-actions">
              {activeTurn.status === 'Called' && <>
                <button disabled={busy} onClick={() => void transition(activeTurn, 'start')}>{t('startService')}</button>
                <button className="danger" disabled={busy} onClick={() => void transition(activeTurn, 'no-show')}>{t('noShow')}</button>
              </>}
              {activeTurn.status === 'InService' && <button disabled={busy} onClick={() => void transition(activeTurn, 'complete')}>{t('complete')}</button>}
            </div>
          </> : <>
            <h2>{t('barber.noActive')}</h2>
            <p>{t('barber.noActiveText')}</p>
          </>}
        </article>

        <article className="portal-card">
          <p className="portal-kicker">{t('barber.availabilityKicker')}</p>
          <h2>{t('barber.changeStatus')}</h2>
          <div className="portal-actions wrap">
            <button disabled={busy || ownBarber?.status === 'Available'} onClick={() => void updateStatus('Available')}>{t('available')}</button>
            <button disabled={busy || ownBarber?.status === 'Break'} onClick={() => void updateStatus('Break')}>{t('break')}</button>
            <button disabled={busy || ownBarber?.status === 'Offline'} onClick={() => void updateStatus('Offline')}>{t('offline')}</button>
          </div>
        </article>
      </section>

      <section className="portal-card">
        <div className="portal-section-title"><div><p className="portal-kicker">{t('barber.queueKicker')}</p><h2>{t('barber.upcomingCustomers')}</h2></div></div>
        <div className="portal-list">
          {assignedTurns.filter(item => item.status === 'Waiting').map(turn => <article key={turn.id}>
            <div><strong>{turn.ticketNumber} · {turn.customerName || t('barber.customerFallback')}</strong><span>{turn.serviceName}</span></div>
            <span>{turnStatusLabel(t, turn.status)}</span>
          </article>)}
          {availableTurns.slice(0, 5).map(turn => <article key={turn.id}>
            <div><strong>{turn.ticketNumber} · {turn.customerName || t('barber.customerFallback')}</strong><span>{turn.serviceName} · {t('barber.unassigned')}</span></div>
            <button disabled={busy || ownBarber?.status !== 'Available'} onClick={() => void transition(turn, 'call')}>{t('barber.serve')}</button>
          </article>)}
          {assignedTurns.length === 0 && availableTurns.length === 0 && <p>{t('barber.noPending')}</p>}
        </div>
      </section>

      <section className="portal-card">
        <p className="portal-kicker">{t('barber.agendaKicker')}</p>
        <h2>{t('barber.myAppointments')}</h2>
        {!capabilities?.canUseAppointments
          ? <div className="locked-feature-inline"><strong>{t('barber.proRequired')}</strong><span>{t('barber.proRequiredText')}</span></div>
          : <div className="portal-list">
            {appointments.map(item => <article key={item.id}><div><strong>{item.customerName}</strong><span>{item.serviceName}</span></div><span>{new Date(item.startsAtUtc).toLocaleString(locale)}</span></article>)}
            {appointments.length === 0 && <p>{t('barber.noAppointments')}</p>}
          </div>}
      </section>
    </section>
  </main>
}
