import { useEffect, useRef, useState } from 'react'

export function useDashboardNavigation(sectionIds: string[]) {
  const [activeSection, setActiveSection] = useState('dashboard-overview')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const sections = sectionIds.map(id => document.getElementById(id)).filter((section): section is HTMLElement => section !== null)
    const observer = new IntersectionObserver(entries => {
      const visibleSection = entries.filter(entry => entry.isIntersecting).sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0]
      if (visibleSection) setActiveSection(visibleSection.target.id)
    }, { rootMargin: '-18% 0px -68% 0px', threshold: [0, 0.2, 0.5] })
    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [sectionIds])

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

  function navigateToSection(id: string) {
    setActiveSection(id)
    setMobileNavOpen(false)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }

  return {
    activeSection, mobileNavOpen, mobileMenuButtonRef, sidebarRef, navigateToSection,
    openMobileNav: () => setMobileNavOpen(true),
    closeMobileNav: () => setMobileNavOpen(false),
  }
}
