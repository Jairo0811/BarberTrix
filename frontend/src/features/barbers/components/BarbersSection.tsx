import { FormEvent, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import type { Barber, BarberStatus } from '../../../types'
import { showError, showSuccessToast } from '../../../alerts'
import { apiErrorMessage } from '../../../apiErrorMessages'
import { useI18n } from '../../../i18n'
import { createBarber, updateBarber, updateBarberStatus, uploadBarberPhoto } from '../../queue/api/queueApi'
import { readAuth } from '../../../api'
import { BarberAvatar } from '../../../BarberAvatar'

type DashboardCopy = Record<string, string>
type Props = { barbers: Barber[]; canManage: boolean; copy: DashboardCopy; onRefresh: () => Promise<void>; onError: (message: string) => void }

export default function BarbersSection({ barbers, canManage, copy: c, onRefresh, onError }: Props) {
  const { locale, t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [photoVersion, setPhotoVersion] = useState(0)
  const [editing, setEditing] = useState<Barber | null>(null)
  const [editName, setEditName] = useState('')
  const [editChair, setEditChair] = useState('')
  const shopId = readAuth()?.barberShopId ?? null

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

  function beginEdit(barber: Barber) {
    setEditing(barber)
    setEditName(barber.name)
    setEditChair(String(barber.chairNumber))
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing || busy) return
    const chair = Number(editChair)
    if (!editName.trim() || !Number.isSafeInteger(chair) || chair < 1) {
      onError(locale.startsWith('es') ? 'Revisa el nombre y el número de silla.' : 'Review the name and chair number.')
      return
    }
    const updated = await runOperation(() => updateBarber(editing, {
      name: editName.trim(), chairNumber: chair, isActive: editing.isActive,
    }))
    if (updated) { setEditing(null); void showSuccessToast(t('barbers.updated')) }
  }

  async function toggleActive(barber: Barber) {
    const updated = await runOperation(() => updateBarber(barber, { name: barber.name, chairNumber: barber.chairNumber, isActive: !barber.isActive }))
    if (updated) { if (editing?.id === barber.id) setEditing(null); void showSuccessToast(t('barbers.updated')) }
  }

  return (
    <section className="dashboard-section" id="barbers-section">
      <div className="dashboard-section-title"><h2>{c.barbers}</h2><p>{c.teamAvailability}</p></div>
      <article className="panel"><div className="barber-grid">{barbers.map(barber => <div className="barber-card" key={barber.id}><span className={`status-dot ${barber.status.toLowerCase()}`} /><BarberAvatar shopId={shopId} barberId={barber.id} name={barber.name} version={photoVersion} className="barber-photo" /><strong>{barber.name}</strong><span>{c.chair} {barber.chairNumber}</span><small>{barber.isActive ? (barber.status === 'Available' ? c.available : barber.status === 'Break' ? c.break : barber.status === 'Busy' ? c.busy : c.offline) : t('commercial.inactive')}</small>{canManage && <label className="barber-photo-upload">{t('barbers.uploadPhoto')}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} hidden onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void runOperation(async () => { await uploadBarberPhoto(barber.id, file); setPhotoVersion(Date.now()) }) }} /></label>}<select aria-label={`${barber.name}: ${t('barber.myStatus')}`} value={barber.status} disabled={busy || !barber.isActive || barber.status === 'Busy'} onChange={event => void changeStatus(barber, event.target.value as BarberStatus)}><option value="Available">{c.available}</option><option value="Break">{c.break}</option><option value="Offline">{c.offline}</option>{barber.status === 'Busy' && <option value="Busy">{c.busy}</option>}</select>{canManage && <div className="turn-actions"><button type="button" onClick={() => beginEdit(barber)}>{t('commercial.edit')}</button><button type="button" className={barber.isActive ? 'danger' : 'success'} onClick={() => void toggleActive(barber)}>{barber.isActive ? t('commercial.deactivate') : t('commercial.activate')}</button></div>}</div>)}</div></article>
      {canManage && editing && <article className="panel dashboard-section"><h2>{t('commercial.edit')} · {editing.name}</h2>
        <form className="form-stack" onSubmit={saveEdit}>
          <label className="form-field-label">{c.barberName}<input value={editName} onChange={event => setEditName(event.target.value)} maxLength={120} required /></label>
          <label className="form-field-label">{c.chairNumber}<input value={editChair} onChange={event => setEditChair(event.target.value)} type="number" min="1" step="1" required /></label>
          <div className="turn-actions"><button type="button" className="secondary" disabled={busy} onClick={() => setEditing(null)}>{t('commercial.close')}</button><button className="primary" disabled={busy}>{t('customersAdmin.saveChanges')}</button></div>
        </form>
      </article>}
      {canManage && <article className="panel dashboard-section"><p className="eyebrow">{c.configuration}</p><h2>{c.newBarber}</h2><form className="form-stack" onSubmit={create}>
        <label className="form-field-label">{c.barberName}<input name="name" maxLength={120} placeholder={c.barberName} required /></label>
        <label className="form-field-label">{c.chairNumber}<input name="chairNumber" type="number" min="1" step="1" placeholder={c.chairNumber} required /></label>
        <button className="primary" disabled={busy}><FontAwesomeIcon icon={faPlus} /> {c.addBarber}</button>
      </form></article>}
    </section>
  )
}
