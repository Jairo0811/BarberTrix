import { useEffect, useRef, useState, type FormEvent } from 'react'
import { HubConnectionBuilder } from '@microsoft/signalr'
import { API_URL, ApiClientError, publicApi } from './api'
import { useI18n } from './i18n'
import { turnStatusLabel } from './i18n/domainLabels'
import { getHomeAuxCopy } from './i18n/homeAuxCopy'
import { clampTvVolume, collectNewCalledTurns, TvNarrator } from './features/tv/tvNarration'
import { createTvRecovery } from './features/tv/tvRecovery'
import './tv.css'

type TvTurn = { ticketNumber: string; status: string; barberName?: string; chairNumber?: number }
type QueueDisplay = { shopName: string; turns: TvTurn[]; estimatedWaitMinutes: number; updatedAtUtc: string }
type TvSnapshot = { displayId: string; displayName: string; shopName: string; shopSlug: string; queue: QueueDisplay }
type PairResponse = { displayToken: string; displayId: string; displayName: string; shopName: string }
type ConnectionState = 'connected' | 'reconnecting' | 'offline'

const displayTokenStorageKey = 'barbertrix.tv.displayToken'
const audioEnabledStorageKey = 'barbertrix.tv.audioEnabled'
const audioVolumeStorageKey = 'barbertrix.tv.volume'
const displayTokenHeader = 'X-BarberTrix-TV-Token'
const defaultAudioVolume = 0.85

function readDisplayToken() {
  return localStorage.getItem(displayTokenStorageKey)?.trim() || null
}

function readAudioEnabled() {
  return localStorage.getItem(audioEnabledStorageKey) !== 'false'
}

function readAudioVolume() {
  const stored = localStorage.getItem(audioVolumeStorageKey)
  return stored === null ? defaultAudioVolume : clampTvVolume(Number(stored))
}

