import { FormEvent, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faScissors } from '@fortawesome/free-solid-svg-icons'
import type { Service } from '../../../types'
import { showError, showSuccessToast } from '../../../alerts'
import { apiErrorMessage } from '../../../apiErrorMessages'
import { useI18n } from '../../../i18n'
import { createService, updateService } from '../../queue/api/queueApi'

type DashboardCopy = Record<string, string>
type Props = { services: Service[]; copy: DashboardCopy; onRefresh: () => Promise<void>; onError: (message: string) => void }

export default function ServicesSection({ services, copy: c, onRefresh, onError }: Props) {
  const { locale, t } = useI18n()
  const [busy, setBusy] = useState(false)
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

  async function edit(service: Service, toggleActive = false) {
    const name = toggleActive ? service.name : window.prompt(t('services.promptName'), service.name)
    if (!name) return
    const price = toggleActive ? String(service.price) : window.prompt(t('services.promptPrice'), String(service.price))
    const duration = toggleActive ? String(service.estimatedDurationMinutes) : window.prompt(t('services.promptDuration'), String(service.estimatedDurationMinutes))
    if (!price || !duration) return
    const updated = await runOperation(() => updateService(service, { name, price: Number(price), estimatedDurationMinutes: Number(duration), description: service.description ?? null, isActive: toggleActive ? !service.isActive : service.isActive }))
    if (updated) void showSuccessToast(t('services.updated'))
  }

  return (
    <section className="dashboard-section" id="services-section">
      <div className="dashboard-section-title"><h2>{c.services}</h2><p>{c.servicesText}</p></div>
      <section className="management-grid">
        <article className="panel"><p className="eyebrow">{c.catalog}</p><h2>{c.newService}</h2><form className="form-stack" onSubmit={create}><input name="name" placeholder={c.serviceName} required /><input name="price" type="number" min="0" step="0.01" placeholder={c.price} required /><input name="estimatedDurationMinutes" type="number" min="1" placeholder={c.duration} required /><input name="description" placeholder={c.optionalDescription} /><button className="primary" disabled={busy}><FontAwesomeIcon icon={faPlus} /> {c.addService}</button></form></article>
        <article className="panel"><p className="eyebrow">{c.activeServicesLabel}</p><h2>{activeServices} {c.availablePlural}</h2><div className="queue-summary">{services.slice(0, 12).map(service => <div className="queue-summary-item" key={service.id}><span className="queue-summary-ticket"><FontAwesomeIcon icon={faScissors} /></span><div className="queue-summary-copy"><strong>{service.name}</strong><span>{formatPrice(service.price)} · {service.estimatedDurationMinutes} min · {service.isActive ? t('commercial.active') : t('commercial.inactive')}</span></div><div className="turn-actions"><button type="button" onClick={() => void edit(service)}>{t('commercial.edit')}</button><button type="button" className={service.isActive ? 'danger' : 'success'} onClick={() => void edit(service, true)}>{service.isActive ? t('commercial.deactivate') : t('commercial.activate')}</button></div></div>)}</div></article>
      </section>
    </section>
  )
}
