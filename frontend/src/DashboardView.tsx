import { useEffect, useMemo } from 'react'
import {
  faBuilding,
  faCalendarCheck,
  faCashRegister,
  faChartColumn,
  faCreditCard,
  faHouse,
  faListOl,
  faScissors,
  faUserGroup,
  faUserTie,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import type { Auth } from './types'
import { useI18n } from './i18n'
import { getHomeAuxCopy } from './i18n/homeAuxCopy'
import './dashboard.css'
import BusinessModules from './BusinessModules'
import AdminDashboardLayout, { type DashboardNavItem } from './portals/admin/components/AdminDashboardLayout'
import { isBusinessPage, type AdminPageId } from './portals/admin/adminRoutes'
import type { Capabilities, Shop } from './portals/admin/commercialTypes'
import { getDashboardCopy, type DashboardCopy } from './portals/admin/dashboardCopy'
import { useDashboardNavigation } from './portals/admin/hooks/useDashboardNavigation'
import { useCommercialContext } from './portals/admin/hooks/useCommercialContext'
import DashboardOverviewSection from './features/queue/components/DashboardOverviewSection'
import QueueSection from './features/queue/components/QueueSection'
import { useQueueSnapshot } from './features/queue/hooks/useQueueSnapshot'
import BarbersSection from './features/barbers/components/BarbersSection'
import ServicesSection from './features/services/components/ServicesSection'

type DashboardViewProps = { auth: Auth; isDemo: boolean; onLogout: () => void }
type AdminNavItem = DashboardNavItem & { requiresCatalogAccess?: boolean; requiresOwner?: boolean }
type QueueBackedPageId = Extract<AdminPageId, 'overview' | 'queue' | 'barbers' | 'services' | 'team'>

type QueueBackedPageProps = {
  page: QueueBackedPageId
  auth: Auth
  isDemo: boolean
  canManageCatalog: boolean
  copy: DashboardCopy
  today: string
  isSystemAdmin: boolean
  shop: Shop | null
  capabilities: Capabilities | null
  onShopUpdated: () => Promise<void>
  onNavigate: (page: AdminPageId) => void
  formatRole: (role: string) => string
}

const queueBackedPageIds = new Set<AdminPageId>(['overview', 'queue', 'barbers', 'services', 'team'])

function isQueueBackedPage(page: AdminPageId): page is QueueBackedPageId {
  return queueBackedPageIds.has(page)
}

function QueueBackedPageContent({ page, auth, isDemo, canManageCatalog, copy, today, isSystemAdmin, shop, capabilities, onShopUpdated, onNavigate, formatRole: localizeRole }: QueueBackedPageProps) {
  const queue = useQueueSnapshot(copy.loadOperationError)

  if (page === 'overview') return <DashboardOverviewSection auth={auth} isDemo={isDemo} canManageCatalog={canManageCatalog} copy={copy} today={today}
    barbers={queue.barbers} services={queue.services} turns={queue.turns} overview={queue.overview}
    loading={queue.loading} error={queue.error} onRefresh={() => { void queue.refresh() }}
    onNavigate={onNavigate} formatRole={localizeRole} />

  if (page === 'queue') return <QueueSection barbers={queue.barbers} services={queue.services} turns={queue.turns} overview={queue.overview}
    loading={queue.loading} copy={copy} onRefresh={queue.refresh} onError={queue.setError} />

  if (page === 'barbers') return <BarbersSection barbers={queue.barbers} canManage={canManageCatalog} copy={copy} onRefresh={queue.refresh} onError={queue.setError} />

  if (page === 'services') return canManageCatalog
    ? <ServicesSection services={queue.services} copy={copy} onRefresh={queue.refresh} onError={queue.setError} />
    : null

  return <BusinessModules
    page="team"
    auth={auth}
    barbers={queue.barbers}
    isDemo={isDemo}
    isSystemAdmin={isSystemAdmin}
    shop={shop}
    capabilities={capabilities}
    onShopUpdated={onShopUpdated}
  />
}

export default function DashboardView({ auth, isDemo, onLogout }: DashboardViewProps) {
  const { locale, t } = useI18n()
  const copy = getDashboardCopy(locale)
  const canManageCatalog = auth.role === 'Owner' || auth.role === 'Administrator'
  const commercial = useCommercialContext()
  const isSystemAdmin = commercial.capabilities?.isSystemAdmin === true
  const hasOwnerAccess = auth.role === 'Owner' || isSystemAdmin

  const navItems = useMemo<AdminNavItem[]>(() => [
    { id: 'overview', label: copy.dashboard, icon: faHouse },
    { id: 'queue', label: copy.queueLive, icon: faListOl },
    { id: 'appointments', label: copy.appointments, icon: faCalendarCheck },
    { id: 'barbers', label: copy.barbers, icon: faUserTie },
    { id: 'services', label: copy.services, icon: faScissors, requiresCatalogAccess: true },
    { id: 'customers', label: copy.customers, icon: faUsers },
    { id: 'payments', label: copy.payments, icon: faCashRegister, requiresCatalogAccess: true },
    { id: 'reports', label: copy.reports, icon: faChartColumn, requiresCatalogAccess: true },
    { id: 'team', label: copy.team, icon: faUserGroup, requiresCatalogAccess: true },
    { id: 'locations', label: copy.locations, icon: faBuilding, requiresOwner: true },
    { id: 'billing', label: copy.billing, icon: faCreditCard, requiresOwner: true },
  ], [copy])

  const visibleNavItems = useMemo(
    () => navItems.filter(item => (!item.requiresCatalogAccess || canManageCatalog) && (!item.requiresOwner || hasOwnerAccess)),
    [canManageCatalog, hasOwnerAccess, navItems],
  )

  const navigation = useDashboardNavigation()
  const activeNavItem = navItems.find(item => item.id === navigation.activePage)
  const ownerPermissionPending = activeNavItem?.requiresOwner === true && auth.role !== 'Owner' && commercial.capabilities === null

  useEffect(() => {
    if (ownerPermissionPending) return
    if (visibleNavItems.some(item => item.id === navigation.activePage)) return
    navigation.replacePage('overview')
  }, [navigation.activePage, ownerPermissionPending, visibleNavItems])

  useEffect(() => {
    const label = navItems.find(item => item.id === navigation.activePage)?.label ?? copy.dashboard
    document.title = `${label} | BarberTurn`
  }, [copy.dashboard, navItems, navigation.activePage])

  const today = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())
  const currentYear = new Date().getFullYear()
  const localizeRole = (role: string) => role === 'Owner' ? copy.owner : role === 'Administrator' ? copy.administrator : role === 'Receptionist' ? t('role.receptionist') : role === 'Barber' ? t('role.barber') : role
  const dashboardSlogan = getHomeAuxCopy(locale).slogan

  function renderPage(page: AdminPageId) {
    if (ownerPermissionPending && (page === 'locations' || page === 'billing')) {
      return <section className="panel dashboard-section"><p>{copy.loadingOperation}</p></section>
    }

    if (isQueueBackedPage(page)) return <QueueBackedPageContent
      page={page}
      auth={auth}
      isDemo={isDemo}
      canManageCatalog={canManageCatalog}
      copy={copy}
      today={today}
      isSystemAdmin={isSystemAdmin}
      shop={commercial.shop}
      capabilities={commercial.capabilities}
      onShopUpdated={commercial.refresh}
      onNavigate={navigation.navigateToPage}
      formatRole={localizeRole}
    />

    if (isBusinessPage(page)) return <BusinessModules
      page={page}
      auth={auth}
      barbers={[]}
      isDemo={isDemo}
      isSystemAdmin={isSystemAdmin}
      shop={commercial.shop}
      capabilities={commercial.capabilities}
      onShopUpdated={commercial.refresh}
    />

    return null
  }

  return (
    <AdminDashboardLayout auth={auth} isDemo={isDemo} canManageCatalog={canManageCatalog} copy={copy} navItems={visibleNavItems}
      activePage={navigation.activePage} mobileNavOpen={navigation.mobileNavOpen}
      mobileMenuButtonRef={navigation.mobileMenuButtonRef} sidebarRef={navigation.sidebarRef}
      onNavigate={navigation.navigateToPage} onOpenMobileNav={navigation.openMobileNav} onCloseMobileNav={navigation.closeMobileNav}
      onLogout={onLogout} formatRole={localizeRole}>
      {renderPage(navigation.activePage)}
      <footer className="dashboard-footer"><span>© {currentYear} BarberTurn. {copy.rights}</span><span>{dashboardSlogan}</span></footer>
    </AdminDashboardLayout>
  )
}
