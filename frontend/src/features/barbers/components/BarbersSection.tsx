import { FormEvent, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import type { Barber, BarberStatus } from '../../../types'
import { showError, showSuccessToast } from '../../../alerts'
import { apiErrorMessage } from '../../../apiErrorMessages'
import { useI18n } from '../../../i18n'
import { createBarber, updateBarber, updateBarberStatus } from '../../queue/api/queueApi'

type DashboardCopy = Record<string, string>
type Props = { barbers: Barber[]; canManage: boolean; copy: DashboardCopy; onRefresh: () => Promise<void>; onError: (message: string) => void }

export default function BarbersSection({ barbers, canManage, copy: c, onRefresh, onError }: Props) {
  const { locale, t } = useI18n()
  const [busy, setBusy] = useState(false)

  async function runOperation(operation: () => Promise<unknown>) {
    setBusy(true); onError('')
    try { await operation(); await onRefresh(); return true }
    catch (exception) { const message = apiErrorMessage(exception, locale, c.operationError); onError(message); await showError(c.operationError, message); return false }
    finally { setBusy(false) }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    if (await runOperation(() => createBarber({ name: data.get('name'), chairNumber: Number(data.get('chairNumber')) }))) { form.reset(); void showSuccessToast(c.addedBarber) }
  }

  async function changeStatus(barber: Barber, status: BarberStatus) {
    if (await runOperation(() => updateBarberStatus(barber.id, status))) void showSuccessToast(c.statusUpdated)
  }

  async function edit(barber: Barber, toggleActive = false) {
    const name = toggleActive ? barber.name : window.prompt(t('barbers.promptName'), barber.name)
    if (!name) return
    const chairInput = toggleActive ? String(barber.chairNumber) : window.prompt(t('barbers.promptChair'), String(barber.chairNumber))
    if (!chairInput) return
    const updated = await runOperation(() => updateBarber(barber, { name, chairNumber: Number(chairInput), isActive: toggleActive ? !barber.isActive : barber.isActive }))
    if (updated) void showSuccessToast(t('barbers.updated'))
  }

  return (
    <section className="dashboard-section" id="barbers-section">
      <div className="dashboard-section-title"><h2>{c.barbers}</h2><p>{c.teamAvailability}</p></div>
      <article className="panel"><div className="barber-grid">{barbers.map(barber => <div className="barber-card" key={barber.id}><span className={`status-dot ${barber.status.toLowerCase()}`} /><strong>{barber.name}</strong><span>{c.chair} {barber.chairNumber}</span><small>{barber.isActive ? (barber.status === 'Available' ? c.available : barber.status === 'Break' ? c.break : barber.status === 'Busy' ? c.busy : c.offline) : t('commercial.inactive')}</small><select value={barber.status} disabled={busy || !barber.isActive || barber.status === 'Busy'} onChange={event => void changeStatus(barber, event.target.value as BarberStatus)}><option value="Available">{c.available}</option><option value="Break">{c.break}</option><option value="Offline">{c.offline}</option>{barber.status === 'Busy' && <option value="Busy">{c.busy}</option>}</select>{canManage && <div className="turn-actions"><button type="button" onClick={() => void edit(barber)}>{t('commercial.edit')}</button><button type="button" className={barber.isActive ? 'danger' : 'success'} onClick={() => void edit(barber, true)}>{barber.isActive ? t('commercial.deactivate') : t('commercial.activate')}</button></div>}</div>)}</div></article>
      {canManage && <article className="panel dashboard-section"><p className="eyebrow">{c.configuration}</p><h2>{c.newBarber}</h2><form className="form-stack" onSubmit={create}><input name="name" placeholder={c.barberName} required /><input name="chairNumber" type="number" min="1" placeholder={c.chairNumber} required /><button className="primary" disabled={busy}><FontAwesomeIcon icon={faPlus} /> {c.addBarber}</button></form></article>}
    </section>
  )
}
