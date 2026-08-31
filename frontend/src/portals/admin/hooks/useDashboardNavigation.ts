import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { adminPagePath, parseAdminPagePath, type AdminPageId } from '../adminRoutes'

export function useDashboardNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const activePage = parseAdminPagePath(location.pathname) ?? 'overview'
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (parseAdminPagePath(location.pathname) !== null && location.pathname !== '/app' && location.pathname !== '/app/') return
    navigate(adminPagePath('overview'), { replace: true })
  }, [location.pathname, navigate])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('admin-page-content')?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activePage])

  useEffect(() => {
    if (!mobileNavOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeDrawer = () => {
      setMobileNavOpen(false)
      window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus())
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { closeDrawer(); return }
      if (event.key !== 'Tab' || !sidebarRef.current) return
      const focusableElements = Array.from(sidebarRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])'))
      if (focusableElements.length === 0) return
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      if (event.shiftKey && document.activeElement === firstElement) { event.preventDefault(); lastElement.focus() }
      else if (!event.shiftKey && document.activeElement === lastElement) { event.preventDefault(); firstElement.focus() }
    }
    document.addEventListener('keydown', handleKeyDown)
    window.requestAnimationFrame(() => sidebarRef.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus())
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileNavOpen])

  function navigateToPage(page: AdminPageId) {
    setMobileNavOpen(false)
    const path = adminPagePath(page)
    if (page === activePage && location.pathname === path) return
    navigate(path)
  }

  function replacePage(page: AdminPageId) {
    setMobileNavOpen(false)
    navigate(adminPagePath(page), { replace: true })
  }

  return {
    activePage, mobileNavOpen, mobileMenuButtonRef, sidebarRef, navigateToPage, replacePage,
    openMobileNav: () => setMobileNavOpen(true),
    closeMobileNav: () => setMobileNavOpen(false),
  }
}
