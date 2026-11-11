import { FormEvent, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faScissors } from '@fortawesome/free-solid-svg-icons'
import type { Service } from '../../../types'
import { confirmDestructive, showError, showSuccessToast } from '../../../alerts'
import { apiErrorMessage } from '../../../apiErrorMessages'
import { useI18n } from '../../../i18n'
import { createService, updateService } from '../../queue/api/queueApi'

type DashboardCopy = Record<string, string>
type Props = { services: Service[]; copy: DashboardCopy; onRefresh: () => Promise<void>; onError: (message: string) => void }

export default function ServicesSection({ services, copy: c, onRefresh, onError }: Props) {
  const { locale, t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editDuration, setEditDuration] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const activeServices = services.filter(service => service.isActive).length
  const formatPrice = (value: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'DOP' }).format(value)

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
    const created = await runOperation(() => createService({ name: data.get('name'), price: Number(data.get('price')), estimatedDurationMinutes: Number(data.get('estimatedDurationMinutes')), description: data.get('description') || null }))
    if (created) { form.reset(); void showSuccessToast(c.addedService) }
  }

  function beginEdit(service: Service) {
    setEditing(service)
    setEditName(service.name)
    setEditPrice(String(service.price))
    setEditDuration(String(service.estimatedDurationMinutes))
    setEditDescription(service.description ?? '')
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing || busy) return
    const price = Number(editPrice)
    const duration = Number(editDuration)
    if (!editName.trim() || !Number.isFinite(price) || price < 0 || !Number.isSafeInteger(duration) || duration < 1) {
      onError(locale.startsWith('es') ? 'Revisa el nombre, el precio y la duración.' : 'Review the name, price and duration.')
      return
    }
    const updated = await runOperation(() => updateService(editing, {
      name: editName.trim(), price, estimatedDurationMinutes: duration,
      description: editDescription.trim() || null, isActive: editing.isActive,
    }))
    if (updated) { setEditing(null); void showSuccessToast(t('services.updated')) }
  }

  async function toggleActive(service: Service) {
    if (busy) return
    if (service.isActive) {
      const confirmed = await confirmDestructive(t('commercial.deactivate'), service.name, t('commercial.deactivate'))
      if (!confirmed) return
    }
    const updated = await runOperation(() => updateService(service, {
      name: service.name, price: service.price, estimatedDurationMinutes: service.estimatedDurationMinutes,
      description: service.description ?? null, isActive: !service.isActive,
    }))
    if (updated) { if (editing?.id === service.id) setEditing(null); void showSuccessToast(t('services.updated')) }
  }

  return (
    <section className="dashboard-section" id="services-section">
      <div className="dashboard-section-title"><h2>{c.services}</h2><p>{c.servicesText}</p></div>
      <section className="management-grid">
        <article className="panel"><p className="eyebrow">{c.catalog}</p><h2>{c.newService}</h2><form className="form-stack" onSubmit={create}>
          <label className="form-field-label">{c.serviceName}<input name="name" maxLength={120} placeholder={c.serviceName} required /></label>
          <label className="form-field-label">{c.price}<input name="price" type="number" min="0" step="0.01" placeholder={c.price} required /></label>
          <label className="form-field-label">{c.duration}<input name="estimatedDurationMinutes" type="number" min="1" step="1" placeholder={c.duration} required /></label>
          <label className="form-field-label">{c.optionalDescription}<input name="description" maxLength={500} placeholder={c.optionalDescription} /></label>
          <button className="primary" disabled={busy}><FontAwesomeIcon icon={faPlus} /> {c.addService}</button>
        </form></article>
        <article className="panel"><p className="eyebrow">{c.activeServicesLabel}</p><h2>{activeServices} {c.availablePlural}</h2><div className="queue-summary">{services.slice(0, 12).map(service => <div className="queue-summary-item" key={service.id}><span className="queue-summary-ticket"><FontAwesomeIcon icon={faScissors} /></span><div className="queue-summary-copy"><strong>{service.name}</strong><span>{formatPrice(service.price)} · {service.estimatedDurationMinutes} min · {service.isActive ? t('commercial.active') : t('commercial.inactive')}</span></div><div className="turn-actions"><button type="button" onClick={() => beginEdit(service)}>{t('commercial.edit')}</button><button type="button" className={service.isActive ? 'danger' : 'success'} onClick={() => void toggleActive(service)}>{service.isActive ? t('commercial.deactivate') : t('commercial.activate')}</button></div></div>)}</div></article>
      </section>
      {editing && <article className="panel dashboard-section">
        <h2>{t('commercial.edit')} · {editing.name}</h2>
        <form className="form-stack" onSubmit={saveEdit}>
          <label className="form-field-label">{c.serviceName}<input value={editName} onChange={event => setEditName(event.target.value)} maxLength={120} required /></label>
          <label className="form-field-label">{c.price}<input type="number" min="0" step="0.01" value={editPrice} onChange={event => setEditPrice(event.target.value)} required /></label>
          <label className="form-field-label">{c.duration}<input type="number" min="1" step="1" value={editDuration} onChange={event => setEditDuration(event.target.value)} required /></label>
          <label className="form-field-label">{c.optionalDescription}<input maxLength={500} value={editDescription} onChange={event => setEditDescription(event.target.value)} /></label>
          <div className="turn-actions"><button type="button" className="secondary" disabled={busy} onClick={() => setEditing(null)}>{t('commercial.close')}</button><button className="primary" disabled={busy}>{t('customersAdmin.saveChanges')}</button></div>
        </form>
      </article>}
    </section>
  )
}
