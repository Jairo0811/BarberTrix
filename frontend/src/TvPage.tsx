import { useEffect, useMemo, useState } from 'react'
import { HubConnectionBuilder } from '@microsoft/signalr'
import { API_URL } from './api'
import { useI18n } from './i18n'
import { turnStatusLabel } from './i18n/domainLabels'
import { homeAuxCopy } from './i18n/homeAuxCopy'
import './tv.css'

type Display = {
  shopName: string
  turns: { ticketNumber: string; status: string; barberName?: string; chairNumber?: number }[]
  estimatedWaitMinutes: number
  updatedAtUtc: string
}

function queryShop() {
  return new URLSearchParams(location.hash.split('?')[1] ?? '').get('shop') ?? ''
}

export default function TvPage() {
  const { locale, t } = useI18n()
  const slug = useMemo(queryShop, [])
  const [display, setDisplay] = useState<Display | null>(null)
  const auxCopy = homeAuxCopy[locale as keyof typeof homeAuxCopy] ?? homeAuxCopy.en

  const load = async () => {
    const response = await fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/queue`)
    if (response.ok) setDisplay(await response.json() as Display)
  }

  useEffect(() => {
    if (!slug) return
    void load()

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/queue`)
      .withAutomaticReconnect()
      .build()

    connection.on('queueChanged', () => void load())
    void connection.start().then(() => connection.invoke('JoinTvShop', slug)).catch(() => undefined)
    return () => { void connection.stop() }
  }, [slug])

  const updatedTime = display
    ? new Date(display.updatedAtUtc).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : t('tv.now')

  return <main className="tv-page">
    <header>
      <img src="/branding/barberturn-logo.png" alt="BarberTurn" />
      <div><span>{t('tv.liveQueue')}</span><h1>{display?.shopName ?? 'BarberTurn TV'}</h1></div>
      <aside><strong>{display?.estimatedWaitMinutes ?? 0} min</strong><small>{t('tv.estimatedWait')}</small></aside>
    </header>

    <section className="tv-grid">
      {display?.turns.length
        ? display.turns.map(turn => <article className={turn.status.toLowerCase()} key={turn.ticketNumber}>
          <strong>{turn.ticketNumber}</strong>
          <span>{turn.status === 'Called'
            ? t('tv.goWith', { barber: turn.barberName ?? t('tv.yourBarber') })
            : turnStatusLabel(t, turn.status)}</span>
          {turn.chairNumber && <small>{t('customer.chair', { chair: turn.chairNumber })}</small>}
        </article>)
        : <p>{t('tv.empty')}</p>}
    </section>

    <footer>{t('tv.updated', { time: updatedTime })} · {auxCopy.slogan}</footer>
  </main>
}
