import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import {
  faBars,
  faBolt,
  faChartColumn,
  faClock,
  faFlask,
  faHouse,
  faListOl,
  faPlus,
  faRightFromBracket,
  faRotate,
  faScissors,
  faShieldHalved,
  faTv,
  faUserTie,
  faUsers,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import type { Auth, Barber, BarberStatus, Service, Turn } from './types'
import { confirmDestructive, showError, showSuccessToast } from './alerts'
import { Locale, useI18n } from './i18n'
import './dashboard.css'
import { API_URL, api, readAuth } from './api'
import BusinessModules from './BusinessModules'

type DashboardViewProps = {
  auth: Auth
  isDemo: boolean
  onLogout: () => void
}

type QueueMetrics = { waiting: number; called: number; inService: number; completedToday: number; cancelledToday: number; noShowToday: number; availableBarbers: number; estimatedWaitMinutes: number }

type DashboardCopy = typeof dashboardCopy['es-419']

const dashboardCopy = {
  'es-419': {
    dashboard: 'Dashboard', queueLive: 'Cola en vivo', barbers: 'Barberos', services: 'Servicios', customers: 'Clientes', reports: 'Reportes', comingSoon: 'Próximamente', availableLater: 'Disponible en una fase posterior', owner: 'Propietario', administrator: 'Administrador', temporarySession: 'Sesión temporal', logout: 'Cerrar sesión', openMenu: 'Abrir menú', closeMenu: 'Cerrar menú', closeNavigation: 'Cerrar navegación', panelNavigation: 'Navegación del panel', demoMode: 'MODO DEMO', adminPanel: 'PANEL ADMIN', demoEnvironment: 'Entorno guiado de demostración', controlCenter: 'Centro de control operativo', demoExperience: 'EXPERIENCIA DE PRUEBA', dailyOperation: 'OPERACIÓN DEL DÍA', demoPanel: 'Panel de demostración', adminTitle: 'Panel de administración', demoSubtitle: 'Explora el flujo completo con datos temporales y acciones seguras.', adminSubtitle: 'Supervisa la cola, el equipo y el catálogo desde un solo lugar.', demoBannerTitle: 'Estás explorando BarberTurn en modo demo', demoBannerText: 'Puedes crear turnos, cambiar estados y recorrer el flujo operativo. Los datos de esta sesión son temporales.', testEnvironment: 'ENTORNO DE PRUEBA', adminBannerTitle: 'Centro de administración activo', adminBannerText: 'Tienes permisos para gestionar turnos, barberos y el catálogo de servicios de la barbería.', loadOperationError: 'No se pudo cargar la operación de la barbería.', operationError: 'No se pudo completar la operación.', updateTurnError: 'No se pudo actualizar el turno.', waitingTurns: 'Turnos en espera', queuePending: 'Cola pendiente', inService: 'En servicio', activeAttention: 'Atenciones activas', availableBarbers: 'Barberos disponibles', activeTeam: 'activos en el equipo', activeServices: 'Servicios activos', availableCatalog: 'Catálogo disponible', loadingOperation: 'Cargando operación…', loadingTeam: 'Cargando equipo…', loadingCatalog: 'Cargando catálogo…', queueSummary: 'Resumen de la cola', recentTurns: 'Turnos más recientes de la operación.', refresh: 'Actualizar', noActiveTurns: 'No hay turnos activos en este momento.', loadingTurns: 'Cargando turnos…', unnamedCustomer: 'Cliente sin nombre', quickActions: 'Accesos rápidos', frequentActions: 'Acciones frecuentes.', createTurn: 'Crear nuevo turno', manageBarbers: 'Gestionar barberos', manageServices: 'Gestionar servicios', refreshOperation: 'Actualizar operación', turnOperation: 'Operación de turnos', turnOperationText: 'Crea turnos y gestiona la cola activa.', newTurn: 'NUEVO TURNO', addToQueue: 'Agregar a la fila', customerOptional: 'Nombre del cliente (opcional)', selectService: 'Selecciona servicio', anyBarber: 'Cualquier barbero', chair: 'Silla', generateTurn: 'Generar turno', currentQueue: 'COLA ACTUAL', quickStatus: 'Estado rápido', waiting: 'Esperando', pendingCall: 'Clientes pendientes de llamada', beingServed: 'Clientes siendo atendidos', completed: 'Completados', completedText: 'Turnos finalizados en la cola cargada', turns: 'Turnos', noTurnsToday: 'No hay turnos activos para hoy.', loadingQueue: 'Cargando cola…', barberToAssign: 'Barbero por asignar', callWith: 'Llamar con', cancel: 'Cancelar', startService: 'Iniciar servicio', noShow: 'No llegó', complete: 'Completar', teamAvailability: 'Disponibilidad y estado del equipo.', available: 'Disponible', break: 'Descanso', offline: 'Fuera de línea', busy: 'Ocupado', configuration: 'CONFIGURACIÓN', newBarber: 'Nuevo barbero', barberName: 'Nombre del barbero', chairNumber: 'Número de silla', addBarber: 'Agregar barbero', servicesText: 'Administra el catálogo disponible para los turnos.', catalog: 'CATÁLOGO', newService: 'Nuevo servicio', serviceName: 'Nombre del servicio', price: 'Precio', duration: 'Duración estimada (min)', optionalDescription: 'Descripción (opcional)', addService: 'Agregar servicio', activeServicesLabel: 'SERVICIOS ACTIVOS', availablePlural: 'disponibles', rights: 'Todos los derechos reservados.', createdTurn: 'Turno creado correctamente', addedBarber: 'Barbero agregado correctamente', addedService: 'Servicio agregado correctamente', statusUpdated: 'Estado actualizado correctamente', cancelTitle: '¿Cancelar este turno?', cancelText: 'El turno {{ticket}} dejará de aparecer en la cola activa.', confirmCancel: 'Sí, cancelar', noShowTitle: '¿Marcar como no presentado?', noShowText: 'El turno {{ticket}} será marcado como No Show.', confirmNoShow: 'Sí, marcar', calledSuccess: 'Cliente llamado correctamente', startedSuccess: 'Servicio iniciado', completedSuccess: 'Turno completado', cancelledSuccess: 'Turno cancelado', noShowSuccess: 'Turno marcado como no presentado',
  },
  en: {
    dashboard: 'Dashboard', queueLive: 'Live queue', barbers: 'Barbers', services: 'Services', customers: 'Customers', reports: 'Reports', comingSoon: 'Coming soon', availableLater: 'Available in a future phase', owner: 'Owner', administrator: 'Administrator', temporarySession: 'Temporary session', logout: 'Sign out', openMenu: 'Open menu', closeMenu: 'Close menu', closeNavigation: 'Close navigation', panelNavigation: 'Panel navigation', demoMode: 'DEMO MODE', adminPanel: 'ADMIN PANEL', demoEnvironment: 'Guided demo environment', controlCenter: 'Operations control center', demoExperience: 'DEMO EXPERIENCE', dailyOperation: 'TODAY’S OPERATIONS', demoPanel: 'Demo dashboard', adminTitle: 'Administration dashboard', demoSubtitle: 'Explore the complete workflow with temporary data and safe actions.', adminSubtitle: 'Monitor the queue, team and service catalog from one place.', demoBannerTitle: 'You are exploring BarberTurn in demo mode', demoBannerText: 'You can create queue tickets, change statuses and walk through the operational flow. This session data is temporary.', testEnvironment: 'TEST ENVIRONMENT', adminBannerTitle: 'Administration center active', adminBannerText: 'You have permission to manage queue tickets, barbers and the barbershop service catalog.', loadOperationError: 'Unable to load barbershop operations.', operationError: 'Unable to complete the operation.', updateTurnError: 'Unable to update the queue ticket.', waitingTurns: 'Waiting', queuePending: 'Pending queue', inService: 'In service', activeAttention: 'Active services', availableBarbers: 'Available barbers', activeTeam: 'active on the team', activeServices: 'Active services', availableCatalog: 'Available catalog', loadingOperation: 'Loading operations…', loadingTeam: 'Loading team…', loadingCatalog: 'Loading catalog…', queueSummary: 'Queue summary', recentTurns: 'Most recent queue tickets.', refresh: 'Refresh', noActiveTurns: 'There are no active queue tickets right now.', loadingTurns: 'Loading queue tickets…', unnamedCustomer: 'Unnamed customer', quickActions: 'Quick actions', frequentActions: 'Frequent actions.', createTurn: 'Create queue ticket', manageBarbers: 'Manage barbers', manageServices: 'Manage services', refreshOperation: 'Refresh operations', turnOperation: 'Queue operations', turnOperationText: 'Create queue tickets and manage the active queue.', newTurn: 'NEW QUEUE TICKET', addToQueue: 'Add to queue', customerOptional: 'Customer name (optional)', selectService: 'Select a service', anyBarber: 'Any barber', chair: 'Chair', generateTurn: 'Create queue ticket', currentQueue: 'CURRENT QUEUE', quickStatus: 'Quick status', waiting: 'Waiting', pendingCall: 'Customers waiting to be called', beingServed: 'Customers being served', completed: 'Completed', completedText: 'Completed tickets in the loaded queue', turns: 'Queue tickets', noTurnsToday: 'There are no active queue tickets today.', loadingQueue: 'Loading queue…', barberToAssign: 'Barber not assigned', callWith: 'Call with', cancel: 'Cancel', startService: 'Start service', noShow: 'No show', complete: 'Complete', teamAvailability: 'Team availability and status.', available: 'Available', break: 'Break', offline: 'Offline', busy: 'Busy', configuration: 'SETTINGS', newBarber: 'New barber', barberName: 'Barber name', chairNumber: 'Chair number', addBarber: 'Add barber', servicesText: 'Manage the service catalog available for queue tickets.', catalog: 'CATALOG', newService: 'New service', serviceName: 'Service name', price: 'Price', duration: 'Estimated duration (min)', optionalDescription: 'Description (optional)', addService: 'Add service', activeServicesLabel: 'ACTIVE SERVICES', availablePlural: 'available', rights: 'All rights reserved.', createdTurn: 'Queue ticket created successfully', addedBarber: 'Barber added successfully', addedService: 'Service added successfully', statusUpdated: 'Status updated successfully', cancelTitle: 'Cancel this queue ticket?', cancelText: 'Ticket {{ticket}} will no longer appear in the active queue.', confirmCancel: 'Yes, cancel', noShowTitle: 'Mark as no-show?', noShowText: 'Ticket {{ticket}} will be marked as No Show.', confirmNoShow: 'Yes, mark it', calledSuccess: 'Customer called successfully', startedSuccess: 'Service started', completedSuccess: 'Queue ticket completed', cancelledSuccess: 'Queue ticket cancelled', noShowSuccess: 'Queue ticket marked as no-show',
  },
  'es-ES': {
    dashboard: 'Panel', queueLive: 'Cola en directo', barbers: 'Barberos', services: 'Servicios', customers: 'Clientes', reports: 'Informes', comingSoon: 'Próximamente', availableLater: 'Disponible en una fase posterior', owner: 'Propietario', administrator: 'Administrador', temporarySession: 'Sesión temporal', logout: 'Cerrar sesión', openMenu: 'Abrir menú', closeMenu: 'Cerrar menú', closeNavigation: 'Cerrar navegación', panelNavigation: 'Navegación del panel', demoMode: 'MODO DEMO', adminPanel: 'PANEL ADMIN', demoEnvironment: 'Entorno guiado de demostración', controlCenter: 'Centro de control operativo', demoExperience: 'EXPERIENCIA DE PRUEBA', dailyOperation: 'OPERATIVA DEL DÍA', demoPanel: 'Panel de demostración', adminTitle: 'Panel de administración', demoSubtitle: 'Explora el flujo completo con datos temporales y acciones seguras.', adminSubtitle: 'Supervisa la cola, el equipo y el catálogo desde un único lugar.', demoBannerTitle: 'Estás explorando BarberTurn en modo demo', demoBannerText: 'Puedes crear turnos, cambiar estados y recorrer el flujo operativo. Los datos de esta sesión son temporales.', testEnvironment: 'ENTORNO DE PRUEBA', adminBannerTitle: 'Centro de administración activo', adminBannerText: 'Tienes permisos para gestionar turnos, barberos y el catálogo de servicios de la barbería.', loadOperationError: 'No se ha podido cargar la operativa de la barbería.', operationError: 'No se ha podido completar la operación.', updateTurnError: 'No se ha podido actualizar el turno.', waitingTurns: 'Turnos en espera', queuePending: 'Cola pendiente', inService: 'En servicio', activeAttention: 'Atenciones activas', availableBarbers: 'Barberos disponibles', activeTeam: 'activos en el equipo', activeServices: 'Servicios activos', availableCatalog: 'Catálogo disponible', loadingOperation: 'Cargando operativa…', loadingTeam: 'Cargando equipo…', loadingCatalog: 'Cargando catálogo…', queueSummary: 'Resumen de la cola', recentTurns: 'Turnos más recientes de la operativa.', refresh: 'Actualizar', noActiveTurns: 'No hay turnos activos en este momento.', loadingTurns: 'Cargando turnos…', unnamedCustomer: 'Cliente sin nombre', quickActions: 'Accesos rápidos', frequentActions: 'Acciones frecuentes.', createTurn: 'Crear nuevo turno', manageBarbers: 'Gestionar barberos', manageServices: 'Gestionar servicios', refreshOperation: 'Actualizar operativa', turnOperation: 'Operativa de turnos', turnOperationText: 'Crea turnos y gestiona la cola activa.', newTurn: 'NUEVO TURNO', addToQueue: 'Añadir a la cola', customerOptional: 'Nombre del cliente (opcional)', selectService: 'Selecciona servicio', anyBarber: 'Cualquier barbero', chair: 'Sillón', generateTurn: 'Generar turno', currentQueue: 'COLA ACTUAL', quickStatus: 'Estado rápido', waiting: 'Esperando', pendingCall: 'Clientes pendientes de llamada', beingServed: 'Clientes siendo atendidos', completed: 'Completados', completedText: 'Turnos finalizados en la cola cargada', turns: 'Turnos', noTurnsToday: 'No hay turnos activos para hoy.', loadingQueue: 'Cargando cola…', barberToAssign: 'Barbero por asignar', callWith: 'Llamar con', cancel: 'Cancelar', startService: 'Iniciar servicio', noShow: 'No se presentó', complete: 'Completar', teamAvailability: 'Disponibilidad y estado del equipo.', available: 'Disponible', break: 'Descanso', offline: 'Sin conexión', busy: 'Ocupado', configuration: 'CONFIGURACIÓN', newBarber: 'Nuevo barbero', barberName: 'Nombre del barbero', chairNumber: 'Número de sillón', addBarber: 'Añadir barbero', servicesText: 'Administra el catálogo disponible para los turnos.', catalog: 'CATÁLOGO', newService: 'Nuevo servicio', serviceName: 'Nombre del servicio', price: 'Precio', duration: 'Duración estimada (min)', optionalDescription: 'Descripción (opcional)', addService: 'Añadir servicio', activeServicesLabel: 'SERVICIOS ACTIVOS', availablePlural: 'disponibles', rights: 'Todos los derechos reservados.', createdTurn: 'Turno creado correctamente', addedBarber: 'Barbero añadido correctamente', addedService: 'Servicio añadido correctamente', statusUpdated: 'Estado actualizado correctamente', cancelTitle: '¿Cancelar este turno?', cancelText: 'El turno {{ticket}} dejará de aparecer en la cola activa.', confirmCancel: 'Sí, cancelar', noShowTitle: '¿Marcar como no presentado?', noShowText: 'El turno {{ticket}} será marcado como No Show.', confirmNoShow: 'Sí, marcar', calledSuccess: 'Cliente llamado correctamente', startedSuccess: 'Servicio iniciado', completedSuccess: 'Turno completado', cancelledSuccess: 'Turno cancelado', noShowSuccess: 'Turno marcado como no presentado',
  },
} satisfies Record<Locale, Record<string, string>>

function interpolate(text: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)), text)
}

