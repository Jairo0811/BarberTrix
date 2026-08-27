import { FormEvent, useCallback, useEffect, useState } from 'react'
import { api } from '../../../api'
import { showError, showSuccessToast } from '../../../alerts'
import LockedFeature from '../../../shared/components/LockedFeature'
import type { Customer } from '../../../portals/admin/commercialTypes'

export default function CustomersSection({ isDemo }: { isDemo: boolean }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    if (isDemo) { setCustomers([]); return }
    setCustomers(await api<Customer[]>('/api/customers?take=100'))
  }, [isDemo])
  useEffect(() => { void load().catch(() => undefined) }, [load])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true)
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())
    try { await api('/api/customers', { method: 'POST', body: JSON.stringify(data) }); form.reset(); await load(); void showSuccessToast('Cliente agregado') }
    catch (error) { await showError('No se pudo completar la operación', error instanceof Error ? error.message : 'Error inesperado') }
    finally { setBusy(false) }
  }

  return (
    <section className="panel dashboard-section" id="customers-section">
      <p className="eyebrow">CLIENTES</p><h2>Directorio</h2>
      {isDemo ? <LockedFeature title="CRM de clientes" text="El historial real, datos de contacto y seguimiento de clientes están reservados para cuentas activas." /> : <><form className="business-form" onSubmit={submit}><input name="name" placeholder="Nombre" required /><input name="phone" placeholder="Teléfono" /><input name="email" type="email" placeholder="Correo" /><button disabled={busy}>Agregar</button></form><div className="business-list compact">{customers.map(item => <article key={item.id}><strong>{item.name}</strong><span>{item.phone || item.email || 'Sin contacto'}</span></article>)}</div></>}
    </section>
  )
}
