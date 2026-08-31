import { useEffect, useRef, useState } from 'react'
import { adminPageHref, readAdminPage, type AdminPageId } from '../adminRoutes'

export function useDashboardNavigation() {
  const [activePage, setActivePage] = useState<AdminPageId>(readAdminPage)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const syncPageFromHash = () => setActivePage(readAdminPage())
    window.addEventListener('hashchange', syncPageFromHash)
    syncPageFromHash()
    return () => window.removeEventListener('hashchange', syncPageFromHash)
  }, [])

  useEffect(() => {
    if (['#/login', '#billing-section', '#/app', '#/app/'].includes(window.location.hash)) {
      window.history.replaceState(null, '', adminPageHref(activePage))
    }
  }, [activePage])

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
    if (page === activePage && window.location.hash === adminPageHref(page)) return
    window.location.hash = adminPageHref(page)
  }

  function replacePage(page: AdminPageId) {
    setActivePage(page)
    setMobileNavOpen(false)
    window.history.replaceState(null, '', adminPageHref(page))
  }

  return {
    activePage, mobileNavOpen, mobileMenuButtonRef, sidebarRef, navigateToPage, replacePage,
    openMobileNav: () => setMobileNavOpen(true),
    closeMobileNav: () => setMobileNavOpen(false),
  }
}
