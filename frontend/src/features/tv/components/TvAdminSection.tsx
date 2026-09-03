import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../../api'
import { useI18n } from '../../../i18n'
import type { Capabilities } from '../../../portals/admin/commercialTypes'
import LockedFeature from '../../../shared/components/LockedFeature'
import '../tv-admin.css'

type TvDisplay = {
  id: string
  name: string
  isActive: boolean
  isPaired: boolean
  pairedAtUtc?: string | null
  lastSeenAtUtc?: string | null
  pairingExpiresAtUtc?: string | null
}

type Pairing = { displayId: string; code: string; expiresAtUtc: string }
type CreateResponse = { display: TvDisplay; pairing: Pairing }

type Props = { capabilities: Capabilities | null }

export default function TvAdminSection({ capabilities }: Props) {
  const { locale, t } = useI18n()
  const [displays, setDisplays] = useState<TvDisplay[]>([])
  const [pairings, setPairings] = useState<Record<string, Pairing>>({})
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const formatDateTime = useMemo(() => new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }), [locale])

  const load = useCallback(async () => {
    if (!capabilities?.canUseTv) return
    setLoading(true)
    setMessage('')
    try { setDisplays(await api<TvDisplay[]>('/api/tv/displays')) }
    catch { setMessage(t('tvAdmin.loadError')) }
    finally { setLoading(false) }
  }, [capabilities?.canUseTv, t])

  useEffect(() => { void load() }, [load])

  if (capabilities === null) return <section className="panel dashboard-section"><p>{t('app.loading')}</p></section>
  if (!capabilities.canUseTv) return <section className="panel dashboard-section"><LockedFeature title={t('tvAdmin.lockedTitle')} text={t('tvAdmin.lockedText')} plan="Pro" /></section>

  async function createDisplay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setLoading(true); setMessage('')
    try {
      const result = await api<CreateResponse>('/api/tv/displays', { method: 'POST', body: JSON.stringify({ name: trimmed }) })
      setDisplays(current => [...current.filter(item => item.id !== result.display.id), result.display].sort((a, b) => a.name.localeCompare(b.name, locale)))
      setPairings(current => ({ ...current, [result.display.id]: result.pairing }))
      setName('')
    } catch { setMessage(t('tvAdmin.operationError')) }
    finally { setLoading(false) }
  }

  async function issuePairing(displayId: string) {
    setBusyId(displayId); setMessage('')
    try {
      const pairing = await api<Pairing>(`/api/tv/displays/${displayId}/pairing`, { method: 'POST' })
      setPairings(current => ({ ...current, [displayId]: pairing }))
      await load()
    } catch { setMessage(t('tvAdmin.operationError')) }
    finally { setBusyId(null) }
  }

  async function revoke(display: TvDisplay) {
    if (!window.confirm(t('tvAdmin.confirmRevoke'))) return
    setBusyId(display.id); setMessage('')
    try {
      await api<void>(`/api/tv/displays/${display.id}`, { method: 'DELETE' })
      setPairings(current => { const next = { ...current }; delete next[display.id]; return next })
      await load()
    } catch { setMessage(t('tvAdmin.operationError')) }
    finally { setBusyId(null) }
  }

  async function copyCode(pairing: Pairing) {
    try {
      await navigator.clipboard.writeText(pairing.code)
      setMessage(t('tvAdmin.copied'))
    } catch { setMessage(t('tvAdmin.operationError')) }
  }

  function openTv() {
    const url = `${window.location.origin}${window.location.pathname}#/tv`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function isOnline(display: TvDisplay) {
    if (!display.isActive || !display.isPaired || !display.lastSeenAtUtc) return false
    return Date.now() - new Date(display.lastSeenAtUtc).getTime() <= 90_000
  }

  return <section className="dashboard-section tv-admin-section" id="tv-admin-section">
    <div className="dashboard-heading">
      <div><span className="dashboard-heading-kicker">Digital signage</span><h1>{t('tvAdmin.title')}</h1><p>{t('tvAdmin.subtitle')}</p></div>
      <button className="secondary" type="button" onClick={openTv}>{t('tvAdmin.openTv')}</button>
    </div>

    {message && <p className="banner" role="status">{message}</p>}

    <form className="tv-admin-create" onSubmit={createDisplay}>
      <label><span>{t('tvAdmin.displayName')}</span><input value={name} onChange={event => setName(event.target.value)} maxLength={120} placeholder={t('tvAdmin.displayPlaceholder')} required /></label>
      <button type="submit" disabled={loading || !name.trim()}>{loading ? t('tvAdmin.creating') : t('tvAdmin.create')}</button>
    </form>

    <div className="tv-admin-grid" aria-busy={loading}>
      {!loading && displays.length === 0 && <p className="empty">{t('tvAdmin.empty')}</p>}
      {displays.map(display => {
        const pairing = pairings[display.id]
        const online = isOnline(display)
        const lastSeen = display.lastSeenAtUtc ? formatDateTime.format(new Date(display.lastSeenAtUtc)) : t('tvAdmin.never')
        return <article className="tv-admin-card" key={display.id}>
          <header><div><h2>{display.name}</h2><span className={`tv-status ${online ? 'online' : 'offline'}`}>{online ? t('tvAdmin.online') : t('tvAdmin.offline')}</span></div><span className="tv-paired-state">{display.isPaired ? t('tvAdmin.paired') : t('tvAdmin.unpaired')}</span></header>
          <p>{t('tvAdmin.lastSeen', { time: lastSeen })}</p>

          {pairing && <div className="tv-pairing-card">
            <span>{t('tvAdmin.pairingCode')}</span>
            <strong>{pairing.code.slice(0, 3)} {pairing.code.slice(3)}</strong>
            <p>{t('tvAdmin.pairingHint')}</p>
            <small>{t('tvAdmin.expires', { time: formatDateTime.format(new Date(pairing.expiresAtUtc)) })}</small>
            <button className="secondary" type="button" onClick={() => void copyCode(pairing)}>{t('tvAdmin.copyCode')}</button>
          </div>}

          <div className="tv-admin-actions">
            <button type="button" disabled={busyId === display.id} onClick={() => void issuePairing(display.id)}>{t('tvAdmin.reissue')}</button>
            <button className="danger" type="button" disabled={busyId === display.id} onClick={() => void revoke(display)}>{t('tvAdmin.revoke')}</button>
          </div>
        </article>
      })}
    </div>
  </section>
}
