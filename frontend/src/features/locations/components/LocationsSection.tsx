import { FormEvent, useCallback, useEffect, useState } from 'react'
import { api } from '../../../api'
import { showError, showSuccessToast } from '../../../alerts'
import LockedFeature from '../../../shared/components/LockedFeature'
import type { Location, Shop } from '../../../portals/admin/commercialTypes'

type Props = { isDemo: boolean; shop: Shop | null; onShopUpdated: () => Promise<void> }

export default function LocationsSection({ isDemo, shop, onShopUpdated }: Props) {
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
    try { await api('/api/shop/settings', { method: 'PUT', body: JSON.stringify({ name: data.get('name'), timeZoneId: data.get('timeZoneId') }) }); await onShopUpdated(); void showSuccessToast('Configuración actualizada') }
    catch (error) { await showError('No se pudo actualizar la barbería', error instanceof Error ? error.message : 'Error inesperado') }
    finally { setBusy(false) }
  }

  async function addLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true)
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())
    try { await api('/api/locations', { method: 'POST', body: JSON.stringify(data) }); form.reset(); await load(); await onShopUpdated(); void showSuccessToast('Sucursal agregada') }
    catch (error) { await showError('No se pudo completar la operación', error instanceof Error ? error.message : 'Error inesperado') }
    finally { setBusy(false) }
  }

  return (
    <section className="panel dashboard-section" id="locations-section">
      <p className="eyebrow">CONFIGURACIÓN Y SUCURSALES</p><h2>Mi barbería</h2>
      {isDemo ? <LockedFeature title="Configuración comercial y sucursales" text="La demo usa una barbería temporal y no permite alterar su configuración comercial." plan="Business" /> : <>{shop && <form className="business-form" onSubmit={updateShop}><input name="name" defaultValue={shop.name} required /><input name="timeZoneId" defaultValue={shop.timeZoneId} required /><button disabled={busy}>Guardar configuración</button></form>}<h3>Ubicaciones</h3><form className="business-form" onSubmit={addLocation}><input name="name" placeholder="Nombre" required /><input name="slug" placeholder="Identificador (ej. centro)" pattern="[a-z0-9-]+" required /><input name="address" placeholder="Dirección" /><input name="timeZoneId" defaultValue={shop?.timeZoneId ?? Intl.DateTimeFormat().resolvedOptions().timeZone} required /><button disabled={busy}>Agregar</button></form><div className="business-list compact">{locations.map(item => <article key={item.id}><strong>{item.name}</strong><span>{item.address || item.slug} · {item.timeZoneId}</span></article>)}</div></>}
    </section>
  )
}
