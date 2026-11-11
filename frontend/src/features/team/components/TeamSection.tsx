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
  const [role, setRole] = useState<'Administrator' | 'Receptionist' | 'Barber'>('Administrator')
  const [linkedBarberId, setLinkedBarberId] = useState('')
  const [chairNumber, setChairNumber] = useState('')
  const canDeactivateMembers = auth.role === 'Owner' || isSystemAdmin

  const roleLabel = (role: string) => role === 'Owner' ? t('owner') : role === 'Administrator' ? t('administrator') : role === 'Receptionist' ? t('role.receptionist') : role === 'Barber' ? t('role.barber') : role

  const load = useCallback(async () => {
    if (isDemo) { setTeam([]); return }
    setTeam(await api<TeamMember[]>('/api/team'))
  }, [isDemo])
  useEffect(() => { void load().catch(() => undefined) }, [load])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    const data = new FormData(form)
    const needsChair = role === 'Barber' && !linkedBarberId
    const parsedChair = needsChair ? Number(chairNumber) : null
    if (needsChair && (parsedChair === null || !Number.isInteger(parsedChair) || parsedChair <= 0)) {
      await showError(t('commercial.operationError'), locale.startsWith('es') ? 'Indica un número de silla válido.' : 'Enter a valid chair number.')
      return
    }
    setBusy(true)
    try {
      await api('/api/team/invitations', { method: 'POST', body: JSON.stringify({
        name: String(data.get('name') ?? '').trim(),
        email: String(data.get('email') ?? '').trim(),
        role,
        barberId: role === 'Barber' ? linkedBarberId || null : null,
        chairNumber: parsedChair,
      }) })
      form.reset()
      setRole('Administrator')
      setLinkedBarberId('')
      setChairNumber('')
      await load()
      void showSuccessToast(t('team.invitationCreated'))
    }
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
      {isDemo ? <LockedFeature title={t('team.lockedTitle')} text={t('team.lockedText')} /> : <><form className="business-form" onSubmit={submit}>
        <label>{t('team.name')}<input name="name" autoComplete="name" maxLength={120} placeholder={t('team.name')} required /></label>
        <label>{t('team.email')}<input name="email" type="email" autoComplete="email" maxLength={180} placeholder={t('team.email')} required /></label>
        <label>{locale.startsWith('es') ? 'Rol' : 'Role'}<select name="role" value={role} onChange={event => { setRole(event.target.value as typeof role); setLinkedBarberId(''); setChairNumber('') }}>
          <option value="Administrator">{t('administrator')}</option><option value="Receptionist">{t('role.receptionist')}</option><option value="Barber">{t('role.barber')}</option>
        </select></label>
        {role === 'Barber' && <>
          <label>{locale.startsWith('es') ? 'Barbero existente (opcional)' : 'Existing barber (optional)'}<select name="barberId" value={linkedBarberId} onChange={event => { setLinkedBarberId(event.target.value); setChairNumber('') }}>
            <option value="">{t('team.noBarberLink')}</option>{barbers.filter(x => x.isActive).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select></label>
          {!linkedBarberId && <label>{locale.startsWith('es') ? 'Número de silla para el nuevo barbero' : 'Chair number for new barber'}<input name="chairNumber" type="number" min="1" step="1" value={chairNumber} onChange={event => setChairNumber(event.target.value)} required /></label>}
        </>}
        <button disabled={busy}>{t('team.invite')}</button>
      </form><div className="business-list compact">{team.map(item => <article key={item.id}><strong>{item.name}</strong><span>{roleLabel(item.role)} · {item.isActive ? t('commercial.active') : t('commercial.inactive')}</span>{canDeactivateMembers && item.role !== 'Owner' && item.isActive && <button disabled={busy} onClick={() => void deactivateMember(item.id)}>{t('commercial.deactivate')}</button>}</article>)}</div></>}
    </section>
  )
}
