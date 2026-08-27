import { useCallback, useEffect, useState } from 'react'
import { api } from '../../../api'
import LockedFeature from '../../../shared/components/LockedFeature'
import type { Capabilities, Report } from '../../../portals/admin/commercialTypes'

type Props = { isDemo: boolean; capabilities: Capabilities | null }

export default function ReportsSection({ isDemo, capabilities }: Props) {
  const [report, setReport] = useState<Report | null>(null)
  const load = useCallback(async () => {
    if (isDemo || !capabilities?.canUseAdvancedReports) { setReport(null); return }
    const now = new Date()
    const end = now.toISOString().slice(0, 10)
    const start = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
    setReport(await api<Report>(`/api/reports/business?from=${start}&to=${end}`))
  }, [capabilities?.canUseAdvancedReports, isDemo])
  useEffect(() => { void load().catch(() => undefined) }, [load])

  return (
    <section className="panel dashboard-section" id="reports-section">
      <p className="eyebrow">REPORTES</p><h2>Analítica del negocio</h2>
      {isDemo ? <LockedFeature title="Reportes avanzados" text="Los indicadores históricos y financieros completos se reservan para clientes de BarberTurn." plan="Business" /> : !capabilities?.canUseAdvancedReports ? <LockedFeature title="Reportes avanzados" text="Desbloquea métricas históricas, ingresos y comportamiento operativo." plan="Business" /> : <div className="business-metrics"><span><strong>{report?.completedTurns ?? 0}</strong> turnos completados</span><span><strong>{report?.appointments ?? 0}</strong> citas</span><span><strong>{report?.noShows ?? 0}</strong> no presentados</span><span><strong>RD${(report?.grossRevenue ?? 0).toFixed(2)}</strong> ingresos</span></div>}
    </section>
  )
}
