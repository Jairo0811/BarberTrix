import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBolt, faClock, faFlask, faListOl, faPlus, faRotate, faScissors, faShieldHalved, faUserTie } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from '../../../i18n'
import { turnStatusLabel } from '../../../i18n/domainLabels'
import type { Auth, Barber, Service, Turn } from '../../../types'
import type { AdminPageId } from '../../../portals/admin/adminRoutes'

type DashboardCopy = Record<string, string>

type Props = {
  auth: Auth
  isDemo: boolean
  canManageCatalog: boolean
  copy: DashboardCopy
  today: string
  barbers: Barber[]
  services: Service[]
  turns: Turn[]
  overview: { waiting: number; inService: number; completed: number; availableBarbers: number }
  loading: boolean
  error: string
  onRefresh: () => void
  onNavigate: (page: AdminPageId) => void
  formatRole: (role: string) => string
}

export default function DashboardOverviewSection({ auth, isDemo, canManageCatalog, copy: c, today, barbers, services, turns, overview, loading, error, onRefresh, onNavigate, formatRole }: Props) {
  const { t } = useI18n()
  const queuePreview = turns.slice(0, 4)
  const activeServices = services.filter(service => service.isActive).length
  const activeBarbers = barbers.filter(barber => barber.isActive).length

  return (
    <section className="dashboard-section dashboard-overview-section" id="dashboard-overview">
      <div className="dashboard-heading">
        <div><span className="dashboard-heading-kicker">{isDemo ? c.demoExperience : c.dailyOperation}</span><h1>{isDemo ? c.demoPanel : c.adminTitle}</h1><p>{isDemo ? c.demoSubtitle : c.adminSubtitle}</p></div>
        <span className="dashboard-date">{today}</span>
      </div>

      {isDemo ? (
        <div className="dashboard-context-banner demo-banner"><span className="context-banner-icon"><FontAwesomeIcon icon={faFlask} /></span><div><strong>{c.demoBannerTitle}</strong><span>{c.demoBannerText}</span></div><span className="demo-pill">{c.testEnvironment}</span></div>
      ) : canManageCatalog ? (
        <div className="dashboard-context-banner admin-banner"><span className="context-banner-icon"><FontAwesomeIcon icon={faShieldHalved} /></span><div><strong>{c.adminBannerTitle}</strong><span>{c.adminBannerText}</span></div><span className="admin-pill">{formatRole(auth.role).toUpperCase()}</span></div>
      ) : null}

      {error && <p className="error banner" role="alert">{error}</p>}

      <div className={`dashboard-kpis${loading ? ' is-loading' : ''}`} aria-busy={loading}>
        <article className="dashboard-kpi"><span className="kpi-icon"><FontAwesomeIcon icon={faClock} /></span><div><strong>{loading ? '—' : overview.waiting}</strong><span>{c.waitingTurns}</span><small>{loading ? c.loadingOperation : c.queuePending}</small></div></article>
        <article className="dashboard-kpi"><span className="kpi-icon"><FontAwesomeIcon icon={faScissors} /></span><div><strong>{loading ? '—' : overview.inService}</strong><span>{c.inService}</span><small>{loading ? c.loadingOperation : c.activeAttention}</small></div></article>
        <article className="dashboard-kpi"><span className="kpi-icon"><FontAwesomeIcon icon={faUserTie} /></span><div><strong>{loading ? '—' : overview.availableBarbers}</strong><span>{c.availableBarbers}</span><small>{loading ? c.loadingTeam : `${activeBarbers} ${c.activeTeam}`}</small></div></article>
        <article className="dashboard-kpi"><span className="kpi-icon"><FontAwesomeIcon icon={faListOl} /></span><div><strong>{loading ? '—' : activeServices}</strong><span>{c.activeServices}</span><small>{loading ? c.loadingCatalog : c.availableCatalog}</small></div></article>
      </div>

      <div className="dashboard-overview-grid">
        <article className="dashboard-card">
          <div className="dashboard-card-header"><div><h2>{c.queueSummary}</h2><p>{c.recentTurns}</p></div><button className="secondary" type="button" disabled={loading} onClick={onRefresh}><FontAwesomeIcon icon={faRotate} /> {c.refresh}</button></div>
          <div className="queue-summary">
            {queuePreview.length === 0 && !loading && !error && <p className="empty">{c.noActiveTurns}</p>}
            {loading && <p className="empty">{c.loadingTurns}</p>}
            {queuePreview.map(turn => <div className="queue-summary-item" key={turn.id}><span className="queue-summary-ticket">{turn.ticketNumber}</span><div className="queue-summary-copy"><strong>{turn.customerName || c.unnamedCustomer}</strong><span>{turn.serviceName}{turn.barberName ? ` · ${turn.barberName}` : ''}</span></div><span className="queue-summary-status">{turnStatusLabel(t, turn.status)}</span></div>)}
          </div>
        </article>

        <article className="dashboard-card dashboard-actions-card">
          <div className="dashboard-card-header"><div><h2><FontAwesomeIcon icon={faBolt} /> {c.quickActions}</h2><p>{c.frequentActions}</p></div></div>
          <div className="quick-actions">
            <button type="button" onClick={() => onNavigate('queue')}><span className="quick-icon"><FontAwesomeIcon icon={faPlus} /></span>{c.createTurn}</button>
            <button type="button" onClick={() => onNavigate('barbers')}><span className="quick-icon"><FontAwesomeIcon icon={faUserTie} /></span>{c.manageBarbers}</button>
            {canManageCatalog && <button type="button" onClick={() => onNavigate('services')}><span className="quick-icon"><FontAwesomeIcon icon={faScissors} /></span>{c.manageServices}</button>}
            <button type="button" disabled={loading} onClick={onRefresh}><span className="quick-icon"><FontAwesomeIcon icon={faRotate} /></span>{c.refreshOperation}</button>
          </div>
        </article>
      </div>
    </section>
  )
}
