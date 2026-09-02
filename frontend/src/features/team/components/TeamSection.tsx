import { FormEvent, useCallback, useEffect, useState } from 'react'
import { api } from '../../../api'
import { apiErrorMessage } from '../../../apiErrorMessages'
import { showError, showSuccessToast } from '../../../alerts'
import { useI18n } from '../../../i18n'
import LockedFeature from '../../../shared/components/LockedFeature'
import type { Auth, Barber } from '../../../types'
import type { TeamMember } from '../../../portals/admin/commercialTypes'

type Props = { auth: Auth; barbers: Barber[]; isDemo: boolean; isSystemAdmin: boolean }

export default function TeamSection({ auth, barbers, isDemo, isSystemAdmin }: Props) {
  const { locale, t } = useI18n()
  const [team, setTeam] = useState<TeamMember[]>([])
  const [busy, setBusy] = useState(false)
  const canDeactivateMembers = auth.role === 'Owner' || isSystemAdmin

  const roleLabel = (role: string) => role === 'Owner' ? t('owner') : role === 'Administrator' ? t('administrator') : role === 'Receptionist' ? t('role.receptionist') : role === 'Barber' ? t('role.barber') : role

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
    try { await api('/api/team/invitations', { method: 'POST', body: JSON.stringify(data) }); form.reset(); await load(); void showSuccessToast(t('team.invitationCreated')) }
    catch (error) { await showError(t('commercial.operationError'), apiErrorMessage(error, locale, t('commercial.operationError'))) }
    finally { setBusy(false) }
  }

  async function deactivateMember(id: string) {
    setBusy(true)
    try { await api(`/api/team/${id}`, { method: 'DELETE' }); await load(); void showSuccessToast(t('team.userDeactivated')) }
    catch (error) { await showError(t('team.deactivateError'), apiErrorMessage(error, locale, t('team.deactivateError'))) }
    finally { setBusy(false) }
  }

  return (
    <section className="panel dashboard-section" id="team-section">
      <p className="eyebrow">{t('team.eyebrow')}</p><h2>{t('team.title')}</h2>
      {isDemo ? <LockedFeature title={t('team.lockedTitle')} text={t('team.lockedText')} /> : <><form className="business-form" onSubmit={submit}><input name="name" placeholder={t('team.name')} required /><input name="email" type="email" placeholder={t('team.email')} required /><select name="role"><option value="Administrator">{t('administrator')}</option><option value="Receptionist">{t('role.receptionist')}</option><option value="Barber">{t('role.barber')}</option></select><select name="barberId" defaultValue=""><option value="">{t('team.noBarberLink')}</option>{barbers.filter(x => x.isActive).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select><button disabled={busy}>{t('team.invite')}</button></form><div className="business-list compact">{team.map(item => <article key={item.id}><strong>{item.name}</strong><span>{roleLabel(item.role)} · {item.isActive ? t('commercial.active') : t('commercial.inactive')}</span>{canDeactivateMembers && item.role !== 'Owner' && item.isActive && <button disabled={busy} onClick={() => void deactivateMember(item.id)}>{t('commercial.deactivate')}</button>}</article>)}</div></>}
    </section>
  )
}
