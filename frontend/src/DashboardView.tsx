import { useMemo } from 'react'
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
import './dashboard.css'
import BusinessModules from './BusinessModules'
import AdminDashboardLayout from './portals/admin/components/AdminDashboardLayout'
import { dashboardCopy, type DashboardCopy } from './portals/admin/dashboardCopy'
import { useDashboardNavigation } from './portals/admin/hooks/useDashboardNavigation'
import { useCommercialContext } from './portals/admin/hooks/useCommercialContext'
import DashboardOverviewSection from './features/queue/components/DashboardOverviewSection'
import QueueSection from './features/queue/components/QueueSection'
import { useQueueSnapshot } from './features/queue/hooks/useQueueSnapshot'
import BarbersSection from './features/barbers/components/BarbersSection'
import ServicesSection from './features/services/components/ServicesSection'

type DashboardViewProps = { auth: Auth; isDemo: boolean; onLogout: () => void }

function formatRole(role: string, copy: DashboardCopy) {
  if (role === 'Owner') return copy.owner
  if (role === 'Administrator') return copy.administrator
  return role
}

export default function DashboardView({ auth, isDemo, onLogout }: DashboardViewProps) {
  const { locale } = useI18n()
  const copy = dashboardCopy[locale]
  const canManageCatalog = auth.role === 'Owner' || auth.role === 'Administrator'
  const queue = useQueueSnapshot(copy.loadOperationError)
  const commercial = useCommercialContext()
  const isSystemAdmin = commercial.capabilities?.isSystemAdmin === true
  const hasOwnerAccess = auth.role === 'Owner' || isSystemAdmin

  const navItems = useMemo(() => [
    { id: 'dashboard-overview', label: copy.dashboard, icon: faHouse },
    { id: 'queue-section', label: copy.queueLive, icon: faListOl },
    { id: 'appointments-section', label: copy.appointments, icon: faCalendarCheck },
    { id: 'barbers-section', label: copy.barbers, icon: faUserTie },
    { id: 'services-section', label: copy.services, icon: faScissors, requiresCatalogAccess: true },
    { id: 'customers-section', label: copy.customers, icon: faUsers },
    { id: 'payments-section', label: copy.payments, icon: faCashRegister, requiresCatalogAccess: true },
    { id: 'reports-section', label: copy.reports, icon: faChartColumn, requiresCatalogAccess: true },
    { id: 'team-section', label: copy.team, icon: faUserGroup, requiresCatalogAccess: true },
    { id: 'locations-section', label: copy.locations, icon: faBuilding, requiresOwner: true },
    { id: 'billing-section', label: copy.billing, icon: faCreditCard, requiresOwner: true },
  ], [copy])
  const visibleNavItems = useMemo(
    () => navItems.filter(item => (!item.requiresCatalogAccess || canManageCatalog) && (!item.requiresOwner || hasOwnerAccess)),
    [canManageCatalog, hasOwnerAccess, navItems],
  )
  const sectionIds = useMemo(() => visibleNavItems.map(item => item.id), [visibleNavItems])
  const navigation = useDashboardNavigation(sectionIds)

  const dateLocale = locale === 'en' ? 'en-US' : locale
  const today = new Intl.DateTimeFormat(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())
  const currentYear = new Date().getFullYear()
  const localizeRole = (role: string) => formatRole(role, copy)

  return (
    <AdminDashboardLayout auth={auth} isDemo={isDemo} canManageCatalog={canManageCatalog} copy={copy} navItems={visibleNavItems}
      activeSection={navigation.activeSection} mobileNavOpen={navigation.mobileNavOpen}
      mobileMenuButtonRef={navigation.mobileMenuButtonRef} sidebarRef={navigation.sidebarRef}
      onNavigate={navigation.navigateToSection} onOpenMobileNav={navigation.openMobileNav} onCloseMobileNav={navigation.closeMobileNav}
      onLogout={onLogout} formatRole={localizeRole}>
      <DashboardOverviewSection auth={auth} isDemo={isDemo} canManageCatalog={canManageCatalog} copy={copy} today={today}
        barbers={queue.barbers} services={queue.services} turns={queue.turns} overview={queue.overview}
        loading={queue.loading} error={queue.error} onRefresh={() => { void queue.refresh() }}
        onNavigate={navigation.navigateToSection} formatRole={localizeRole} />
      <QueueSection barbers={queue.barbers} services={queue.services} turns={queue.turns} overview={queue.overview}
        loading={queue.loading} copy={copy} onRefresh={queue.refresh} onError={queue.setError} />
      <BarbersSection barbers={queue.barbers} canManage={canManageCatalog} copy={copy} onRefresh={queue.refresh} onError={queue.setError} />
      {canManageCatalog && <ServicesSection services={queue.services} copy={copy} onRefresh={queue.refresh} onError={queue.setError} />}

      <BusinessModules
        auth={auth}
        barbers={queue.barbers}
        isDemo={isDemo}
        isSystemAdmin={isSystemAdmin}
        shop={commercial.shop}
        capabilities={commercial.capabilities}
        onShopUpdated={commercial.refresh}
      />
      <footer className="dashboard-footer"><span>© {currentYear} BarberTurn. {copy.rights}</span><span>Tu turno. Tu estilo. Tu tiempo.</span></footer>
    </AdminDashboardLayout>
  )
}
