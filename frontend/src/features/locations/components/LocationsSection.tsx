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
    event.preventDefault(); setBusy(true)
    const data = new FormData(event.currentTarget)
    try { await api('/api/shop/settings', { method: 'PUT', body: JSON.stringify({ name: data.get('name'), timeZoneId: data.get('timeZoneId') }) }); await onShopUpdated(); void showSuccessToast(t('locations.settingsUpdated')) }
    catch (error) { await showError(t('locations.updateError'), apiErrorMessage(error, locale, t('locations.updateError'))) }
    finally { setBusy(false) }
  }

  async function addLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true)
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())
    try { await api('/api/locations', { method: 'POST', body: JSON.stringify(data) }); form.reset(); await load(); await onShopUpdated(); void showSuccessToast(t('locations.added')) }
    catch (error) { await showError(t('commercial.operationError'), apiErrorMessage(error, locale, t('commercial.operationError'))) }
    finally { setBusy(false) }
  }

  return (
    <section className="panel dashboard-section" id="locations-section">
      <p className="eyebrow">{t('locations.eyebrow')}</p><h2>{t('locations.title')}</h2>
      {isDemo ? <LockedFeature title={t('locations.lockedTitle')} text={t('locations.lockedText')} plan="Business" /> : <>{shop && <form className="business-form" onSubmit={updateShop}><input name="name" defaultValue={shop.name} required /><input name="timeZoneId" defaultValue={shop.timeZoneId} required /><button disabled={busy}>{t('locations.saveSettings')}</button></form>}<h3>{t('locations.locations')}</h3><form className="business-form" onSubmit={addLocation}><input name="name" placeholder={t('locations.name')} required /><input name="slug" placeholder={t('locations.slug')} pattern="[a-z0-9-]+" required /><input name="address" placeholder={t('locations.address')} /><input name="timeZoneId" defaultValue={shop?.timeZoneId ?? Intl.DateTimeFormat().resolvedOptions().timeZone} required /><button disabled={busy}>{t('locations.add')}</button></form><div className="business-list compact">{locations.map(item => <article key={item.id}><strong>{item.name}</strong><span>{item.address || item.slug} · {item.timeZoneId}</span></article>)}</div></>}
    </section>
  )
}
