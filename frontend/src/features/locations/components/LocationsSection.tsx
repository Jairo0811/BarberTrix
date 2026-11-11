import { FormEvent, useCallback, useEffect, useState } from 'react'
import { api } from '../../../api'
import { apiErrorMessage } from '../../../apiErrorMessages'
import { showError, showSuccessToast } from '../../../alerts'
import { useI18n } from '../../../i18n'
import LockedFeature from '../../../shared/components/LockedFeature'
import type { Location, Shop } from '../../../portals/admin/commercialTypes'

type Props = { isDemo: boolean; shop: Shop | null; onShopUpdated: () => Promise<void> }

export default function LocationsSection({ isDemo, shop, onShopUpdated }: Props) {
  const { locale, t } = useI18n()
  const [locations, setLocations] = useState<Location[]>([])
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    if (isDemo) { setLocations([]); return }
    setLocations(await api<Location[]>('/api/locations'))
  }, [isDemo])
  useEffect(() => { void load().catch(() => undefined) }, [load])

  async function updateShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const timeZoneId = String(data.get('timeZoneId') ?? '').trim()
    try { new Intl.DateTimeFormat('en', { timeZone: timeZoneId }) }
    catch {
      await showError(t('locations.updateError'), locale.startsWith('es') ? 'Selecciona una zona horaria válida.' : 'Select a valid time zone.')
      return
    }
    setBusy(true)
    try { await api('/api/shop/settings', { method: 'PUT', body: JSON.stringify({ name, timeZoneId }) }); await onShopUpdated(); void showSuccessToast(t('locations.settingsUpdated')) }
    catch (error) { await showError(t('locations.updateError'), apiErrorMessage(error, locale, t('locations.updateError'))) }
    finally { setBusy(false) }
  }

  async function addLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())
    const payload = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]))
    try { new Intl.DateTimeFormat('en', { timeZone: String(payload.timeZoneId ?? '') }) }
    catch {
      await showError(t('commercial.operationError'), locale.startsWith('es') ? 'Selecciona una zona horaria válida.' : 'Select a valid time zone.')
      return
    }
    setBusy(true)
    try { await api('/api/locations', { method: 'POST', body: JSON.stringify(payload) }); form.reset(); await load(); await onShopUpdated(); void showSuccessToast(t('locations.added')) }
    catch (error) { await showError(t('commercial.operationError'), apiErrorMessage(error, locale, t('commercial.operationError'))) }
    finally { setBusy(false) }
  }

  return (
    <section className="panel dashboard-section" id="locations-section">
      <p className="eyebrow">{t('locations.eyebrow')}</p><h2>{t('locations.title')}</h2>
      {isDemo ? <LockedFeature title={t('locations.lockedTitle')} text={t('locations.lockedText')} plan="Business" /> : <>{shop && <form className="business-form" onSubmit={updateShop}>
        <label className="form-field-label">{t('locations.name')}<input name="name" defaultValue={shop.name} maxLength={120} required /></label>
        <label className="form-field-label">Zona horaria / Time zone<input name="timeZoneId" defaultValue={shop.timeZoneId} required /></label>
        <button disabled={busy}>{t('locations.saveSettings')}</button>
      </form>}<h3>{t('locations.locations')}</h3><form className="business-form" onSubmit={addLocation}>
        <label className="form-field-label">{t('locations.name')}<input name="name" placeholder={t('locations.name')} maxLength={120} required /></label>
        <label className="form-field-label">{t('locations.slug')}<input name="slug" placeholder={t('locations.slug')} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={48} required /></label>
        <label className="form-field-label">{t('locations.address')}<input name="address" placeholder={t('locations.address')} maxLength={300} /></label>
        <label className="form-field-label">Zona horaria / Time zone<input name="timeZoneId" defaultValue={shop?.timeZoneId ?? Intl.DateTimeFormat().resolvedOptions().timeZone} required /></label>
        <button disabled={busy}>{t('locations.add')}</button>
      </form><div className="business-list compact">{locations.map(item => <article key={item.id}><strong>{item.name}</strong><span>{item.address || item.slug} · {item.timeZoneId}</span></article>)}</div></>}
    </section>
  )
}
