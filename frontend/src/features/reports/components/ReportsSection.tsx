import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../../api'
import { apiErrorMessage } from '../../../apiErrorMessages'
import { useI18n } from '../../../i18n'
import LockedFeature from '../../../shared/components/LockedFeature'
import type { Capabilities, Report } from '../../../portals/admin/commercialTypes'
import '../reports.css'

type Props = { isDemo: boolean; capabilities: Capabilities | null }
type Preset = 7 | 30 | 90
type LegacyReport = Partial<Report> & { grossRevenue?: number }

const isoDate = (date: Date) => date.toISOString().slice(0, 10)
const daysAgo = (days: number) => isoDate(new Date(Date.now() - (days - 1) * 86400000))
const money = (locale: string, value: number, currency: string) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)

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
  const { locale, t } = useI18n()
  const change = percentChange(current, previous)
  if (change === null) return <span className="report-trend neutral">{t('reportsAdmin.noBase')}</span>
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  return <span className={`report-trend ${direction}`}>{change > 0 ? '+' : ''}{new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(change)}%</span>
}

export default function ReportsSection({ isDemo, capabilities }: Props) {
  const { locale, t } = useI18n()
  const [report, setReport] = useState<Report | null>(null)
  const [from, setFrom] = useState(() => daysAgo(30))
  const [to, setTo] = useState(() => isoDate(new Date()))
  const [currency, setCurrency] = useState('DOP')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const methodLabel = (method: string, fallback?: string) => {
    const known = new Set(['Cash', 'Card', 'Transfer', 'BankTransfer', 'PayPal', 'Other'])
    return known.has(method) ? t(`paymentsAdmin.method.${method}`) : fallback || t('paymentsAdmin.method.Other')
  }

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
      setError(apiErrorMessage(err, locale, t('reportsAdmin.loadError')))
    } finally {
      setLoading(false)
    }
  }, [capabilities?.canUseAdvancedReports, from, isDemo, locale, t, to])

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

  const printReport = () => {
    if (!report) return
    const previousTitle = document.title
    const printTitle = `${t('reportsAdmin.csvTitle')} ${report.from} - ${report.to}`
    const restoreTitle = () => {
      document.title = previousTitle
      window.removeEventListener('afterprint', restoreTitle)
    }

    document.title = printTitle
    window.addEventListener('afterprint', restoreTitle)
    window.print()
    window.setTimeout(restoreTitle, 1000)
  }

  const exportCsv = () => {
    if (!report) return
    const rows: Array<Array<string | number>> = [
      [t('reportsAdmin.csvTitle')],
      [t('reportsAdmin.period'), report.from, report.to],
      [t('reportsAdmin.currency'), currency],
      [],
      [t('reportsAdmin.metric'), t('reportsAdmin.current'), t('reportsAdmin.previous')],
      [t('reportsAdmin.completedTurns'), report.completedTurns, report.previousPeriod.completedTurns],
      [t('reportsAdmin.appointments'), report.appointments, report.previousPeriod.appointments],
      [t('reportsAdmin.noShowPercent'), report.noShowRatePercent, report.previousPeriod.noShowRatePercent],
      [t('reportsAdmin.revenue'), report.revenueByCurrency[currency] ?? 0, report.previousPeriod.revenueByCurrency[currency] ?? 0],
      [t('reportsAdmin.averageTicket'), report.averageTicketByCurrency[currency] ?? 0, report.previousPeriod.averageTicketByCurrency[currency] ?? 0],
      [],
      [t('reportsAdmin.barber'), t('reportsAdmin.completedServices'), t('reportsAdmin.activity'), `${t('reportsAdmin.revenue')} ${currency}`],
      ...report.revenueByBarber.map(item => [item.barberName, item.completedServices, item.activitySharePercent, item.revenueByCurrency[currency] ?? 0]),
      [],
      [t('reportsAdmin.service'), t('reportsAdmin.completedServices'), `${t('reportsAdmin.revenue')} ${currency}`],
      ...report.revenueByService.map(item => [item.serviceName, item.completedServices, item.revenueByCurrency[currency] ?? 0]),
      [],
      [t('reportsAdmin.paymentMethod'), t('reportsAdmin.operations'), `${t('reportsAdmin.revenue')} ${currency}`],
      ...report.revenueByMethod.map(item => [methodLabel(item.key, item.label), item.count, item.revenueByCurrency[currency] ?? 0]),
    ]
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
    const csv = `\uFEFF${rows.map(row => row.map(escape).join(',')).join('\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `barbertrix-report-${report.from}-${report.to}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (isDemo) return <section className="panel dashboard-section" id="reports-section"><LockedFeature title={t('reportsAdmin.lockedTitle')} text={t('reportsAdmin.demoLockedText')} plan="Business" /></section>
  if (!capabilities?.canUseAdvancedReports) return <section className="panel dashboard-section" id="reports-section"><LockedFeature title={t('reportsAdmin.lockedTitle')} text={t('reportsAdmin.planLockedText')} plan="Business" /></section>

  const revenue = report?.revenueByCurrency[currency] ?? 0
  const previousRevenue = report?.previousPeriod.revenueByCurrency[currency] ?? 0
  const averageTicket = report?.averageTicketByCurrency[currency] ?? 0
  const previousTicket = report?.previousPeriod.averageTicketByCurrency[currency] ?? 0
  const maxHour = Math.max(...(report?.peakHours.map(x => x.completedServices) ?? [0]), 1)

  return (
    <section className="panel dashboard-section reports-workspace" id="reports-section">
      <div className="reports-header">
        <div><p className="eyebrow">{t('reportsAdmin.eyebrow')}</p><h2>{t('reportsAdmin.title')}</h2><p className="muted">{t('reportsAdmin.lead')}</p></div>
        <div className="report-actions"><button type="button" className="secondary" onClick={exportCsv} disabled={!report}>{t('reportsAdmin.exportCsv')}</button><button type="button" className="secondary report-print-action" onClick={printReport} disabled={!report}>{t('reportsAdmin.print')}</button></div>
      </div>

      <div className="reports-toolbar" aria-label={t('reportsAdmin.filters')}>
        <div className="report-presets"><button type="button" onClick={() => applyPreset(7)}>{t('reportsAdmin.days', { days: 7 })}</button><button type="button" onClick={() => applyPreset(30)}>{t('reportsAdmin.days', { days: 30 })}</button><button type="button" onClick={() => applyPreset(90)}>{t('reportsAdmin.days', { days: 90 })}</button></div>
        <label>{t('reportsAdmin.from')}<input type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} /></label>
        <label>{t('reportsAdmin.to')}<input type="date" value={to} min={from} onChange={event => setTo(event.target.value)} /></label>
        <button type="button" className="primary" onClick={() => void load()} disabled={loading}>{loading ? t('reportsAdmin.updating') : t('reportsAdmin.apply')}</button>
        <label>{t('reportsAdmin.currency')}<select value={currency} onChange={event => setCurrency(event.target.value)}>{(currencies.length ? currencies : ['DOP']).map(item => <option key={item}>{item}</option>)}</select></label>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {report && <>
        <header className="report-print-header" aria-hidden="true">
          <img src="/branding/barbertrix-logo.png" alt="" />
          <div className="report-print-title">
            <span>{t('reportsAdmin.eyebrow')}</span>
            <h1>{t('reportsAdmin.title')}</h1>
            <p>{t('reportsAdmin.periodComparison', { from: report.from, to: report.to, previousFrom: report.previousPeriod.from, previousTo: report.previousPeriod.to })}</p>
          </div>
          <div className="report-print-meta">
            <strong>{currency}</strong>
            <span>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date())}</span>
          </div>
        </header>
        <p className="report-period">{t('reportsAdmin.periodComparison', { from: report.from, to: report.to, previousFrom: report.previousPeriod.from, previousTo: report.previousPeriod.to })}</p>
        <div className="report-kpis">
          <article><span>{t('reportsAdmin.revenue')}</span><strong>{money(locale, revenue, currency)}</strong><Trend current={revenue} previous={previousRevenue} /></article>
          <article><span>{t('reportsAdmin.averageTicket')}</span><strong>{money(locale, averageTicket, currency)}</strong><Trend current={averageTicket} previous={previousTicket} /></article>
          <article><span>{t('reportsAdmin.completedTurns')}</span><strong>{report.completedTurns}</strong><Trend current={report.completedTurns} previous={report.previousPeriod.completedTurns} /></article>
          <article><span>{t('reportsAdmin.noShow')}</span><strong>{new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(report.noShowRatePercent)}%</strong><Trend current={report.noShowRatePercent} previous={report.previousPeriod.noShowRatePercent} /></article>
          <article><span>{t('reportsAdmin.appointments')}</span><strong>{report.appointments}</strong><Trend current={report.appointments} previous={report.previousPeriod.appointments} /></article>
        </div>

        <div className="report-grid">
          <article className="report-card"><h3>{t('reportsAdmin.revenueByBarber')}</h3><div className="report-table"><div className="report-row heading"><span>{t('reportsAdmin.barber')}</span><span>{t('reportsAdmin.services')}</span><span>{t('reportsAdmin.activity')}</span><span>{t('reportsAdmin.revenue')}</span></div>{report.revenueByBarber.map(item => <div className="report-row" key={item.barberId}><span>{item.barberName}</span><span>{item.completedServices}</span><span>{new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(item.activitySharePercent)}%</span><strong>{money(locale, item.revenueByCurrency[currency] ?? 0, currency)}</strong></div>)}</div></article>
          <article className="report-card"><h3>{t('reportsAdmin.revenueByService')}</h3><div className="report-table"><div className="report-row service heading"><span>{t('reportsAdmin.service')}</span><span>{t('reportsAdmin.services')}</span><span>{t('reportsAdmin.revenue')}</span></div>{report.revenueByService.map(item => <div className="report-row service" key={item.serviceId}><span>{item.serviceName}</span><span>{item.completedServices}</span><strong>{money(locale, item.revenueByCurrency[currency] ?? 0, currency)}</strong></div>)}</div></article>
          <article className="report-card"><h3>{t('reportsAdmin.paymentMethods')}</h3><div className="payment-breakdown">{report.revenueByMethod.map(item => <div key={item.key}><div><strong>{methodLabel(item.key, item.label)}</strong><span>{t('reportsAdmin.operationCount', { count: item.count })}</span></div><strong>{money(locale, item.revenueByCurrency[currency] ?? 0, currency)}</strong></div>)}</div></article>
          <article className="report-card"><h3>{t('reportsAdmin.peakHours')}</h3><div className="peak-hours">{report.peakHours.slice(0, 8).map(item => <div key={item.hour}><span>{String(item.hour).padStart(2, '0')}:00</span><div><i style={{ width: `${Math.max((item.completedServices / maxHour) * 100, 4)}%` }} /></div><strong>{item.completedServices}</strong></div>)}</div><p className="muted report-note">{t('reportsAdmin.peakNote')}</p></article>
        </div>

        <footer className="report-print-footer" aria-hidden="true">
          <span>{t('reportsAdmin.csvTitle')}</span>
          <span>{report.from} - {report.to} · {currency}</span>
        </footer>
      </>}
    </section>
  )
}