function formatRole(role: string, c: DashboardCopy) {
  if (role === 'Owner') return c.owner
  if (role === 'Administrator') return c.administrator
  return role
}

function getErrorMessage(exception: unknown, fallback: string) {
  return exception instanceof Error ? exception.message : fallback
}

export default function DashboardView({ auth, isDemo, onLogout }: DashboardViewProps) {
  const { locale } = useI18n()
  const c = dashboardCopy[locale]
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [turns, setTurns] = useState<Turn[]>([])
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('dashboard-overview')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)

  const canManageCatalog = auth.role === 'Owner' || auth.role === 'Administrator'
  const navItems = useMemo(() => [
    { id: 'dashboard-overview', label: c.dashboard, icon: faHouse },
    { id: 'queue-section', label: c.queueLive, icon: faListOl },
    { id: 'barbers-section', label: c.barbers, icon: faUserTie },
    { id: 'services-section', label: c.services, icon: faScissors, requiresCatalogAccess: true },
    { id: 'appointments-section', label: 'Citas', icon: faClock },
    { id: 'customers-section', label: c.customers, icon: faUsers },
    { id: 'payments-section', label: 'Caja', icon: faBolt, requiresCatalogAccess: true },
    { id: 'reports-section', label: c.reports, icon: faChartColumn, requiresCatalogAccess: true },
    { id: 'team-section', label: 'Equipo', icon: faUserTie, requiresCatalogAccess: true },
    { id: 'locations-section', label: 'Sucursales', icon: faHouse, requiresOwner: true },
    { id: 'billing-section', label: 'Suscripción', icon: faTv, requiresOwner: true },
  ], [c])
  const visibleNavItems = useMemo(
    () => navItems.filter(item => (!item.requiresCatalogAccess || canManageCatalog) && (!item.requiresOwner || auth.role === 'Owner')),
    [auth.role, canManageCatalog, navItems],
  )

  const loadQueue = useCallback(async () => {
    setLoading(true)
    try {
      const [nextBarbers, nextServices, nextTurns, nextMetrics] = await Promise.all([
        api<Barber[]>('/api/queue/barbers'),
        api<Service[]>('/api/queue/services'),
        api<Turn[]>('/api/queue/turns'),
        api<QueueMetrics>('/api/queue/metrics'),
      ])
      setBarbers(nextBarbers)
      setServices(nextServices)
      setTurns(nextTurns)
      setMetrics(nextMetrics)
      setError('')
    } catch (exception) {
      setError(getErrorMessage(exception, c.loadOperationError))
    } finally {
      setLoading(false)
    }
  }, [auth, c.loadOperationError])

  useEffect(() => { void loadQueue() }, [loadQueue])

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/queue`, { accessTokenFactory: () => readAuth()?.accessToken ?? '' })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()
    connection.on('queueChanged', () => { void loadQueue() })
    void connection.start().catch(() => undefined)
    return () => { void connection.stop() }
  }, [loadQueue])

  useEffect(() => {
    const sections = visibleNavItems.map(item => document.getElementById(item.id)).filter((section): section is HTMLElement => section !== null)
    const observer = new IntersectionObserver(entries => {
      const visibleSection = entries.filter(entry => entry.isIntersecting).sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0]
      if (visibleSection) setActiveSection(visibleSection.target.id)
    }, { rootMargin: '-18% 0px -68% 0px', threshold: [0, 0.2, 0.5] })
    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [visibleNavItems])

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
    const section = document.getElementById(id)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    section?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }

  const overview = useMemo(() => {
    const waiting = metrics?.waiting ?? turns.filter(turn => turn.status === 'Waiting').length
    const inService = metrics?.inService ?? turns.filter(turn => turn.status === 'InService').length
    const completed = metrics?.completedToday ?? 0
    const availableBarbers = metrics?.availableBarbers ?? barbers.filter(barber => barber.status === 'Available').length
    return { waiting, inService, completed, availableBarbers }
  }, [barbers, metrics, turns])

  async function submitAndReload<T>(path: string, body: unknown, method = 'POST') {
    setBusy(true)
    setError('')
    try {
      await api<T>(path, { method, body: JSON.stringify(body) })
      await loadQueue()
    } catch (exception) {
      const message = getErrorMessage(exception, c.operationError)
      setError(message)
      await showError(c.operationError, message)
      throw exception
    } finally {
      setBusy(false)
    }
  }

  async function createTurn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    try {
      await submitAndReload<Turn>('/api/queue/turns', { serviceId: data.get('serviceId'), customerName: data.get('customerName') || null, barberId: data.get('barberId') || null })
      form.reset()
      void showSuccessToast(c.createdTurn)
    } catch { /* handled by submitAndReload */ }
  }

  async function createBarber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    try {
      await submitAndReload<Barber>('/api/queue/barbers', { name: data.get('name'), chairNumber: Number(data.get('chairNumber')) })
      form.reset()
      void showSuccessToast(c.addedBarber)
    } catch { /* handled by submitAndReload */ }
  }

  async function createService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    try {
      await submitAndReload<Service>('/api/queue/services', { name: data.get('name'), price: Number(data.get('price')), estimatedDurationMinutes: Number(data.get('estimatedDurationMinutes')), description: data.get('description') || null })
      form.reset()
      void showSuccessToast(c.addedService)
    } catch { /* handled by submitAndReload */ }
  }

  async function changeBarberStatus(barber: Barber, status: BarberStatus) {
    try {
      await submitAndReload<Barber>(`/api/queue/barbers/${barber.id}/status`, { status }, 'PATCH')
      void showSuccessToast(c.statusUpdated)
    } catch { /* handled by submitAndReload */ }
  }

  async function editBarber(barber: Barber, toggleActive = false) {
    const name = toggleActive ? barber.name : window.prompt('Nombre del barbero', barber.name)
    if (!name) return
    const chairInput = toggleActive ? String(barber.chairNumber) : window.prompt('Número de silla', String(barber.chairNumber))
    if (!chairInput) return
    try {
      await submitAndReload<Barber>(`/api/queue/barbers/${barber.id}`, { name, chairNumber: Number(chairInput), isActive: toggleActive ? !barber.isActive : barber.isActive }, 'PUT')
      void showSuccessToast('Barbero actualizado')
    } catch { /* handled by submitAndReload */ }
  }

  async function editService(service: Service, toggleActive = false) {
    const name = toggleActive ? service.name : window.prompt('Nombre del servicio', service.name)
    if (!name) return
    const price = toggleActive ? String(service.price) : window.prompt('Precio', String(service.price))
    const duration = toggleActive ? String(service.estimatedDurationMinutes) : window.prompt('Duración estimada (min)', String(service.estimatedDurationMinutes))
    if (!price || !duration) return
    try {
      await submitAndReload<Service>(`/api/queue/services/${service.id}`, { name, price: Number(price), estimatedDurationMinutes: Number(duration), description: service.description ?? null, isActive: toggleActive ? !service.isActive : service.isActive }, 'PUT')
      void showSuccessToast('Servicio actualizado')
    } catch { /* handled by submitAndReload */ }
  }

  async function transition(turn: Turn, action: 'call' | 'start' | 'complete' | 'cancel' | 'no-show', barberId?: string) {
    if (action === 'cancel') {
      const confirmed = await confirmDestructive(c.cancelTitle, interpolate(c.cancelText, { ticket: turn.ticketNumber }), c.confirmCancel)
      if (!confirmed) return
    }
    if (action === 'no-show') {
      const confirmed = await confirmDestructive(c.noShowTitle, interpolate(c.noShowText, { ticket: turn.ticketNumber }), c.confirmNoShow)
      if (!confirmed) return
    }

    setBusy(true)
    setError('')
    try {
      const suffix = action === 'call' ? `/call/${barberId}` : `/${action}`
      await api<Turn>(`/api/queue/turns/${turn.id}${suffix}`, { method: 'POST' })
      await loadQueue()
      const successMessage = { call: c.calledSuccess, start: c.startedSuccess, complete: c.completedSuccess, cancel: c.cancelledSuccess, 'no-show': c.noShowSuccess }[action]
      void showSuccessToast(successMessage)
    } catch (exception) {
      const message = getErrorMessage(exception, c.updateTurnError)
      setError(message)
      await showError(c.updateTurnError, message)
    } finally {
      setBusy(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const dateLocale = locale === 'en' ? 'en-US' : locale
  const today = new Intl.DateTimeFormat(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())
  const queuePreview = turns.slice(0, 4)
  const activeServices = services.filter(service => service.isActive).length
  const activeBarbers = barbers.filter(barber => barber.isActive).length

  return (
    <main className={`dashboard-app${isDemo ? ' dashboard-demo' : ' dashboard-admin'}`}>
      {mobileNavOpen && <button className="dashboard-nav-backdrop" type="button" aria-label={c.closeNavigation} onClick={() => setMobileNavOpen(false)} />}

      <aside id="dashboard-sidebar" ref={sidebarRef} className={`dashboard-sidebar${mobileNavOpen ? ' mobile-open' : ''}`} aria-label={c.panelNavigation}>
        <div className="dashboard-brand-row">
          <div className="dashboard-brand"><img src="/branding/barberturn-logo.png" alt="BarberTurn" /></div>
          <button className="dashboard-sidebar-close" type="button" aria-label={c.closeMenu} onClick={() => setMobileNavOpen(false)}><FontAwesomeIcon icon={faXmark} /></button>
        </div>

        {isDemo ? <span className="demo-pill"><FontAwesomeIcon icon={faFlask} /> {c.demoMode}</span> : canManageCatalog ? <span className="admin-pill"><FontAwesomeIcon icon={faShieldHalved} /> {c.adminPanel}</span> : null}

        <nav className="dashboard-nav">
          {visibleNavItems.map(item => (
            <button key={item.id} className={activeSection === item.id ? 'active' : undefined} type="button" aria-current={activeSection === item.id ? 'page' : undefined} onClick={() => navigateToSection(item.id)}>
              <span className="nav-icon" aria-hidden="true"><FontAwesomeIcon icon={item.icon} /></span><span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-footer">
          <div className="sidebar-session-summary"><strong>{auth.name}</strong><small>{isDemo ? c.temporarySession : formatRole(auth.role, c)}</small></div>
          <button className="sidebar-logout" type="button" onClick={onLogout}><FontAwesomeIcon icon={faRightFromBracket} /><span>{c.logout}</span></button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-left">
            <button ref={mobileMenuButtonRef} className="dashboard-mobile-menu" type="button" aria-label={c.openMenu} aria-expanded={mobileNavOpen} aria-controls="dashboard-sidebar" onClick={() => setMobileNavOpen(true)}><FontAwesomeIcon icon={faBars} /></button>
            <div className="dashboard-topbar-copy"><strong>{isDemo ? 'BarberTurn Demo' : 'BarberTurn Admin'}</strong><span>{isDemo ? c.demoEnvironment : c.controlCenter}</span></div>
          </div>
          <div className="dashboard-user">
            {isDemo ? <span className="demo-pill">DEMO</span> : canManageCatalog && <span className="admin-pill compact">ADMIN</span>}
            <div className="dashboard-user-copy"><strong>{auth.name}</strong><small>{formatRole(auth.role, c)}</small></div>
            <span className="dashboard-avatar" aria-hidden="true">{auth.name.charAt(0).toUpperCase()}</span>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="dashboard-section dashboard-overview-section" id="dashboard-overview">
            <div className="dashboard-heading">
              <div><span className="dashboard-heading-kicker">{isDemo ? c.demoExperience : c.dailyOperation}</span><h1>{isDemo ? c.demoPanel : c.adminTitle}</h1><p>{isDemo ? c.demoSubtitle : c.adminSubtitle}</p></div>
              <span className="dashboard-date">{today}</span>
            </div>

            {isDemo ? (
              <div className="dashboard-context-banner demo-banner"><span className="context-banner-icon"><FontAwesomeIcon icon={faFlask} /></span><div><strong>{c.demoBannerTitle}</strong><span>{c.demoBannerText}</span></div><span className="demo-pill">{c.testEnvironment}</span></div>
            ) : canManageCatalog ? (
              <div className="dashboard-context-banner admin-banner"><span className="context-banner-icon"><FontAwesomeIcon icon={faShieldHalved} /></span><div><strong>{c.adminBannerTitle}</strong><span>{c.adminBannerText}</span></div><span className="admin-pill">{formatRole(auth.role, c).toUpperCase()}</span></div>
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
                <div className="dashboard-card-header"><div><h2>{c.queueSummary}</h2><p>{c.recentTurns}</p></div><button className="secondary" type="button" disabled={loading} onClick={() => void loadQueue()}><FontAwesomeIcon icon={faRotate} /> {c.refresh}</button></div>
                <div className="queue-summary">
                  {queuePreview.length === 0 && !loading && <p className="empty">{c.noActiveTurns}</p>}
                  {loading && <p className="empty">{c.loadingTurns}</p>}
                  {queuePreview.map(turn => <div className="queue-summary-item" key={turn.id}><span className="queue-summary-ticket">{turn.ticketNumber}</span><div className="queue-summary-copy"><strong>{turn.customerName || c.unnamedCustomer}</strong><span>{turn.serviceName}{turn.barberName ? ` · ${turn.barberName}` : ''}</span></div><span className="queue-summary-status">{turn.status}</span></div>)}
                </div>
              </article>

              <article className="dashboard-card dashboard-actions-card">
                <div className="dashboard-card-header"><div><h2><FontAwesomeIcon icon={faBolt} /> {c.quickActions}</h2><p>{c.frequentActions}</p></div></div>
                <div className="quick-actions">
                  <button type="button" onClick={() => navigateToSection('queue-section')}><span className="quick-icon"><FontAwesomeIcon icon={faPlus} /></span>{c.createTurn}</button>
                  <button type="button" onClick={() => navigateToSection('barbers-section')}><span className="quick-icon"><FontAwesomeIcon icon={faUserTie} /></span>{c.manageBarbers}</button>
                  {canManageCatalog && <button type="button" onClick={() => navigateToSection('services-section')}><span className="quick-icon"><FontAwesomeIcon icon={faScissors} /></span>{c.manageServices}</button>}
                  <button type="button" disabled={loading} onClick={() => void loadQueue()}><span className="quick-icon"><FontAwesomeIcon icon={faRotate} /></span>{c.refreshOperation}</button>
                </div>
              </article>
            </div>
          </section>

          <section className="dashboard-section" id="queue-section">
            <div className="dashboard-section-title"><h2>{c.turnOperation}</h2><p>{c.turnOperationText}</p></div>
            <section className="operations-grid">
              <article className="panel">
                <div className="panel-heading"><div><p className="eyebrow">{c.newTurn}</p><h2>{c.addToQueue}</h2></div></div>
                <form className="form-stack" onSubmit={createTurn}>
                  <input name="customerName" placeholder={c.customerOptional} />
                  <select name="serviceId" required defaultValue=""><option value="" disabled>{c.selectService}</option>{services.filter(service => service.isActive).map(service => <option key={service.id} value={service.id}>{service.name} · RD${service.price}</option>)}</select>
                  <select name="barberId" defaultValue=""><option value="">{c.anyBarber}</option>{barbers.filter(barber => barber.isActive).map(barber => <option key={barber.id} value={barber.id}>{barber.name} · {c.chair} {barber.chairNumber}</option>)}</select>
                  <button className="primary" disabled={busy || loading || activeServices === 0}><FontAwesomeIcon icon={faPlus} /> {c.generateTurn}</button>
                </form>
              </article>

              <article className="panel">
                <div className="panel-heading"><div><p className="eyebrow">{c.currentQueue}</p><h2>{c.quickStatus}</h2></div></div>
                <div className="queue-summary">
                  <div className="queue-summary-item"><span className="queue-summary-ticket">{overview.waiting}</span><div className="queue-summary-copy"><strong>{c.waiting}</strong><span>{c.pendingCall}</span></div></div>
                  <div className="queue-summary-item"><span className="queue-summary-ticket">{overview.inService}</span><div className="queue-summary-copy"><strong>{c.inService}</strong><span>{c.beingServed}</span></div></div>
                  <div className="queue-summary-item"><span className="queue-summary-ticket">{overview.completed}</span><div className="queue-summary-copy"><strong>{c.completed}</strong><span>{c.completedText}</span></div></div>
                </div>
              </article>
            </section>

            <section className="panel queue-panel dashboard-section" id="queue-list">
              <div className="panel-heading"><div><p className="eyebrow">{c.queueLive.toUpperCase()}</p><h2>{c.turns}</h2></div><button className="secondary" type="button" disabled={loading} onClick={() => void loadQueue()}><FontAwesomeIcon icon={faRotate} /> {c.refresh}</button></div>
              <div className="turn-list">
                {turns.length === 0 && !loading && <p className="empty">{c.noTurnsToday}</p>}
                {loading && <p className="empty">{c.loadingQueue}</p>}
                {turns.map(turn => (
                  <article className="turn-card" key={turn.id}>
                    <div className="ticket"><small>{turn.status}</small><strong>{turn.ticketNumber}</strong></div>
                    <div className="turn-copy"><strong>{turn.customerName || c.unnamedCustomer}</strong><span>{turn.serviceName}</span><small>{turn.barberName ? `${turn.barberName} · ${c.chair} ${turn.chairNumber}` : c.barberToAssign}</small></div>
                    <div className="turn-actions">
                      {turn.status === 'Waiting' && <>{barbers.filter(barber => barber.status === 'Available').map(barber => <button key={barber.id} disabled={busy} onClick={() => void transition(turn, 'call', barber.id)}>{c.callWith} {barber.name}</button>)}<button className="danger" disabled={busy} onClick={() => void transition(turn, 'cancel')}>{c.cancel}</button></>}
                      {turn.status === 'Called' && <><button disabled={busy} onClick={() => void transition(turn, 'start')}>{c.startService}</button><button className="danger" disabled={busy} onClick={() => void transition(turn, 'no-show')}>{c.noShow}</button></>}
                      {turn.status === 'InService' && <button className="success" disabled={busy} onClick={() => void transition(turn, 'complete')}>{c.complete}</button>}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <section className="dashboard-section" id="barbers-section">
            <div className="dashboard-section-title"><h2>{c.barbers}</h2><p>{c.teamAvailability}</p></div>
            <article className="panel"><div className="barber-grid">{barbers.map(barber => <div className="barber-card" key={barber.id}><span className={`status-dot ${barber.status.toLowerCase()}`} /><strong>{barber.name}</strong><span>{c.chair} {barber.chairNumber}</span><small>{barber.isActive ? barber.status : 'Inactivo'}</small><select value={barber.status} disabled={busy || !barber.isActive || barber.status === 'Busy'} onChange={event => void changeBarberStatus(barber, event.target.value as BarberStatus)}><option value="Available">{c.available}</option><option value="Break">{c.break}</option><option value="Offline">{c.offline}</option>{barber.status === 'Busy' && <option value="Busy">{c.busy}</option>}</select>{canManageCatalog && <div className="turn-actions"><button type="button" onClick={() => void editBarber(barber)}>Editar</button><button type="button" className={barber.isActive ? 'danger' : 'success'} onClick={() => void editBarber(barber, true)}>{barber.isActive ? 'Desactivar' : 'Activar'}</button></div>}</div>)}</div></article>

            {canManageCatalog && <article className="panel dashboard-section"><p className="eyebrow">{c.configuration}</p><h2>{c.newBarber}</h2><form className="form-stack" onSubmit={createBarber}><input name="name" placeholder={c.barberName} required /><input name="chairNumber" type="number" min="1" placeholder={c.chairNumber} required /><button className="primary" disabled={busy}><FontAwesomeIcon icon={faPlus} /> {c.addBarber}</button></form></article>}
          </section>

          {canManageCatalog && (
            <section className="dashboard-section" id="services-section">
              <div className="dashboard-section-title"><h2>{c.services}</h2><p>{c.servicesText}</p></div>
              <section className="management-grid">
                <article className="panel"><p className="eyebrow">{c.catalog}</p><h2>{c.newService}</h2><form className="form-stack" onSubmit={createService}><input name="name" placeholder={c.serviceName} required /><input name="price" type="number" min="0" step="0.01" placeholder={c.price} required /><input name="estimatedDurationMinutes" type="number" min="1" placeholder={c.duration} required /><input name="description" placeholder={c.optionalDescription} /><button className="primary" disabled={busy}><FontAwesomeIcon icon={faPlus} /> {c.addService}</button></form></article>
                <article className="panel"><p className="eyebrow">{c.activeServicesLabel}</p><h2>{activeServices} {c.availablePlural}</h2><div className="queue-summary">{services.slice(0, 12).map(service => <div className="queue-summary-item" key={service.id}><span className="queue-summary-ticket"><FontAwesomeIcon icon={faScissors} /></span><div className="queue-summary-copy"><strong>{service.name}</strong><span>RD${service.price} · {service.estimatedDurationMinutes} min · {service.isActive ? 'Activo' : 'Inactivo'}</span></div><div className="turn-actions"><button type="button" onClick={() => void editService(service)}>Editar</button><button type="button" className={service.isActive ? 'danger' : 'success'} onClick={() => void editService(service, true)}>{service.isActive ? 'Desactivar' : 'Activar'}</button></div></div>)}</div></article>
              </section>
            </section>
          )}

          <BusinessModules auth={auth} />

          <footer className="dashboard-footer"><span>© {currentYear} BarberTurn. {c.rights}</span><span>Tu turno. Tu estilo. Tu tiempo.</span></footer>
        </div>
      </section>
    </main>
  )
}
