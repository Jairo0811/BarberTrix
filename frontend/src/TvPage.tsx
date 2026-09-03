import { FormEvent, useEffect, useMemo, useState } from 'react'
import { HubConnectionBuilder } from '@microsoft/signalr'
import { API_URL, ApiClientError, publicApi } from './api'
import { useI18n } from './i18n'
import { turnStatusLabel } from './i18n/domainLabels'
import { getHomeAuxCopy } from './i18n/homeAuxCopy'
import './tv.css'

type TvTurn = { ticketNumber: string; status: string; barberName?: string; chairNumber?: number }
type QueueDisplay = { shopName: string; turns: TvTurn[]; estimatedWaitMinutes: number; updatedAtUtc: string }
type TvSnapshot = { displayId: string; displayName: string; shopName: string; shopSlug: string; queue: QueueDisplay }
type PairResponse = { displayToken: string; displayId: string; displayName: string; shopName: string }
type ConnectionState = 'connected' | 'reconnecting' | 'offline'

const displayTokenStorageKey = 'barbertrix.tv.displayToken'
const displayTokenHeader = 'X-BarberTrix-TV-Token'

function readDisplayToken() {
  return localStorage.getItem(displayTokenStorageKey)?.trim() || null
}

export default function TvPage() {
  const { locale, t } = useI18n()
  const [displayToken, setDisplayToken] = useState(readDisplayToken)
  const [snapshot, setSnapshot] = useState<TvSnapshot | null>(null)
  const [pairingCode, setPairingCode] = useState('')
  const [pairing, setPairing] = useState(false)
  const [pairingError, setPairingError] = useState('')
  const [connectionState, setConnectionState] = useState<ConnectionState>('offline')
  const auxCopy = getHomeAuxCopy(locale)

  useEffect(() => {
    if (!displayToken) return

    let disposed = false
    let retryTimer: number | undefined
    const connection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/queue`)
      .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
      .build()

    const invalidate = () => {
      localStorage.removeItem(displayTokenStorageKey)
      if (!disposed) {
        setDisplayToken(null)
        setSnapshot(null)
        setConnectionState('offline')
      }
    }

    const loadSnapshot = async () => {
      try {
        const next = await publicApi<TvSnapshot>('/api/tv/session', { headers: { [displayTokenHeader]: displayToken } })
        if (!disposed) setSnapshot(next)
      } catch (error) {
        if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
          invalidate()
          return
        }
        if (!disposed) setConnectionState('offline')
      }
    }

    const joinDisplay = async () => {
      const joined = await connection.invoke<boolean>('JoinTvDisplay', displayToken)
      if (!joined) {
        invalidate()
        return false
      }
      if (!disposed) setConnectionState('connected')
      return true
    }

    const startConnection = async () => {
      if (disposed) return
      try {
        await connection.start()
        if (await joinDisplay()) await loadSnapshot()
      } catch {
        if (!disposed) {
          setConnectionState('offline')
          retryTimer = window.setTimeout(() => void startConnection(), 5_000)
        }
      }
    }

    connection.on('queueChanged', () => void loadSnapshot())
    connection.onreconnecting(() => { if (!disposed) setConnectionState('reconnecting') })
    connection.onreconnected(() => { void joinDisplay().then(joined => { if (joined) void loadSnapshot() }) })
    connection.onclose(() => {
      if (disposed) return
      setConnectionState('offline')
      retryTimer = window.setTimeout(() => void startConnection(), 5_000)
    })

    void loadSnapshot()
    void startConnection()
    const pollTimer = window.setInterval(() => void loadSnapshot(), 30_000)

    return () => {
      disposed = true
      window.clearInterval(pollTimer)
      if (retryTimer) window.clearTimeout(retryTimer)
      void connection.stop()
    }
  }, [displayToken])

  async function pairDisplay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pairingCode.length !== 6) return
    setPairing(true); setPairingError('')
    try {
      const paired = await publicApi<PairResponse>('/api/tv/pair', {
        method: 'POST',
        body: JSON.stringify({ code: pairingCode }),
      })
      localStorage.setItem(displayTokenStorageKey, paired.displayToken)
      setDisplayToken(paired.displayToken)
      setPairingCode('')
    } catch {
      setPairingError(t('tv.pairingError'))
    } finally {
      setPairing(false)
    }
  }

  const calledTurns = snapshot?.queue.turns.filter(turn => turn.status === 'Called') ?? []
  const inServiceTurns = snapshot?.queue.turns.filter(turn => turn.status === 'InService') ?? []
  const waitingTurns = snapshot?.queue.turns.filter(turn => turn.status === 'Waiting') ?? []
  const updatedTime = snapshot
    ? new Date(snapshot.queue.updatedAtUtc).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : t('tv.now')

  if (!displayToken) return <main className="tv-page tv-setup-page">
    <section className="tv-setup-card">
      <img src="/branding/barberturn-logo.png" alt="BarberTrix" />
      <span className="tv-eyebrow">{t('tv.brand')}</span>
      <h1>{t('tv.setupTitle')}</h1>
      <p>{t('tv.setupText')}</p>
      <form onSubmit={pairDisplay}>
        <label htmlFor="tv-pairing-code">{t('tv.pairingCode')}</label>
        <input
          id="tv-pairing-code"
          value={pairingCode}
          onChange={event => setPairingCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          placeholder="000000"
          autoFocus
          required
        />
        <button type="submit" disabled={pairing || pairingCode.length !== 6}>{pairing ? t('tv.pairing') : t('tv.pairAction')}</button>
      </form>
      {pairingError && <p className="tv-setup-error" role="alert">{pairingError}</p>}
    </section>
  </main>

  if (!snapshot) return <main className="tv-page tv-loading-page">
    <img src="/branding/barberturn-logo.png" alt="BarberTrix" />
    <h1>{t('tv.loadingDisplay')}</h1>
    <span className={`tv-connection ${connectionState}`}>{t(`tv.connection.${connectionState}`)}</span>
  </main>

  return <main className="tv-page">
    <header className="tv-header">
      <img src="/branding/barberturn-logo.png" alt="BarberTrix" />
      <div><span className="tv-eyebrow">{t('tv.liveQueue')}</span><h1>{snapshot.shopName}</h1><small>{snapshot.displayName}</small></div>
      <aside><strong>{snapshot.queue.estimatedWaitMinutes} min</strong><small>{t('tv.estimatedWait')}</small><span className={`tv-connection ${connectionState}`}>{t(`tv.connection.${connectionState}`)}</span></aside>
    </header>

    <section className="tv-now-section" aria-live="polite">
      <span className="tv-section-label">{t('tv.nowCalling')}</span>
      {calledTurns.length ? <div className="tv-called-grid">{calledTurns.map(turn => <article className="tv-called-card" key={turn.ticketNumber}>
        <strong>{turn.ticketNumber}</strong>
        <span>{t('tv.goWith', { barber: turn.barberName ?? t('tv.yourBarber') })}</span>
        {turn.chairNumber && <small>{t('customer.chair', { chair: turn.chairNumber })}</small>}
      </article>)}</div> : <p className="tv-empty-state">{t('tv.noCalledTurn')}</p>}
    </section>

    <div className="tv-lower-grid">
      <section>
        <span className="tv-section-label">{t('tv.inServiceSection')}</span>
        <div className="tv-turn-list">
          {inServiceTurns.length ? inServiceTurns.map(turn => <article className="inservice" key={turn.ticketNumber}>
            <strong>{turn.ticketNumber}</strong><span>{turn.barberName ?? turnStatusLabel(t, turn.status)}</span>{turn.chairNumber && <small>{t('customer.chair', { chair: turn.chairNumber })}</small>}
          </article>) : <p className="tv-empty-state">{t('tv.noInService')}</p>}
        </div>
      </section>
      <section>
        <span className="tv-section-label">{t('tv.nextTurns')}</span>
        <div className="tv-turn-list waiting-list">
          {waitingTurns.length ? waitingTurns.slice(0, 12).map(turn => <article key={turn.ticketNumber}>
            <strong>{turn.ticketNumber}</strong><span>{turnStatusLabel(t, turn.status)}</span>
          </article>) : <p className="tv-empty-state">{t('tv.noWaiting')}</p>}
        </div>
      </section>
    </div>

    <footer>{t('tv.updated', { time: updatedTime })} · {auxCopy.slogan}</footer>
  </main>
}
