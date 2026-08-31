import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../../api'
import LockedFeature from '../../../shared/components/LockedFeature'
import type { Capabilities, Report } from '../../../portals/admin/commercialTypes'
import '../reports.css'

type Props = { isDemo: boolean; capabilities: Capabilities | null }
type Preset = 7 | 30 | 90
type LegacyReport = Partial<Report> & { grossRevenue?: number }

const isoDate = (date: Date) => date.toISOString().slice(0, 10)
const daysAgo = (days: number) => isoDate(new Date(Date.now() - (days - 1) * 86400000))
const money = (value: number, currency: string) => new Intl.NumberFormat('es-DO', { style: 'currency', currency }).format(value)
const methodLabel: Record<string, string> = { Cash: 'Efectivo', Card: 'Tarjeta', BankTransfer: 'Transferencia', Other: 'Otro' }

function normalizeReport(data: LegacyReport, from: string, to: string): Report {
  const previous = data.previousPeriod ?? {
    from,
    to,
    completedTurns: 0,
    appointments: 0,
    noShows: 0,
    noShowRatePercent: 0,
    revenueByCurrency: {},
    averageTicketByCurrency: {},
  }
  return {
    from: data.from ?? from,
    to: data.to ?? to,
    completedTurns: data.completedTurns ?? 0,
    cancelledTurns: data.cancelledTurns ?? 0,
    noShows: data.noShows ?? 0,
    appointments: data.appointments ?? 0,
    noShowRatePercent: data.noShowRatePercent ?? 0,
    revenueByCurrency: data.revenueByCurrency ?? (data.grossRevenue ? { DOP: data.grossRevenue } : {}),
    averageTicketByCurrency: data.averageTicketByCurrency ?? {},
    revenueByMethod: data.revenueByMethod ?? [],
    revenueByBarber: data.revenueByBarber ?? [],
    revenueByService: data.revenueByService ?? [],
    peakHours: data.peakHours ?? [],
    previousPeriod: previous,
  }
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}

function Trend({ current, previous }: { current: number; previous: number }) {
  const change = percentChange(current, previous)
  if (change === null) return <span className="report-trend neutral">Sin base comparable</span>
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  return <span className={`report-trend ${direction}`}>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
}

