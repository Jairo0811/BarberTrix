import { FormEvent, useCallback, useEffect, useState } from 'react'
import type { Auth } from './types'
import { api } from './api'
import { showError, showSuccessToast } from './alerts'
import './business-modules.css'

type Customer = { id: string; name: string; phone?: string; email?: string }
type Appointment = { id: string; serviceName: string; barberName: string; startsAtUtc: string; customerName: string; status: string }
type Report = { completedTurns: number; cancelledTurns: number; noShows: number; appointments: number; grossRevenue: number }
type TeamMember = { id: string; name: string; email: string; role: string; isActive: boolean }
type Subscription = { plan: string; status: string; provider: string; periodEndsAtUtc?: string; cancelAtPeriodEnd: boolean }
type Usage = { activeBarbers: number; barberLimit: number; activeLocations: number; locationLimit: number; canUseAppointments: boolean; canUseTv: boolean; canUseAdvancedReports: boolean }
type Shop = { name: string; slug: string; timeZoneId: string }
type Location = { id: string; name: string; slug: string; address?: string; timeZoneId: string; isActive: boolean }
type Payment = { id: string; amount: number; currency: string; method: string; status: string; paidAtUtc?: string }
type BarberOption = { id: string; name: string; isActive: boolean }

export default function BusinessModules({ auth }: { auth: Auth }) {
  const elevated = auth.role === 'Owner' || auth.role === 'Administrator'
  const [customers, setCustomers] = useState<Customer[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [barbers, setBarbers] = useState<BarberOption[]>([])
  const [report, setReport] = useState<Report | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [shop, setShop] = useState<Shop | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const now = new Date()
    const future = new Date(now.getTime() + 30 * 86400000)
    const end = now.toISOString().slice(0, 10)
    const startDate = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
    const base = await Promise.all([
      api<Customer[]>('/api/customers?take=100'),
      api<Appointment[]>(`/api/appointments?from=${encodeURIComponent(now.toISOString())}&to=${encodeURIComponent(future.toISOString())}`),
      api<Shop>('/api/shop/settings'),
      api<BarberOption[]>('/api/queue/barbers'),
      api<Location[]>('/api/locations'),
    ])
    setCustomers(base[0]); setAppointments(base[1]); setShop(base[2]); setBarbers(base[3]); setLocations(base[4])
    if (elevated) {
      const [nextTeam, nextReport, nextSubscription, nextUsage, nextPayments] = await Promise.all([
        api<TeamMember[]>('/api/team'), api<Report>(`/api/reports/business?from=${startDate}&to=${end}`),
        api<Subscription>('/api/billing/subscription'), api<Usage>('/api/billing/usage'),
        api<Payment[]>(`/api/payments?from=${encodeURIComponent(new Date(now.getTime() - 30 * 86400000).toISOString())}&to=${encodeURIComponent(future.toISOString())}`),
      ])
      setTeam(nextTeam); setReport(nextReport); setSubscription(nextSubscription); setUsage(nextUsage); setPayments(nextPayments)
    }
  }, [elevated])

  useEffect(() => { void load().catch(() => undefined) }, [load])

  async function submit(event: FormEvent<HTMLFormElement>, path: string, success: string) {
    event.preventDefault(); setBusy(true)
    const form = event.currentTarget; const data: Record<string, FormDataEntryValue | number | null> = Object.fromEntries(new FormData(form).entries())
    if (path === '/api/payments') data.amount = Number(data.amount)
    if (path === '/api/team/invitations' && !data.barberId) data.barberId = null
    try { await api(path, { method: 'POST', body: JSON.stringify(data) }); form.reset(); await load(); void showSuccessToast(success) }
    catch (error) { await showError('No se pudo completar la operación', error instanceof Error ? error.message : 'Error inesperado') }
    finally { setBusy(false) }
  }

  async function checkout(plan: string) {
    setBusy(true)
    try {
      const response = await api<{ approvalUrl: string }>('/api/billing/checkout', { method: 'POST', body: JSON.stringify({ plan, returnUrl: `${location.origin}/#/billing-success`, cancelUrl: `${location.origin}/#/login` }) })
      location.href = response.approvalUrl
    } catch (error) { await showError('No se pudo iniciar PayPal', error instanceof Error ? error.message : 'Error inesperado') }
    finally { setBusy(false) }
  }

  return (
    <>
      <section className="panel dashboard-section" id="appointments-section">
        <div className="panel-heading"><div><p className="eyebrow">AGENDA HÍBRIDA</p><h2>Próximas citas</h2></div>{shop && <a className="secondary-link" href={`#/book?shop=${shop.slug}`}>Página pública de reservas</a>}</div>
        <div className="business-list">{appointments.length ? appointments.map(item => <article key={item.id}><strong>{item.customerName}</strong><span>{item.serviceName} · {item.barberName}</span><small>{new Date(item.startsAtUtc).toLocaleString()} · {item.status}</small></article>) : <p>No hay citas próximas.</p>}</div>
      </section>

      <section className="panel dashboard-section" id="customers-section">
        <p className="eyebrow">CLIENTES</p><h2>Directorio</h2>
        <form className="business-form" onSubmit={event => void submit(event, '/api/customers', 'Cliente agregado')}><input name="name" placeholder="Nombre" required /><input name="phone" placeholder="Teléfono" /><input name="email" type="email" placeholder="Correo" /><button disabled={busy}>Agregar</button></form>
        <div className="business-list compact">{customers.map(item => <article key={item.id}><strong>{item.name}</strong><span>{item.phone || item.email || 'Sin contacto'}</span></article>)}</div>
      </section>

      {elevated && <section className="panel dashboard-section" id="payments-section">
        <p className="eyebrow">CAJA</p><h2>Pagos</h2>
        <form className="business-form" onSubmit={event => void submit(event, '/api/payments', 'Pago registrado')}><input name="amount" type="number" min="0.01" step="0.01" placeholder="Monto" required /><select name="currency" defaultValue="DOP"><option>DOP</option><option>USD</option></select><select name="method"><option>Cash</option><option>Card</option><option>Transfer</option><option>Other</option></select><button disabled={busy}>Registrar</button></form>
        <div className="business-list compact">{payments.slice(0, 10).map(item => <article key={item.id}><strong>{item.currency} {item.amount.toFixed(2)}</strong><span>{item.method} · {item.status}</span></article>)}</div>
      </section>}

      {elevated && <section className="panel dashboard-section" id="reports-section">
        <p className="eyebrow">REPORTES</p><h2>Últimos 30 días</h2>
        <div className="business-metrics"><span><strong>{report?.completedTurns ?? 0}</strong> turnos completados</span><span><strong>{report?.appointments ?? 0}</strong> citas</span><span><strong>{report?.noShows ?? 0}</strong> no presentados</span><span><strong>RD${(report?.grossRevenue ?? 0).toFixed(2)}</strong> ingresos</span></div>
      </section>}

      {elevated && <section className="panel dashboard-section" id="team-section">
        <p className="eyebrow">EQUIPO Y PERMISOS</p><h2>Usuarios</h2>
        <form className="business-form" onSubmit={event => void submit(event, '/api/team/invitations', 'Invitación creada')}><input name="name" placeholder="Nombre" required /><input name="email" type="email" placeholder="Correo" required /><select name="role"><option>Administrator</option><option>Receptionist</option><option>Barber</option></select><select name="barberId" defaultValue=""><option value="">Sin vínculo de barbero</option>{barbers.filter(x => x.isActive).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select><button disabled={busy}>Invitar</button></form>
        <div className="business-list compact">{team.map(item => <article key={item.id}><strong>{item.name}</strong><span>{item.role} · {item.isActive ? 'Activo' : 'Inactivo'}</span></article>)}</div>
      </section>}

      {auth.role === 'Owner' && <section className="panel dashboard-section" id="locations-section">
        <p className="eyebrow">SUCURSALES</p><h2>Ubicaciones</h2>
        <form className="business-form" onSubmit={event => void submit(event, '/api/locations', 'Sucursal agregada')}><input name="name" placeholder="Nombre" required /><input name="slug" placeholder="Identificador (ej. centro)" pattern="[a-z0-9-]+" required /><input name="address" placeholder="Dirección" /><input name="timeZoneId" defaultValue={shop?.timeZoneId ?? Intl.DateTimeFormat().resolvedOptions().timeZone} required /><button disabled={busy}>Agregar</button></form>
        <div className="business-list compact">{locations.map(item => <article key={item.id}><strong>{item.name}</strong><span>{item.address || item.slug} · {item.timeZoneId}</span></article>)}</div>
      </section>}

      {auth.role === 'Owner' && <section className="panel dashboard-section" id="billing-section">
        <p className="eyebrow">SUSCRIPCIÓN</p><h2>{subscription?.plan ?? 'Pro'} · {subscription?.status ?? 'Trialing'}</h2>
        <p>{usage ? `${usage.activeBarbers} de ${usage.barberLimit > 1000 ? 'ilimitados' : usage.barberLimit} barberos activos` : 'Cargando uso…'}</p>
        {usage && <p>{usage.activeLocations} de {usage.locationLimit} sucursales activas</p>}
        <div className="billing-actions"><button disabled={busy} onClick={() => void checkout('Starter')}>Starter · US$20</button><button disabled={busy} onClick={() => void checkout('Pro')}>Pro · US$40</button><button disabled={busy} onClick={() => void checkout('Business')}>Business · US$70</button>{shop && usage?.canUseTv && <a href={`#/tv?shop=${shop.slug}`}>Abrir BarberTurn TV</a>}</div>
      </section>}
    </>
  )
}
