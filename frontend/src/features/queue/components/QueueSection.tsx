import { FormEvent, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faRotate } from '@fortawesome/free-solid-svg-icons'
import type { Barber, Service, Turn } from '../../../types'
import { confirmDestructive, showError, showSuccessToast } from '../../../alerts'
import { getErrorMessage } from '../../../shared/utils/errors'
import { interpolate } from '../../../shared/utils/interpolate'
import { createQueueTurn, transitionQueueTurn } from '../api/queueApi'

type DashboardCopy = Record<string, string>
type TurnAction = 'call' | 'start' | 'complete' | 'cancel' | 'no-show'

type Props = {
  barbers: Barber[]
  services: Service[]
  turns: Turn[]
  overview: { waiting: number; inService: number; completed: number }
  loading: boolean
  copy: DashboardCopy
  onRefresh: () => Promise<void>
  onError: (message: string) => void
}

export default function QueueSection({ barbers, services, turns, overview, loading, copy: c, onRefresh, onError }: Props) {
  const [busy, setBusy] = useState(false)
  const activeServices = services.filter(service => service.isActive).length

  async function runOperation(operation: () => Promise<unknown>, fallback: string) {
    setBusy(true)
    onError('')
    try {
      await operation()
      await onRefresh()
      return true
    } catch (exception) {
      const message = getErrorMessage(exception, fallback)
      onError(message)
      await showError(fallback, message)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function createTurn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const created = await runOperation(() => createQueueTurn({
      serviceId: data.get('serviceId'), customerName: data.get('customerName') || null, barberId: data.get('barberId') || null,
    }), c.operationError)
    if (created) { form.reset(); void showSuccessToast(c.createdTurn) }
  }

  async function transition(turn: Turn, action: TurnAction, barberId?: string) {
    if (action === 'cancel') {
      const confirmed = await confirmDestructive(c.cancelTitle, interpolate(c.cancelText, { ticket: turn.ticketNumber }), c.confirmCancel)
      if (!confirmed) return
    }
    if (action === 'no-show') {
      const confirmed = await confirmDestructive(c.noShowTitle, interpolate(c.noShowText, { ticket: turn.ticketNumber }), c.confirmNoShow)
      if (!confirmed) return
    }

    const updated = await runOperation(() => transitionQueueTurn(turn.id, action, barberId), c.updateTurnError)
    if (!updated) return
    const successMessage = { call: c.calledSuccess, start: c.startedSuccess, complete: c.completedSuccess, cancel: c.cancelledSuccess, 'no-show': c.noShowSuccess }[action]
    void showSuccessToast(successMessage)
  }

  return (
    <section className="dashboard-section" id="queue-section">
      <div className="dashboard-section-title"><h2>{c.turnOperation}</h2><p>{c.turnOperationText}</p></div>
      <section className="operations-grid">
        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">{c.newTurn}</p><h2>{c.addToQueue}</h2></div></div>
          <form className="form-stack" onSubmit={createTurn}>
            <input name="customerName" placeholder={c.customerOptional} />
            <select name="serviceId" required defaultValue=""><option value="" disabled>{c.selectService}</option>{services.filter(service => service.isActive).map(service => <option key={service.id} value={service.id}>{service.name} · RD${service.price}</option>)}</select>
            <select name="barberId" defaultValue=""><option value="">{c.anyBarber}</option>{barbers.filter(barber => barber.isActive).map(barber => <option key={barber.id} value={barber.id}>{barber.name} · {c.chair} {barber.chairNumber}</option>)}</select>
            <button className="primary" disabled={busy || loading || activeServices === 0}><FontAwesomeIcon icon={faPlus} /> {c.generateTurn}</button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">{c.currentQueue}</p><h2>{c.quickStatus}</h2></div></div>
          <div className="queue-summary">
            <div className="queue-summary-item"><span className="queue-summary-ticket">{overview.waiting}</span><div className="queue-summary-copy"><strong>{c.waiting}</strong><span>{c.pendingCall}</span></div></div>
            <div className="queue-summary-item"><span className="queue-summary-ticket">{overview.inService}</span><div className="queue-summary-copy"><strong>{c.inService}</strong><span>{c.beingServed}</span></div></div>
            <div className="queue-summary-item"><span className="queue-summary-ticket">{overview.completed}</span><div className="queue-summary-copy"><strong>{c.completed}</strong><span>{c.completedText}</span></div></div>
          </div>
        </article>
      </section>

      <section className="panel queue-panel dashboard-section" id="queue-list">
        <div className="panel-heading"><div><p className="eyebrow">{c.queueLive.toUpperCase()}</p><h2>{c.turns}</h2></div><button className="secondary" type="button" disabled={loading} onClick={() => void onRefresh()}><FontAwesomeIcon icon={faRotate} /> {c.refresh}</button></div>
        <div className="turn-list">
          {turns.length === 0 && !loading && <p className="empty">{c.noTurnsToday}</p>}
          {loading && <p className="empty">{c.loadingQueue}</p>}
          {turns.map(turn => (
            <article className="turn-card" key={turn.id}>
              <div className="ticket"><small>{turn.status}</small><strong>{turn.ticketNumber}</strong></div>
              <div className="turn-copy"><strong>{turn.customerName || c.unnamedCustomer}</strong><span>{turn.serviceName}</span><small>{turn.barberName ? `${turn.barberName} · ${c.chair} ${turn.chairNumber}` : c.barberToAssign}</small></div>
              <div className="turn-actions">
                {turn.status === 'Waiting' && <>{barbers.filter(barber => barber.status === 'Available').map(barber => <button key={barber.id} disabled={busy} onClick={() => void transition(turn, 'call', barber.id)}>{c.callWith} {barber.name}</button>)}<button className="danger" disabled={busy} onClick={() => void transition(turn, 'cancel')}>{c.cancel}</button></>}
                {turn.status === 'Called' && <><button disabled={busy} onClick={() => void transition(turn, 'start')}>{c.startService}</button><button className="danger" disabled={busy} onClick={() => void transition(turn, 'no-show')}>{c.noShow}</button></>}
                {turn.status === 'InService' && <button className="success" disabled={busy} onClick={() => void transition(turn, 'complete')}>{c.complete}</button>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
