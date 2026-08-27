import { useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarCheck, faClock, faScissors, faUserTie } from '@fortawesome/free-solid-svg-icons'
import { API_URL } from './api'
import { useI18n } from './i18n'
import './role-portals.css'

type Service = { id: string; name: string; price: number; estimatedDurationMinutes: number }
type Barber = { id: string; name: string; chairNumber: number }
type Shop = { name: string; slug: string; services: Service[]; barbers: Barber[] }
type QueueDisplay = { estimatedWaitMinutes: number; turns: Array<{ ticketNumber: string; status: string }> }
type PublicCapabilities = { canUseAppointments: boolean; canUseTv: boolean }

function queryValue(name: string) {
  return new URLSearchParams((location.hash.split('?')[1] ?? '')).get(name) ?? ''
}

export default function CustomerPortalPage() {
  const { t } = useI18n()
  const slug = useMemo(() => queryValue('shop'), [])
  const [shop, setShop] = useState<Shop | null>(null)
  const [queue, setQueue] = useState<QueueDisplay | null>(null)
  const [capabilities, setCapabilities] = useState<PublicCapabilities | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) return
    void Promise.all([
      fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}`),
      fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/queue`),
      fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/capabilities`),
    ]).then(async ([shopResponse, queueResponse, capabilitiesResponse]) => {
      if (!shopResponse.ok) throw new Error('No encontramos esta barbería.')
      setShop(await shopResponse.json() as Shop)
      if (queueResponse.ok) setQueue(await queueResponse.json() as QueueDisplay)
      if (capabilitiesResponse.ok) setCapabilities(await capabilitiesResponse.json() as PublicCapabilities)
    }).catch(exception => setError(exception instanceof Error ? exception.message : 'No se pudo cargar la barbería.'))
  }, [slug])

  if (!slug) return <main className="customer-portal empty-portal"><section><h1>Falta identificar la barbería</h1><p>Abre el enlace compartido por tu barbería o escanea su código QR.</p><a href="#/">Volver a BarberTurn</a></section></main>

  const appointmentsEnabled = capabilities?.canUseAppointments === true

  return <main className="customer-portal">
    <header className="customer-portal-header">
      <a href="#/"><img src="/branding/barberturn-logo.png" alt="BarberTurn" /></a>
      <span>{t('customer.portalTitle')}</span>
    </header>

    <section className="customer-hero">
      <div><span>BIENVENIDO A {shop?.name?.toUpperCase() || 'BARBERTURN'}</span><h1>{appointmentsEnabled ? 'Tu turno, tu cita y tu barbería en un solo lugar.' : 'Tu turno y tu barbería en un solo lugar.'}</h1><p>{appointmentsEnabled ? 'No necesitas crear una cuenta para tomar un turno o reservar una cita.' : 'No necesitas crear una cuenta para tomar un turno.'}</p></div>
      <div className="customer-hero-actions"><a className="portal-primary-link" href={`#/book?shop=${encodeURIComponent(slug)}`}>{t('customer.takeTurn')}</a>{appointmentsEnabled && <a className="portal-secondary-link" href={`#/book?shop=${encodeURIComponent(slug)}`}>{t('customer.bookAppointment')}</a>}</div>
    </section>

    {error && <p className="portal-error" role="alert">{error}</p>}

    <section className="portal-kpis customer-kpis">
      <article><FontAwesomeIcon icon={faClock} /><div><strong>{queue?.estimatedWaitMinutes ?? '—'} min</strong><span>Espera estimada</span></div></article>
      <article><FontAwesomeIcon icon={faUserTie} /><div><strong>{shop?.barbers.length ?? '—'}</strong><span>Barberos disponibles en el catálogo</span></div></article>
      <article><FontAwesomeIcon icon={faScissors} /><div><strong>{shop?.services.length ?? '—'}</strong><span>Servicios disponibles</span></div></article>
    </section>

    <section className="customer-grid">
      <article className="portal-card">
        <p className="portal-kicker">SERVICIOS</p><h2>Elige cómo quieres verte hoy</h2>
        <div className="portal-list">{shop?.services.map(service => <article key={service.id}><div><strong>{service.name}</strong><span>{service.estimatedDurationMinutes} min</span></div><span>RD${service.price}</span></article>)}{!shop && <p>Cargando servicios…</p>}</div>
      </article>

      <article className="portal-card">
        <p className="portal-kicker">BARBEROS</p><h2>Tu barbero o el próximo disponible</h2>
        <div className="portal-list">{shop?.barbers.map(barber => <article key={barber.id}><div><strong>{barber.name}</strong><span>Silla {barber.chairNumber}</span></div><FontAwesomeIcon icon={faScissors} /></article>)}{!shop && <p>Cargando barberos…</p>}</div>
      </article>
    </section>

    <section className="customer-cta portal-card">
      <FontAwesomeIcon icon={faCalendarCheck} />
      <div><h2>¿Ya sabes lo que necesitas?</h2><p>{appointmentsEnabled ? 'Entra al autoservicio para tomar un turno ahora o consultar horarios para una cita.' : 'Entra al autoservicio y toma tu turno ahora.'}</p></div>
      <a className="portal-primary-link" href={`#/book?shop=${encodeURIComponent(slug)}`}>Continuar</a>
    </section>
  </main>
}
