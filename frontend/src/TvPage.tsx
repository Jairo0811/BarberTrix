import { useEffect, useMemo, useState } from 'react'
import { HubConnectionBuilder } from '@microsoft/signalr'
import { API_URL } from './api'
import './tv.css'

type Display = { shopName: string; turns: { ticketNumber: string; status: string; barberName?: string; chairNumber?: number }[]; estimatedWaitMinutes: number; updatedAtUtc: string }
function queryShop() { return new URLSearchParams(location.hash.split('?')[1] ?? '').get('shop') ?? '' }

export default function TvPage() {
  const slug = useMemo(queryShop, [])
  const [display, setDisplay] = useState<Display | null>(null)
  const load = async () => { const response = await fetch(`${API_URL}/api/public/shops/${encodeURIComponent(slug)}/queue`); if (response.ok) setDisplay(await response.json() as Display) }
  useEffect(() => { if (!slug) return; void load(); const connection = new HubConnectionBuilder().withUrl(`${API_URL}/hubs/queue`).withAutomaticReconnect().build(); connection.on('queueChanged', () => void load()); void connection.start().then(() => connection.invoke('JoinPublicShop', slug)).catch(() => undefined); return () => { void connection.stop() } }, [slug])
  return <main className="tv-page"><header><img src="/branding/barberturn-logo.png" alt="BarberTurn" /><div><span>FILA EN VIVO</span><h1>{display?.shopName ?? 'BarberTurn TV'}</h1></div><aside><strong>{display?.estimatedWaitMinutes ?? 0} min</strong><small>espera estimada</small></aside></header><section className="tv-grid">{display?.turns.length ? display.turns.map(turn => <article className={turn.status.toLowerCase()} key={turn.ticketNumber}><strong>{turn.ticketNumber}</strong><span>{turn.status === 'Called' ? `Pasa con ${turn.barberName ?? 'tu barbero'}` : turn.status === 'InService' ? 'En servicio' : 'En espera'}</span>{turn.chairNumber && <small>Silla {turn.chairNumber}</small>}</article>) : <p>La fila está vacía en este momento.</p>}</section><footer>Actualizado {display ? new Date(display.updatedAtUtc).toLocaleTimeString() : 'ahora'} · Tu turno. Tu estilo. Tu tiempo.</footer></main>
}
