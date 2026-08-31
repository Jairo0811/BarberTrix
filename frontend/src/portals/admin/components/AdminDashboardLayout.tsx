import type { PropsWithChildren, RefObject } from 'react'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faFlask, faRightFromBracket, faShieldHalved, faXmark } from '@fortawesome/free-solid-svg-icons'
import type { Auth } from '../../../types'
import { adminPageHref, type AdminPageId } from '../adminRoutes'

type DashboardCopy = Record<string, string>

export type DashboardNavItem = { id: AdminPageId; label: string; icon: IconDefinition }

type Props = PropsWithChildren<{
  auth: Auth
  isDemo: boolean
  canManageCatalog: boolean
  copy: DashboardCopy
  navItems: DashboardNavItem[]
  activePage: AdminPageId
  mobileNavOpen: boolean
  mobileMenuButtonRef: RefObject<HTMLButtonElement | null>
  sidebarRef: RefObject<HTMLElement | null>
  onOpenMobileNav: () => void
  onCloseMobileNav: () => void
  onLogout: () => void
  formatRole: (role: string) => string
}>

export default function AdminDashboardLayout({ auth, isDemo, canManageCatalog, copy: c, navItems, activePage, mobileNavOpen, mobileMenuButtonRef, sidebarRef, onOpenMobileNav, onCloseMobileNav, onLogout, formatRole, children }: Props) {
  return (
    <main className={`dashboard-app${isDemo ? ' dashboard-demo' : ' dashboard-admin'}`}>
      {mobileNavOpen && <button className="dashboard-nav-backdrop" type="button" aria-label={c.closeNavigation} onClick={onCloseMobileNav} />}

      <aside id="dashboard-sidebar" ref={sidebarRef} className={`dashboard-sidebar${mobileNavOpen ? ' mobile-open' : ''}`} aria-label={c.panelNavigation}>
        <div className="dashboard-brand-row">
          <div className="dashboard-brand"><img src="/branding/barberturn-logo.png" alt="BarberTurn" /></div>
          <button className="dashboard-sidebar-close" type="button" aria-label={c.closeMenu} onClick={onCloseMobileNav}><FontAwesomeIcon icon={faXmark} /></button>
        </div>

        {isDemo ? <span className="demo-pill"><FontAwesomeIcon icon={faFlask} /> {c.demoMode}</span> : canManageCatalog ? <span className="admin-pill"><FontAwesomeIcon icon={faShieldHalved} /> {c.adminPanel}</span> : null}

        <nav className="dashboard-nav">
          {navItems.map(item => (
            <a key={item.id} className={activePage === item.id ? 'active' : undefined} href={adminPageHref(item.id)} aria-current={activePage === item.id ? 'page' : undefined} onClick={onCloseMobileNav}>
              <span className="nav-icon" aria-hidden="true"><FontAwesomeIcon icon={item.icon} /></span><span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-footer">
          <div className="sidebar-session-summary"><strong>{auth.name}</strong><small>{isDemo ? c.temporarySession : formatRole(auth.role)}</small></div>
          <button className="sidebar-logout" type="button" onClick={onLogout}><FontAwesomeIcon icon={faRightFromBracket} /><span>{c.logout}</span></button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-left">
            <button ref={mobileMenuButtonRef} className="dashboard-mobile-menu" type="button" aria-label={c.openMenu} aria-expanded={mobileNavOpen} aria-controls="dashboard-sidebar" onClick={onOpenMobileNav}><FontAwesomeIcon icon={faBars} /></button>
            <div className="dashboard-topbar-copy"><strong>{isDemo ? 'BarberTurn Demo' : 'BarberTurn Admin'}</strong><span>{isDemo ? c.demoEnvironment : c.controlCenter}</span></div>
          </div>
          <div className="dashboard-user">
            {isDemo ? <span className="demo-pill">DEMO</span> : canManageCatalog && <span className="admin-pill compact">ADMIN</span>}
            <div className="dashboard-user-copy"><strong>{auth.name}</strong><small>{formatRole(auth.role)}</small></div>
            <span className="dashboard-avatar" aria-hidden="true">{auth.name.charAt(0).toUpperCase()}</span>
          </div>
        </header>

        <div className="dashboard-content">{children}</div>
      </section>
    </main>
  )
}
