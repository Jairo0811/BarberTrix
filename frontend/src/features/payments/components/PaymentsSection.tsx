import { FormEvent, useCallback, useEffect, useState } from 'react'
import { api } from '../../../api'
import { showError, showSuccessToast } from '../../../alerts'
import LockedFeature from '../../../shared/components/LockedFeature'
import type { Payment } from '../../../portals/admin/commercialTypes'

export default function PaymentsSection({ isDemo }: { isDemo: boolean }) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    if (isDemo) { setPayments([]); return }
    const now = new Date()
    const future = new Date(now.getTime() + 30 * 86400000)
    const from = new Date(now.getTime() - 30 * 86400000)
    setPayments(await api<Payment[]>(`/api/payments?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(future.toISOString())}`))
  }, [isDemo])
  useEffect(() => { void load().catch(() => undefined) }, [load])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true)
    const form = event.currentTarget
    const data: Record<string, FormDataEntryValue | number> = Object.fromEntries(new FormData(form).entries())
    data.amount = Number(data.amount)
    try { await api('/api/payments', { method: 'POST', body: JSON.stringify(data) }); form.reset(); await load(); void showSuccessToast('Pago registrado') }
    catch (error) { await showError('No se pudo completar la operación', error instanceof Error ? error.message : 'Error inesperado') }
    finally { setBusy(false) }
  }

  return (
    <section className="panel dashboard-section" id="payments-section">
      <p className="eyebrow">CAJA</p><h2>Pagos del negocio</h2>
      {isDemo ? <LockedFeature title="Caja y registro de pagos" text="La demo no expone operaciones financieras reales. Activa una cuenta para administrar la caja." /> : <><form className="business-form" onSubmit={submit}><input name="amount" type="number" min="0.01" step="0.01" placeholder="Monto" required /><select name="currency" defaultValue="DOP"><option>DOP</option><option>USD</option></select><select name="method"><option>Cash</option><option>Card</option><option>Transfer</option><option>Other</option></select><button disabled={busy}>Registrar</button></form><div className="business-list compact">{payments.slice(0, 10).map(item => <article key={item.id}><strong>{item.currency} {item.amount.toFixed(2)}</strong><span>{item.method} · {item.status}</span></article>)}</div></>}
    </section>
  )
}
