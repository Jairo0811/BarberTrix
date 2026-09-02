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
      if (!shopResponse.ok) {
        setError(t('customer.shopNotFound'))
        return
      }

      setShop(await shopResponse.json() as Shop)
      if (queueResponse.ok) setQueue(await queueResponse.json() as QueueDisplay)
      if (capabilitiesResponse.ok) setCapabilities(await capabilitiesResponse.json() as PublicCapabilities)
      setError('')
    }).catch(() => setError(t('customer.loadShopError')))
  }, [slug, t])

  if (!slug) return <main className="customer-portal empty-portal"><section>
    <h1>{t('customer.missingShopTitle')}</h1>
    <p>{t('customer.missingShopText')}</p>
    <a href="#/">{t('customer.back')}</a>
  </section></main>

  const appointmentsEnabled = capabilities?.canUseAppointments === true
  const shopName = shop?.name?.toUpperCase() || 'BARBERTURN'

  return <main className="customer-portal">
    <header className="customer-portal-header">
      <a href="#/"><img src="/branding/barberturn-logo.png" alt="BarberTurn" /></a>
      <span>{t('customer.portalTitle')}</span>
    </header>

    <section className="customer-hero">
      <div>
        <span>{t('customer.welcome', { shop: shopName })}</span>
        <h1>{appointmentsEnabled ? t('customer.hero.withAppointments') : t('customer.hero.queueOnly')}</h1>
        <p>{appointmentsEnabled ? t('customer.heroText.withAppointments') : t('customer.heroText.queueOnly')}</p>
      </div>
      <div className="customer-hero-actions">
        <a className="portal-primary-link" href={`#/book?shop=${encodeURIComponent(slug)}`}>{t('customer.takeTurn')}</a>
        {appointmentsEnabled && <a className="portal-secondary-link" href={`#/book?shop=${encodeURIComponent(slug)}`}>{t('customer.bookAppointment')}</a>}
      </div>
    </section>

    {error && <p className="portal-error" role="alert">{error}</p>}

    <section className="portal-kpis customer-kpis">
      <article><FontAwesomeIcon icon={faClock} /><div><strong>{queue?.estimatedWaitMinutes ?? '—'} min</strong><span>{t('customer.estimatedWait')}</span></div></article>
      <article><FontAwesomeIcon icon={faUserTie} /><div><strong>{shop?.barbers.length ?? '—'}</strong><span>{t('customer.availableBarbers')}</span></div></article>
      <article><FontAwesomeIcon icon={faScissors} /><div><strong>{shop?.services.length ?? '—'}</strong><span>{t('customer.availableServices')}</span></div></article>
    </section>

    <section className="customer-grid">
      <article className="portal-card">
        <p className="portal-kicker">{t('customer.servicesKicker')}</p>
        <h2>{t('customer.servicesTitle')}</h2>
        <div className="portal-list">
          {shop?.services.map(service => <article key={service.id}><div><strong>{service.name}</strong><span>{service.estimatedDurationMinutes} min</span></div><span>RD${service.price}</span></article>)}
          {!shop && <p>{t('customer.loadingServices')}</p>}
        </div>
      </article>

      <article className="portal-card">
        <p className="portal-kicker">{t('customer.barbersKicker')}</p>
        <h2>{t('customer.barbersTitle')}</h2>
        <div className="portal-list">
          {shop?.barbers.map(barber => <article key={barber.id}><div><strong>{barber.name}</strong><span>{t('customer.chair', { chair: barber.chairNumber })}</span></div><FontAwesomeIcon icon={faScissors} /></article>)}
          {!shop && <p>{t('customer.loadingBarbers')}</p>}
        </div>
      </article>
    </section>

    <section className="customer-cta portal-card">
      <FontAwesomeIcon icon={faCalendarCheck} />
      <div>
        <h2>{t('customer.ctaTitle')}</h2>
        <p>{appointmentsEnabled ? t('customer.cta.withAppointments') : t('customer.cta.queueOnly')}</p>
      </div>
      <a className="portal-primary-link" href={`#/book?shop=${encodeURIComponent(slug)}`}>{t('customer.continue')}</a>
    </section>
  </main>
}
