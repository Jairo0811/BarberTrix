import { FormEvent, useCallback, useEffect, useState } from 'react'
import { api } from '../../../api'
import { showError, showSuccessToast } from '../../../alerts'
import LockedFeature from '../../../shared/components/LockedFeature'
import type { Auth, Barber } from '../../../types'
import type { TeamMember } from '../../../portals/admin/commercialTypes'

type Props = { auth: Auth; barbers: Barber[]; isDemo: boolean }

export default function TeamSection({ auth, barbers, isDemo }: Props) {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    if (isDemo) { setTeam([]); return }
    setTeam(await api<TeamMember[]>('/api/team'))
  }, [isDemo])
  useEffect(() => { void load().catch(() => undefined) }, [load])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true)
    const form = event.currentTarget
    const data: Record<string, FormDataEntryValue | null> = Object.fromEntries(new FormData(form).entries())
    if (!data.barberId) data.barberId = null
    try { await api('/api/team/invitations', { method: 'POST', body: JSON.stringify(data) }); form.reset(); await load(); void showSuccessToast('Invitación creada') }
    catch (error) { await showError('No se pudo completar la operación', error instanceof Error ? error.message : 'Error inesperado') }
    finally { setBusy(false) }
  }

  async function deactivateMember(id: string) {
    setBusy(true)
    try { await api(`/api/team/${id}`, { method: 'DELETE' }); await load(); void showSuccessToast('Usuario desactivado') }
    catch (error) { await showError('No se pudo desactivar el usuario', error instanceof Error ? error.message : 'Error inesperado') }
    finally { setBusy(false) }
  }

  return (
    <section className="panel dashboard-section" id="team-section">
      <p className="eyebrow">EQUIPO Y PERMISOS</p><h2>Usuarios</h2>
      {isDemo ? <LockedFeature title="Equipo y permisos" text="Las invitaciones y cuentas de empleados están bloqueadas en la demostración." /> : <><form className="business-form" onSubmit={submit}><input name="name" placeholder="Nombre" required /><input name="email" type="email" placeholder="Correo" required /><select name="role"><option>Administrator</option><option>Receptionist</option><option>Barber</option></select><select name="barberId" defaultValue=""><option value="">Sin vínculo de barbero</option>{barbers.filter(x => x.isActive).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select><button disabled={busy}>Invitar</button></form><div className="business-list compact">{team.map(item => <article key={item.id}><strong>{item.name}</strong><span>{item.role} · {item.isActive ? 'Activo' : 'Inactivo'}</span>{auth.role === 'Owner' && item.role !== 'Owner' && item.isActive && <button disabled={busy} onClick={() => void deactivateMember(item.id)}>Desactivar</button>}</article>)}</div></>}
    </section>
  )
}