export default function TvPage() {
  const { locale, t } = useI18n()
  const [displayToken, setDisplayToken] = useState(readDisplayToken)
  const [snapshot, setSnapshot] = useState<TvSnapshot | null>(null)
  const [pairingCode, setPairingCode] = useState('')
  const [pairing, setPairing] = useState(false)
  const [pairingError, setPairingError] = useState('')
  const [connectionState, setConnectionState] = useState<ConnectionState>('offline')
  const [audioEnabled, setAudioEnabled] = useState(readAudioEnabled)
  const [audioVolume, setAudioVolume] = useState(readAudioVolume)
  const narratorRef = useRef<TvNarrator | null>(null)
  const calledTurnKeysRef = useRef<Set<string> | null>(null)
  const auxCopy = getHomeAuxCopy(locale)

  const getNarrator = () => {
    narratorRef.current ??= new TvNarrator()
    return narratorRef.current
  }

  useEffect(() => () => narratorRef.current?.cancel(), [])

  useEffect(() => {
    calledTurnKeysRef.current = null
    narratorRef.current?.cancel()
  }, [displayToken])

  useEffect(() => {
    if (!snapshot) {
      calledTurnKeysRef.current = null
      return
    }

    const delta = collectNewCalledTurns(calledTurnKeysRef.current, snapshot.queue.turns)
    calledTurnKeysRef.current = delta.currentKeys
    if (audioEnabled && delta.newTurns.length > 0) {
      getNarrator().announce(delta.newTurns, audioVolume)
    }
  }, [snapshot, audioEnabled, audioVolume])

  useEffect(() => {
    if (!displayToken) return

    let disposed = false
    let snapshotPending: Promise<void> | undefined
    let joined = false
    const connection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/queue`)
      .withAutomaticReconnect({ nextRetryDelayInMilliseconds: context => Math.min(30_000, 2_000 * context.previousRetryCount) })
      .build()
    connection.serverTimeoutInMilliseconds = 60_000
    connection.keepAliveIntervalInMilliseconds = 15_000

    const invalidate = () => {
      localStorage.removeItem(displayTokenStorageKey)
      if (!disposed) {
        setDisplayToken(null)
        setSnapshot(null)
        setConnectionState('offline')
      }
    }

    const loadSnapshot = (): Promise<void> => {
      if (snapshotPending) return snapshotPending
      snapshotPending = (async () => {
      try {
        const next = await publicApi<TvSnapshot>('/api/tv/session', { headers: { [displayTokenHeader]: displayToken } })
        if (!disposed) { setSnapshot(next); if (joined && connection.state === 'Connected') setConnectionState('connected') }
      } catch (error) {
        if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
          invalidate()
          return
        }
        if (!disposed) setConnectionState('offline')
      }
      })().finally(() => { snapshotPending = undefined })
      return snapshotPending
    }

    const joinDisplay = async () => {
      joined = await connection.invoke<boolean>('JoinTvDisplay', displayToken)
      if (!joined) {
        invalidate()
        return false
      }
      if (!disposed) setConnectionState('connected')
      return true
    }

    const recovery = createTvRecovery(connection, joinDisplay, loadSnapshot, () => { if (!disposed) setConnectionState('offline') })

    connection.on('queueChanged', () => void loadSnapshot())
    connection.onreconnecting(() => { joined = false; if (!disposed) setConnectionState('reconnecting') })
    connection.onreconnected(() => { void recovery.recover() })
    connection.onclose(() => {
      if (disposed) return
      joined = false
      setConnectionState('offline')
      recovery.retry()
    })

    void loadSnapshot()
    void recovery.recover()
    const foreground = () => { if (document.visibilityState === 'visible') { void loadSnapshot(); void recovery.recover() } }
    document.addEventListener('visibilitychange', foreground)
    const pollTimer = window.setInterval(() => void loadSnapshot(), 30_000)

    return () => {
      disposed = true
      window.clearInterval(pollTimer)
      recovery.dispose()
      document.removeEventListener('visibilitychange', foreground)
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

  function toggleAudio() {
    const next = !audioEnabled
    localStorage.setItem(audioEnabledStorageKey, String(next))
    setAudioEnabled(next)
    if (!next) narratorRef.current?.cancel()
  }

  function changeAudioVolume(nextPercent: number) {
    const next = clampTvVolume(nextPercent / 100)
    localStorage.setItem(audioVolumeStorageKey, String(next))
    setAudioVolume(next)
  }

  function testAudio() {
    if (!audioEnabled) {
      localStorage.setItem(audioEnabledStorageKey, 'true')
      setAudioEnabled(true)
    }
    getNarrator().test(audioVolume)
  }

  const calledTurns = snapshot?.queue.turns.filter(turn => turn.status === 'Called') ?? []
  const inServiceTurns = snapshot?.queue.turns.filter(turn => turn.status === 'InService') ?? []
  const waitingTurns = snapshot?.queue.turns.filter(turn => turn.status === 'Waiting') ?? []
  const updatedTime = snapshot
    ? new Date(snapshot.queue.updatedAtUtc).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : t('tv.now')

  if (!displayToken) return <main className="tv-page tv-setup-page">
    <section className="tv-setup-card">
      <img src="/branding/barbertrix-logo.png" alt="BarberTrix" />
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
    <img src="/branding/barbertrix-logo.png" alt="BarberTrix" />
    <h1>{t('tv.loadingDisplay')}</h1>
    <span className={`tv-connection ${connectionState}`}>{t(`tv.connection.${connectionState}`)}</span>
  </main>

  return <main className="tv-page">
    <header className="tv-header">
      <img src="/branding/barbertrix-logo.png" alt="BarberTrix" />
      <div><span className="tv-eyebrow">{t('tv.liveQueue')}</span><h1>{snapshot.shopName}</h1><small>{snapshot.displayName}</small></div>
      <aside>
        <strong>{snapshot.queue.estimatedWaitMinutes} min</strong>
        <small>{t('tv.estimatedWait')}</small>
        <span className={`tv-connection ${connectionState}`}>{t(`tv.connection.${connectionState}`)}</span>
        <div className="tv-audio-controls">
          <button type="button" className={audioEnabled ? 'active' : ''} aria-pressed={audioEnabled} onClick={toggleAudio}>
            {audioEnabled ? t('tv.audioOn') : t('tv.audioOff')}
          </button>
          <label className="tv-volume-control">
            <span>{t('tv.audioVolume')}</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={Math.round(audioVolume * 100)}
              aria-label={t('tv.audioVolume')}
              disabled={!audioEnabled}
              onChange={event => changeAudioVolume(Number(event.target.value))}
            />
          </label>
          <button type="button" onClick={testAudio}>{t('tv.audioTest')}</button>
        </div>
      </aside>
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
