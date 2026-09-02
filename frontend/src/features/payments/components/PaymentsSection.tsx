import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { apiErrorMessage } from '../../../apiErrorMessages'
import { confirmDestructive, showError, showSuccessToast } from '../../../alerts'
import { useI18n } from '../../../i18n'
import LockedFeature from '../../../shared/components/LockedFeature'
import type { CashSession, Payment } from '../../../portals/admin/commercialTypes'
import {
  addCashMovement,
  closeCashSession,
  createPayment,
  getCurrentCashSession,
  getPayments,
  getRecentCashSessions,
  openCashSession,
  refundPayment,
} from '../api/paymentsApi'
import '../payments.css'

function money(locale: string, currency: string, amount: number) {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`
  }
}

function dateTime(locale: string, value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function PaymentsSection({ isDemo }: { isDemo: boolean }) {
  const { locale, t } = useI18n()
  const [payments, setPayments] = useState<Payment[]>([])
  const [current, setCurrent] = useState<CashSession | undefined>()
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [closeCounted, setCloseCounted] = useState('')

  const methodLabel = (method: string) => {
    const known = new Set(['Cash', 'Card', 'Transfer', 'BankTransfer', 'PayPal', 'Other'])
    return known.has(method) ? t(`paymentsAdmin.method.${method}`) : t('paymentsAdmin.method.Other')
  }
  const statusLabel = (status: string) => {
    const known = new Set(['Paid', 'Pending', 'Refunded', 'Failed'])
    return known.has(status) ? t(`paymentsAdmin.status.${status}`) : t('status.unknown')
  }

  const load = useCallback(async () => {
    if (isDemo) {
      setPayments([])
      setCurrent(undefined)
      setSessions([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const to = new Date()
      const from = new Date(to.getTime() - 30 * 86400000)
      const [cashSession, recentSessions, recentPayments] = await Promise.all([
        getCurrentCashSession(),
        getRecentCashSessions(),
        getPayments(from, to),
      ])
      setCurrent(cashSession)
      setSessions(recentSessions)
      setPayments(recentPayments)
    } finally {
      setLoading(false)
    }
  }, [isDemo])

  useEffect(() => { void load().catch(() => undefined) }, [load])

  const countedDifference = useMemo(() => {
    if (!current || closeCounted.trim() === '') return null
    const counted = Number(closeCounted)
    return Number.isFinite(counted) ? counted - current.expectedCash : null
  }, [closeCounted, current])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try { await action() }
    catch (error) { await showError(t('paymentsAdmin.operationError'), apiErrorMessage(error, locale, t('paymentsAdmin.operationError'))) }
    finally { setBusy(false) }
  }

  async function submitOpen(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    await run(async () => {
      await openCashSession(String(data.get('currency') || 'DOP'), Number(data.get('openingBalance')))
      form.reset()
      await load()
      void showSuccessToast(t('paymentsAdmin.opened'))
    })
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!current) return
    const form = event.currentTarget
    const data = new FormData(form)
    await run(async () => {
      await createPayment({
        amount: Number(data.get('amount')),
        currency: current.currency,
        method: String(data.get('method') || 'Cash'),
        externalReference: String(data.get('externalReference') || '').trim() || null,
      })
      form.reset()
      await load()
      void showSuccessToast(t('paymentsAdmin.paymentRecorded'))
    })
  }

  async function submitMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    await run(async () => {
      await addCashMovement(
        String(data.get('type')) as 'CashIn' | 'CashOut',
        Number(data.get('amount')),
        String(data.get('reason') || ''),
      )
      form.reset()
      await load()
      void showSuccessToast(t('paymentsAdmin.movementRecorded'))
    })
  }

  async function submitClose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!current) return
    const form = event.currentTarget
    const data = new FormData(form)
    const confirmed = await confirmDestructive(
      t('paymentsAdmin.closeConfirmTitle'),
      t('paymentsAdmin.closeConfirmText'),
      t('paymentsAdmin.closeConfirm'),
    )
    if (!confirmed) return

    await run(async () => {
      await closeCashSession(Number(data.get('countedCash')), String(data.get('note') || '').trim() || undefined)
      form.reset()
      setCloseCounted('')
      await load()
      void showSuccessToast(t('paymentsAdmin.closed'))
    })
  }

  async function refund(item: Payment) {
    const confirmed = await confirmDestructive(
      t('paymentsAdmin.refundTitle'),
      item.method === 'Cash' ? t('paymentsAdmin.refundCashText') : t('paymentsAdmin.refundOtherText'),
      t('paymentsAdmin.refund'),
    )
    if (!confirmed) return

    await run(async () => {
      await refundPayment(item.id, t('paymentsAdmin.refundReason'))
      await load()
      void showSuccessToast(t('paymentsAdmin.refunded'))
    })
  }

  return (
    <section className="panel dashboard-section cash-workspace" id="payments-section">
      <div className="cash-heading">
        <div>
          <p className="eyebrow">{t('paymentsAdmin.eyebrow')}</p>
          <h2>{t('paymentsAdmin.title')}</h2>
          <p className="cash-subtitle">{t('paymentsAdmin.subtitle')}</p>
        </div>
        {current && <span className="cash-status open">{t('paymentsAdmin.openStatus', { currency: current.currency })}</span>}
      </div>

      {isDemo ? (
        <LockedFeature title={t('paymentsAdmin.lockedTitle')} text={t('paymentsAdmin.lockedText')} />
      ) : loading ? (
        <p className="cash-empty">{t('paymentsAdmin.loading')}</p>
      ) : <>
        {!current ? (
          <div className="cash-open-card">
            <div>
              <p className="eyebrow">{t('paymentsAdmin.shiftStart')}</p>
              <h3>{t('paymentsAdmin.openTitle')}</h3>
              <p>{t('paymentsAdmin.openText')}</p>
            </div>
            <form className="cash-inline-form" onSubmit={submitOpen}>
              <label>{t('paymentsAdmin.currency')}<select name="currency" defaultValue="DOP"><option value="DOP">DOP</option><option value="USD">USD</option></select></label>
              <label>{t('paymentsAdmin.openingBalance')}<input name="openingBalance" type="number" min="0" step="0.01" defaultValue="0" required /></label>
              <button disabled={busy}>{t('paymentsAdmin.open')}</button>
            </form>
          </div>
        ) : <>
          <div className="cash-kpis" aria-label={t('paymentsAdmin.summaryAria')}>
            <article><span>{t('paymentsAdmin.openingBalance')}</span><strong>{money(locale, current.currency, current.openingBalance)}</strong></article>
            <article><span>{t('paymentsAdmin.cashSales')}</span><strong>{money(locale, current.currency, current.cashSales)}</strong></article>
            <article><span>{t('paymentsAdmin.cashInOut')}</span><strong>{money(locale, current.currency, current.cashIn)} / {money(locale, current.currency, current.cashOut)}</strong></article>
            <article className="primary"><span>{t('paymentsAdmin.expectedCash')}</span><strong>{money(locale, current.currency, current.expectedCash)}</strong></article>
            <article><span>{t('paymentsAdmin.nonCashSales')}</span><strong>{money(locale, current.currency, current.nonCashSales)}</strong></article>
          </div>

          <div className="cash-grid">
            <article className="cash-card">
              <p className="eyebrow">{t('paymentsAdmin.charge')}</p>
              <h3>{t('paymentsAdmin.recordPayment')}</h3>
              <form className="cash-form" onSubmit={submitPayment}>
                <label>{t('paymentsAdmin.amount')}<input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required /></label>
                <label>{t('paymentsAdmin.method')}<select name="method" defaultValue="Cash"><option value="Cash">{t('paymentsAdmin.method.Cash')}</option><option value="Card">{t('paymentsAdmin.method.Card')}</option><option value="Transfer">{t('paymentsAdmin.method.Transfer')}</option></select></label>
                <label>{t('paymentsAdmin.reference')}<input name="externalReference" placeholder={t('paymentsAdmin.optional')} maxLength={180} /></label>
                <button disabled={busy}>{t('paymentsAdmin.recordPayment')}</button>
              </form>
            </article>

            <article className="cash-card">
              <p className="eyebrow">{t('paymentsAdmin.movements')}</p>
              <h3>{t('paymentsAdmin.manualMovement')}</h3>
              <form className="cash-form" onSubmit={submitMovement}>
                <label>{t('paymentsAdmin.type')}<select name="type" defaultValue="CashOut"><option value="CashOut">{t('paymentsAdmin.cashOut')}</option><option value="CashIn">{t('paymentsAdmin.cashIn')}</option></select></label>
                <label>{t('paymentsAdmin.amount')}<input name="amount" type="number" min="0.01" step="0.01" required /></label>
                <label>{t('paymentsAdmin.reason')}<input name="reason" placeholder={t('paymentsAdmin.reasonPlaceholder')} maxLength={200} required /></label>
                <button disabled={busy}>{t('paymentsAdmin.saveMovement')}</button>
              </form>
            </article>

            <article className="cash-card close-card">
              <p className="eyebrow">{t('paymentsAdmin.closing')}</p>
              <h3>{t('paymentsAdmin.reconcile')}</h3>
              <form className="cash-form" onSubmit={submitClose}>
                <label>{t('paymentsAdmin.countedCash')}<input name="countedCash" type="number" min="0" step="0.01" value={closeCounted} onChange={event => setCloseCounted(event.target.value)} required /></label>
                <label>{t('paymentsAdmin.note')}<textarea name="note" rows={2} maxLength={500} placeholder={t('paymentsAdmin.optional')} /></label>
                <div className={`cash-difference ${countedDifference === null ? '' : countedDifference === 0 ? 'ok' : 'warning'}`}>
                  <span>{t('paymentsAdmin.difference')}</span>
                  <strong>{countedDifference === null ? '—' : money(locale, current.currency, countedDifference)}</strong>
                </div>
                <button className="danger" disabled={busy}>{t('paymentsAdmin.closeConfirm')}</button>
              </form>
            </article>
          </div>

          <div className="cash-movement-list">
            <div className="cash-section-title"><div><p className="eyebrow">{t('paymentsAdmin.traceability')}</p><h3>{t('paymentsAdmin.sessionMovements')}</h3></div><span>{current.movements.length}</span></div>
            {current.movements.length === 0 ? <p className="cash-empty">{t('paymentsAdmin.noMovements')}</p> : current.movements.slice().reverse().map(item => (
              <article key={item.id}>
                <div><strong>{item.type === 'CashIn' ? t('paymentsAdmin.cashIn') : t('paymentsAdmin.cashOut')}</strong><span>{item.reason}</span></div>
                <div className={item.type === 'CashIn' ? 'positive' : 'negative'}>{item.type === 'CashIn' ? '+' : '−'}{money(locale, current.currency, item.amount)}</div>
              </article>
            ))}
          </div>
        </>}

        <div className="cash-history">
          <div className="cash-section-title"><div><p className="eyebrow">{t('paymentsAdmin.payments')}</p><h3>{t('paymentsAdmin.last30Days')}</h3></div><span>{payments.length}</span></div>
          <div className="cash-table-wrap">
            <table className="cash-table">
              <thead><tr><th>{t('paymentsAdmin.date')}</th><th>{t('paymentsAdmin.amount')}</th><th>{t('paymentsAdmin.method')}</th><th>{t('paymentsAdmin.state')}</th><th>{t('paymentsAdmin.reference')}</th><th></th></tr></thead>
              <tbody>
                {payments.slice(0, 30).map(item => <tr key={item.id}>
                  <td>{dateTime(locale, item.paidAtUtc)}</td>
                  <td><strong>{money(locale, item.currency, item.amount)}</strong></td>
                  <td>{methodLabel(item.method)}</td>
                  <td><span className={`payment-state ${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span></td>
                  <td>{item.externalReference || '—'}</td>
                  <td>{item.status === 'Paid' && <button className="cash-link danger-text" disabled={busy} onClick={() => void refund(item)}>{t('paymentsAdmin.refund')}</button>}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {payments.length === 0 && <p className="cash-empty">{t('paymentsAdmin.noPayments')}</p>}
        </div>

        <div className="cash-session-history">
          <div className="cash-section-title"><div><p className="eyebrow">{t('paymentsAdmin.closings')}</p><h3>{t('paymentsAdmin.recentSessions')}</h3></div><span>{sessions.length}</span></div>
          <div className="cash-session-grid">
            {sessions.map(session => <article key={session.id}>
              <div><strong>{dateTime(locale, session.openedAtUtc)}</strong><span>{session.closedAtUtc ? t('paymentsAdmin.closedAt', { date: dateTime(locale, session.closedAtUtc) }) : t('paymentsAdmin.inProgress')}</span></div>
              <div><span>{t('paymentsAdmin.expected')}</span><strong>{money(locale, session.currency, session.expectedCash)}</strong></div>
              <div><span>{t('paymentsAdmin.counted')}</span><strong>{session.countedCash == null ? '—' : money(locale, session.currency, session.countedCash)}</strong></div>
              <div className={session.difference === 0 ? 'positive' : session.difference == null ? '' : 'negative'}><span>{t('paymentsAdmin.difference')}</span><strong>{session.difference == null ? '—' : money(locale, session.currency, session.difference)}</strong></div>
            </article>)}
          </div>
          {sessions.length === 0 && <p className="cash-empty">{t('paymentsAdmin.noClosings')}</p>}
        </div>
      </>}
    </section>
  )
}
