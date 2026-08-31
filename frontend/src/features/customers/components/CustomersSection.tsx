import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { showError, showSuccessToast } from '../../../alerts'
import LockedFeature from '../../../shared/components/LockedFeature'
import type { Customer, CustomerProfile } from '../../../portals/admin/commercialTypes'
import {
  createCustomer,
  getCustomerProfile,
  listCustomers,
  updateCustomer,
  updateCustomerNotes,
} from '../api/customersApi'
import '../customers.css'

function formatDate(value?: string | null) {
  if (!value) return 'Sin visitas completadas'
  return new Intl.DateTimeFormat('es-DO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

function formatAppointment(value: string) {
  return new Intl.DateTimeFormat('es-DO', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    Confirmed: 'Confirmada', CheckedIn: 'En espera', Completed: 'Completada',
    Cancelled: 'Cancelada', NoShow: 'No llegó',
  }
  return labels[status] ?? status
}

function spendLabel(values: Record<string, number>) {
  const entries = Object.entries(values)
  if (!entries.length) return 'Sin pagos vinculados'
  return entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, amount]) => `${currency} ${new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`)
    .join(' · ')
}

export default function CustomersSection({ isDemo }: { isDemo: boolean }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const loadCustomers = useCallback(async () => {
    if (isDemo) { setCustomers([]); return }
    setCustomers(await listCustomers())
  }, [isDemo])

  const loadProfile = useCallback(async (customerId: string) => {
    setProfileLoading(true)
    try {
      const next = await getCustomerProfile(customerId)
      setProfile(next)
      setNotes(next.notes ?? '')
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => { void loadCustomers().catch(() => undefined) }, [loadCustomers])
  useEffect(() => {
    if (!selectedId || isDemo) { setProfile(null); return }
    void loadProfile(selectedId).catch(() => setProfile(null))
  }, [isDemo, loadProfile, selectedId])

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return customers

    return customers.filter(customer =>
      [customer.name, customer.phone, customer.email]
        .filter(Boolean)
        .some(value => value!.toLocaleLowerCase().includes(normalizedQuery)),
    )
  }, [customers, query])

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setBusy(true)
    try {
      const customer = await createCustomer({
        name: String(data.get('name') ?? '').trim(),
        phone: String(data.get('phone') ?? '').trim() || undefined,
        email: String(data.get('email') ?? '').trim() || undefined,
      })
      form.reset()
      await loadCustomers()
      setSelectedId(customer.id)
      void showSuccessToast('Cliente agregado')
    } catch (error) {
      await showError('No se pudo agregar el cliente', error instanceof Error ? error.message : 'Error inesperado')
    } finally { setBusy(false) }
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    const data = new FormData(event.currentTarget)
    setBusy(true)
    try {
      await updateCustomer(profile.customer.id, {
        name: String(data.get('name') ?? '').trim(),
        phone: String(data.get('phone') ?? '').trim() || undefined,
        email: String(data.get('email') ?? '').trim() || undefined,
      })
      await Promise.all([loadCustomers(), loadProfile(profile.customer.id)])
      setEditing(false)
      void showSuccessToast('Cliente actualizado')
    } catch (error) {
      await showError('No se pudo actualizar el cliente', error instanceof Error ? error.message : 'Error inesperado')
    } finally { setBusy(false) }
  }

  async function saveNotes() {
    if (!profile) return
    setBusy(true)
    try {
      await updateCustomerNotes(profile.customer.id, notes.trim())
      await loadProfile(profile.customer.id)
      void showSuccessToast('Notas guardadas')
    } catch (error) {
      await showError('No se pudieron guardar las notas', error instanceof Error ? error.message : 'Error inesperado')
    } finally { setBusy(false) }
  }

  return (
    <section className="panel dashboard-section customer-crm" id="customers-section">
      <div className="customer-crm-header">
        <div>
          <p className="eyebrow">CLIENTES</p>
          <h2>CRM de clientes</h2>
          <p>Contacto, visitas, gasto e información útil para atender mejor a cada cliente.</p>
        </div>
      </div>

      {isDemo ? <LockedFeature title="CRM de clientes" text="El historial real, datos de contacto y seguimiento de clientes están reservados para cuentas activas." /> : <>
        <section className="customer-create-card">
          <strong>Nuevo cliente</strong>
          <form className="business-form" onSubmit={create}>
            <input name="name" placeholder="Nombre" required />
            <input name="phone" placeholder="Teléfono" inputMode="tel" />
            <input name="email" type="email" placeholder="Correo" />
            <button disabled={busy}>Agregar</button>
          </form>
        </section>

        <div className="customer-crm-layout">
          <section className="customer-directory" aria-label="Directorio de clientes">
            <div className="business-toolbar">
              <input
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Buscar por nombre, teléfono o correo"
                aria-label="Buscar clientes"
              />
              <span>{filteredCustomers.length} de {customers.length}</span>
            </div>

            <div className="customer-list">
              {filteredCustomers.map(item => <button
                type="button"
                key={item.id}
                className={`customer-list-button${selectedId === item.id ? ' active' : ''}`}
                onClick={() => { setEditing(false); setSelectedId(item.id) }}
              >
                <strong>{item.name}</strong>
                <span>{item.phone || item.email || 'Sin contacto'}</span>
                {item.phone && item.email && <small>{item.email}</small>}
              </button>)}
              {filteredCustomers.length === 0 && <p>{customers.length === 0 ? 'Todavía no hay clientes registrados.' : 'No encontramos clientes con ese criterio.'}</p>}
            </div>
          </section>

          <section className="customer-profile" aria-live="polite">
            {!selectedId && <div className="customer-profile-empty"><div><strong>Selecciona un cliente</strong><p>Abre una ficha para consultar métricas, historial y notas internas.</p></div></div>}
            {selectedId && profileLoading && !profile && <div className="customer-profile-empty"><strong>Cargando ficha…</strong></div>}

            {profile && <>
              <div className="customer-profile-heading">
                <div>
                  <p className="eyebrow">FICHA DEL CLIENTE</p>
                  <h3>{profile.customer.name}</h3>
                  <div className="customer-meta">{profile.customer.phone || 'Sin teléfono'} · {profile.customer.email || 'Sin correo'}</div>
                </div>
                <div className="customer-profile-actions">
                  <button type="button" className="secondary-link" onClick={() => setEditing(value => !value)}>{editing ? 'Cerrar edición' : 'Editar datos'}</button>
                </div>
              </div>

              <div className="customer-metrics">
                <article className="customer-metric"><span>Visitas completadas</span><strong>{profile.completedVisits}</strong></article>
                <article className="customer-metric"><span>Última visita</span><strong>{formatDate(profile.lastVisitAtUtc)}</strong></article>
                <article className="customer-metric"><span>Gasto acumulado</span><strong>{spendLabel(profile.lifetimeSpendByCurrency)}</strong></article>
              </div>

              {editing && <section className="customer-edit-card">
                <strong>Editar contacto</strong>
                <form className="business-form" onSubmit={saveCustomer}>
                  <input name="name" defaultValue={profile.customer.name} placeholder="Nombre" required />
                  <input name="phone" defaultValue={profile.customer.phone ?? ''} placeholder="Teléfono" inputMode="tel" />
                  <input name="email" defaultValue={profile.customer.email ?? ''} type="email" placeholder="Correo" />
                  <button disabled={busy}>Guardar cambios</button>
                </form>
              </section>}

              <section className="customer-note-card">
                <strong>Notas internas</strong>
                <p className="customer-meta">Preferencias, indicaciones o contexto útil para futuras visitas. Máximo 1,000 caracteres.</p>
                <textarea value={notes} maxLength={1000} onChange={event => setNotes(event.target.value)} placeholder="Ej.: prefiere degradado bajo y cita con Carlos…" />
                <button type="button" disabled={busy || notes === (profile.notes ?? '')} onClick={() => void saveNotes()}>Guardar notas</button>
              </section>

              <section className="customer-history-card">
                <strong>Actividad reciente</strong>
                <div className="customer-history-list">
                  {profile.recentAppointments.map(item => <article className="customer-appointment-card" key={item.id}>
                    <div><strong>{item.serviceName}</strong><small>{formatAppointment(item.startsAtUtc)} · {item.barberName}</small></div>
                    <span className="customer-status">{statusLabel(item.status)}</span>
                  </article>)}
                  {!profile.recentAppointments.length && <p className="customer-meta">Este cliente todavía no tiene citas vinculadas a su perfil.</p>}
                </div>
              </section>
            </>}
          </section>
        </div>
      </>}
    </section>
  )
}