export default function ReportsSection({ isDemo, capabilities }: Props) {
  const [report, setReport] = useState<Report | null>(null)
  const [from, setFrom] = useState(() => daysAgo(30))
  const [to, setTo] = useState(() => isoDate(new Date()))
  const [currency, setCurrency] = useState('DOP')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (start = from, end = to) => {
    if (isDemo || !capabilities?.canUseAdvancedReports) { setReport(null); return }
    setLoading(true)
    setError(null)
    try {
      const raw = await api<LegacyReport>(`/api/reports/business?from=${start}&to=${end}`)
      const data = normalizeReport(raw, start, end)
      setReport(data)
      const currencies = Object.keys(data.revenueByCurrency)
      setCurrency(current => currencies.includes(current) ? current : currencies[0] ?? 'DOP')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el reporte.')
    } finally {
      setLoading(false)
    }
  }, [capabilities?.canUseAdvancedReports, from, isDemo, to])

  useEffect(() => { void load() }, [capabilities?.canUseAdvancedReports, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  const currencies = useMemo(() => {
    const keys = new Set<string>(Object.keys(report?.revenueByCurrency ?? {}))
    Object.keys(report?.previousPeriod.revenueByCurrency ?? {}).forEach(key => keys.add(key))
    return [...keys].sort()
  }, [report])

  const applyPreset = (days: Preset) => {
    const end = isoDate(new Date())
    const start = daysAgo(days)
    setFrom(start)
    setTo(end)
    void load(start, end)
  }

  const exportCsv = () => {
    if (!report) return
    const rows: Array<Array<string | number>> = [
      ['BarberTurn · Business Reports 2.0'],
      ['Periodo', report.from, report.to],
      ['Moneda', currency],
      [],
      ['Indicador', 'Actual', 'Periodo anterior'],
      ['Turnos completados', report.completedTurns, report.previousPeriod.completedTurns],
      ['Citas', report.appointments, report.previousPeriod.appointments],
      ['No-show %', report.noShowRatePercent, report.previousPeriod.noShowRatePercent],
      ['Ingresos', report.revenueByCurrency[currency] ?? 0, report.previousPeriod.revenueByCurrency[currency] ?? 0],
      ['Ticket promedio', report.averageTicketByCurrency[currency] ?? 0, report.previousPeriod.averageTicketByCurrency[currency] ?? 0],
      [],
      ['Barbero', 'Servicios completados', 'Actividad %', `Ingresos ${currency}`],
      ...report.revenueByBarber.map(item => [item.barberName, item.completedServices, item.activitySharePercent, item.revenueByCurrency[currency] ?? 0]),
      [],
      ['Servicio', 'Servicios completados', `Ingresos ${currency}`],
      ...report.revenueByService.map(item => [item.serviceName, item.completedServices, item.revenueByCurrency[currency] ?? 0]),
      [],
      ['Método de pago', 'Operaciones', `Ingresos ${currency}`],
      ...report.revenueByMethod.map(item => [methodLabel[item.key] ?? item.label, item.count, item.revenueByCurrency[currency] ?? 0]),
    ]
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
    const csv = `\uFEFF${rows.map(row => row.map(escape).join(',')).join('\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `barberturn-report-${report.from}-${report.to}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (isDemo) return <section className="panel dashboard-section" id="reports-section"><LockedFeature title="Reportes avanzados" text="Los indicadores históricos y financieros completos se reservan para clientes de BarberTurn." plan="Business" /></section>
  if (!capabilities?.canUseAdvancedReports) return <section className="panel dashboard-section" id="reports-section"><LockedFeature title="Reportes avanzados" text="Desbloquea métricas históricas, ingresos y comportamiento operativo." plan="Business" /></section>

  const revenue = report?.revenueByCurrency[currency] ?? 0
  const previousRevenue = report?.previousPeriod.revenueByCurrency[currency] ?? 0
  const averageTicket = report?.averageTicketByCurrency[currency] ?? 0
  const previousTicket = report?.previousPeriod.averageTicketByCurrency[currency] ?? 0
  const maxHour = Math.max(...(report?.peakHours.map(x => x.completedServices) ?? [0]), 1)

  return (
    <section className="panel dashboard-section reports-workspace" id="reports-section">
      <div className="reports-header">
        <div><p className="eyebrow">BUSINESS REPORTS 2.0</p><h2>Analítica del negocio</h2><p className="muted">Compara rendimiento, ingresos y operación sin mezclar monedas.</p></div>
        <div className="report-actions"><button type="button" className="secondary" onClick={exportCsv} disabled={!report}>Exportar CSV</button><button type="button" className="secondary" onClick={() => window.print()} disabled={!report}>Imprimir / PDF</button></div>
      </div>

      <div className="reports-toolbar" aria-label="Filtros del reporte">
        <div className="report-presets"><button type="button" onClick={() => applyPreset(7)}>7 días</button><button type="button" onClick={() => applyPreset(30)}>30 días</button><button type="button" onClick={() => applyPreset(90)}>90 días</button></div>
        <label>Desde<input type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} /></label>
        <label>Hasta<input type="date" value={to} min={from} onChange={event => setTo(event.target.value)} /></label>
        <button type="button" className="primary" onClick={() => void load()} disabled={loading}>{loading ? 'Actualizando…' : 'Aplicar'}</button>
        <label>Moneda<select value={currency} onChange={event => setCurrency(event.target.value)}>{(currencies.length ? currencies : ['DOP']).map(item => <option key={item}>{item}</option>)}</select></label>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {report && <>
        <p className="report-period">{report.from} → {report.to} · comparación con {report.previousPeriod.from} → {report.previousPeriod.to}</p>
        <div className="report-kpis">
          <article><span>Ingresos</span><strong>{money(revenue, currency)}</strong><Trend current={revenue} previous={previousRevenue} /></article>
          <article><span>Ticket promedio</span><strong>{money(averageTicket, currency)}</strong><Trend current={averageTicket} previous={previousTicket} /></article>
          <article><span>Turnos completados</span><strong>{report.completedTurns}</strong><Trend current={report.completedTurns} previous={report.previousPeriod.completedTurns} /></article>
          <article><span>No-show</span><strong>{report.noShowRatePercent.toFixed(1)}%</strong><Trend current={report.noShowRatePercent} previous={report.previousPeriod.noShowRatePercent} /></article>
          <article><span>Citas</span><strong>{report.appointments}</strong><Trend current={report.appointments} previous={report.previousPeriod.appointments} /></article>
        </div>

        <div className="report-grid">
          <article className="report-card"><h3>Ingresos por barbero</h3><div className="report-table"><div className="report-row heading"><span>Barbero</span><span>Servicios</span><span>Actividad</span><span>Ingresos</span></div>{report.revenueByBarber.map(item => <div className="report-row" key={item.barberId}><span>{item.barberName}</span><span>{item.completedServices}</span><span>{item.activitySharePercent.toFixed(1)}%</span><strong>{money(item.revenueByCurrency[currency] ?? 0, currency)}</strong></div>)}</div></article>
          <article className="report-card"><h3>Ingresos por servicio</h3><div className="report-table"><div className="report-row service heading"><span>Servicio</span><span>Servicios</span><span>Ingresos</span></div>{report.revenueByService.map(item => <div className="report-row service" key={item.serviceId}><span>{item.serviceName}</span><span>{item.completedServices}</span><strong>{money(item.revenueByCurrency[currency] ?? 0, currency)}</strong></div>)}</div></article>
          <article className="report-card"><h3>Métodos de pago</h3><div className="payment-breakdown">{report.revenueByMethod.map(item => <div key={item.key}><div><strong>{methodLabel[item.key] ?? item.label}</strong><span>{item.count} operaciones</span></div><strong>{money(item.revenueByCurrency[currency] ?? 0, currency)}</strong></div>)}</div></article>
          <article className="report-card"><h3>Horas pico</h3><div className="peak-hours">{report.peakHours.slice(0, 8).map(item => <div key={item.hour}><span>{String(item.hour).padStart(2, '0')}:00</span><div><i style={{ width: `${Math.max((item.completedServices / maxHour) * 100, 4)}%` }} /></div><strong>{item.completedServices}</strong></div>)}</div><p className="muted report-note">Basado en servicios completados y convertido a la zona horaria de la barbería.</p></article>
        </div>
      </>}
    </section>
  )
}
