import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { confirmDestructive, showError, showSuccessToast } from '../../../alerts'
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

function money(currency: string, amount: number) {
  try {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function dateTime(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function methodLabel(method: string) {
  const labels: Record<string, string> = { Cash: 'Efectivo', Card: 'Tarjeta', Transfer: 'Transferencia', PayPal: 'PayPal', Other: 'Otro' }
  return labels[method] ?? method
}

function statusLabel(status: string) {
  const labels: Record<string, string> = { Paid: 'Pagado', Pending: 'Pendiente', Refunded: 'Reembolsado', Failed: 'Fallido' }
  return labels[status] ?? status
}

export default function PaymentsSection({ isDemo }: { isDemo: boolean }) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [current, setCurrent] = useState<CashSession | undefined>()
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [closeCounted, setCloseCounted] = useState('')

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
    catch (error) { await showError('No se pudo completar la operación', error instanceof Error ? error.message : 'Error inesperado') }
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
      void showSuccessToast('Caja abierta')
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
      void showSuccessToast('Pago registrado')
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
      void showSuccessToast('Movimiento registrado')
    })
  }

  async function submitClose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!current) return
    const form = event.currentTarget
    const data = new FormData(form)
    const confirmed = await confirmDestructive(
      '¿Cerrar la caja?',
      'El cierre quedará conciliado con el efectivo contado y no podrá seguir recibiendo movimientos.',
      'Cerrar caja',
    )
    if (!confirmed) return

    await run(async () => {
      await closeCashSession(Number(data.get('countedCash')), String(data.get('note') || '').trim() || undefined)
      form.reset()
      setCloseCounted('')
      await load()
      void showSuccessToast('Caja cerrada')
    })
  }

  async function refund(item: Payment) {
    const confirmed = await confirmDestructive(
      '¿Reembolsar este pago?',
      item.method === 'Cash'
        ? 'Se registrará automáticamente una salida de efectivo en la caja abierta.'
        : 'El pago cambiará a estado reembolsado.',
      'Reembolsar',
    )
    if (!confirmed) return

    await run(async () => {
      await refundPayment(item.id, 'Reembolso desde Caja 2.0')
      await load()
      void showSuccessToast('Pago reembolsado')
    })
  }

  return (
    <section className="panel dashboard-section cash-workspace" id="payments-section">
      <div className="cash-heading">
        <div>
          <p className="eyebrow">CAJA</p>
          <h2>Control y conciliación</h2>
          <p className="cash-subtitle">Administra el efectivo del turno, registra cobros y cierra con diferencia calculada.</p>
        </div>
        {current && <span className="cash-status open">Caja abierta · {current.currency}</span>}
      </div>

      {isDemo ? (
        <LockedFeature title="Caja y registro de pagos" text="La demo no expone operaciones financieras reales. Activa una cuenta para administrar la caja." />
      ) : loading ? (
        <p className="cash-empty">Cargando caja…</p>
      ) : <>
        {!current ? (
          <div className="cash-open-card">
            <div>
              <p className="eyebrow">INICIO DE TURNO</p>
              <h3>Abre la caja antes de operar</h3>
              <p>La moneda queda fija durante la sesión para mantener una conciliación consistente.</p>
            </div>
            <form className="cash-inline-form" onSubmit={submitOpen}>
              <label>Moneda<select name="currency" defaultValue="DOP"><option value="DOP">DOP</option><option value="USD">USD</option></select></label>
              <label>Fondo inicial<input name="openingBalance" type="number" min="0" step="0.01" defaultValue="0" required /></label>
              <button disabled={busy}>Abrir caja</button>
            </form>
          </div>
        ) : <>
          <div className="cash-kpis" aria-label="Resumen de caja">
            <article><span>Fondo inicial</span><strong>{money(current.currency, current.openingBalance)}</strong></article>
            <article><span>Ventas en efectivo</span><strong>{money(current.currency, current.cashSales)}</strong></article>
            <article><span>Entradas / salidas</span><strong>{money(current.currency, current.cashIn)} / {money(current.currency, current.cashOut)}</strong></article>
            <article className="primary"><span>Efectivo esperado</span><strong>{money(current.currency, current.expectedCash)}</strong></article>
            <article><span>Ventas no efectivo</span><strong>{money(current.currency, current.nonCashSales)}</strong></article>
          </div>

          <div className="cash-grid">
            <article className="cash-card">
              <p className="eyebrow">COBRO</p>
              <h3>Registrar pago</h3>
              <form className="cash-form" onSubmit={submitPayment}>
                <label>Monto<input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required /></label>
                <label>Método<select name="method" defaultValue="Cash"><option value="Cash">Efectivo</option><option value="Card">Tarjeta</option><option value="Transfer">Transferencia</option></select></label>
                <label>Referencia<input name="externalReference" placeholder="Opcional" maxLength={180} /></label>
                <button disabled={busy}>Registrar pago</button>
              </form>
            </article>

            <article className="cash-card">
              <p className="eyebrow">MOVIMIENTOS</p>
              <h3>Entrada o salida manual</h3>
              <form className="cash-form" onSubmit={submitMovement}>
                <label>Tipo<select name="type" defaultValue="CashOut"><option value="CashOut">Salida</option><option value="CashIn">Entrada</option></select></label>
                <label>Monto<input name="amount" type="number" min="0.01" step="0.01" required /></label>
                <label>Motivo<input name="reason" placeholder="Ej. compra de insumos" maxLength={200} required /></label>
                <button disabled={busy}>Guardar movimiento</button>
              </form>
            </article>

            <article className="cash-card close-card">
              <p className="eyebrow">CIERRE</p>
              <h3>Conciliar caja</h3>
              <form className="cash-form" onSubmit={submitClose}>
                <label>Efectivo contado<input name="countedCash" type="number" min="0" step="0.01" value={closeCounted} onChange={event => setCloseCounted(event.target.value)} required /></label>
                <label>Nota<textarea name="note" rows={2} maxLength={500} placeholder="Opcional" /></label>
                <div className={`cash-difference ${countedDifference === null ? '' : countedDifference === 0 ? 'ok' : 'warning'}`}>
                  <span>Diferencia</span>
                  <strong>{countedDifference === null ? '—' : money(current.currency, countedDifference)}</strong>
                </div>
                <button className="danger" disabled={busy}>Cerrar caja</button>
              </form>
            </article>
          </div>

          <div className="cash-movement-list">
            <div className="cash-section-title"><div><p className="eyebrow">TRAZABILIDAD</p><h3>Movimientos de esta sesión</h3></div><span>{current.movements.length}</span></div>
            {current.movements.length === 0 ? <p className="cash-empty">No hay entradas o salidas manuales todavía.</p> : current.movements.slice().reverse().map(item => (
              <article key={item.id}>
                <div><strong>{item.type === 'CashIn' ? 'Entrada' : 'Salida'}</strong><span>{item.reason}</span></div>
                <div className={item.type === 'CashIn' ? 'positive' : 'negative'}>{item.type === 'CashIn' ? '+' : '−'}{money(current.currency, item.amount)}</div>
              </article>
            ))}
          </div>
        </>}

        <div className="cash-history">
          <div className="cash-section-title"><div><p className="eyebrow">PAGOS</p><h3>Últimos 30 días</h3></div><span>{payments.length}</span></div>
          <div className="cash-table-wrap">
            <table className="cash-table">
              <thead><tr><th>Fecha</th><th>Monto</th><th>Método</th><th>Estado</th><th>Referencia</th><th></th></tr></thead>
              <tbody>
                {payments.slice(0, 30).map(item => <tr key={item.id}>
                  <td>{dateTime(item.paidAtUtc)}</td>
                  <td><strong>{money(item.currency, item.amount)}</strong></td>
                  <td>{methodLabel(item.method)}</td>
                  <td><span className={`payment-state ${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span></td>
                  <td>{item.externalReference || '—'}</td>
                  <td>{item.status === 'Paid' && <button className="cash-link danger-text" disabled={busy} onClick={() => void refund(item)}>Reembolsar</button>}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {payments.length === 0 && <p className="cash-empty">No hay pagos registrados en los últimos 30 días.</p>}
        </div>

        <div className="cash-session-history">
          <div className="cash-section-title"><div><p className="eyebrow">CIERRES</p><h3>Sesiones recientes</h3></div><span>{sessions.length}</span></div>
          <div className="cash-session-grid">
            {sessions.map(session => <article key={session.id}>
              <div><strong>{dateTime(session.openedAtUtc)}</strong><span>{session.closedAtUtc ? `Cerrada ${dateTime(session.closedAtUtc)}` : 'En curso'}</span></div>
              <div><span>Esperado</span><strong>{money(session.currency, session.expectedCash)}</strong></div>
              <div><span>Contado</span><strong>{session.countedCash == null ? '—' : money(session.currency, session.countedCash)}</strong></div>
              <div className={session.difference === 0 ? 'positive' : session.difference == null ? '' : 'negative'}><span>Diferencia</span><strong>{session.difference == null ? '—' : money(session.currency, session.difference)}</strong></div>
            </article>)}
          </div>
          {sessions.length === 0 && <p className="cash-empty">Todavía no hay cierres de caja.</p>}
        </div>
      </>}
    </section>
  )
}
