import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../../../api'
import { showError, showSuccessToast } from '../../../alerts'
import LockedFeature from '../../../shared/components/LockedFeature'
import type { Appointment, Capabilities, Shop } from '../../../portals/admin/commercialTypes'

type Props = { isDemo: boolean; shop: Shop | null; capabilities: Capabilities | null }

export default function AppointmentsSection({ isDemo, shop, capabilities }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [bookingQr, setBookingQr] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!capabilities?.canUseAppointments) { setAppointments([]); return }
    const now = new Date()
    const future = new Date(now.getTime() + 30 * 86400000)
    setAppointments(await api<Appointment[]>(`/api/appointments?from=${encodeURIComponent(now.toISOString())}&to=${encodeURIComponent(future.toISOString())}`))
  }, [capabilities?.canUseAppointments])

  useEffect(() => { void load().catch(() => undefined) }, [load])
  useEffect(() => {
    if (!shop) { setBookingQr(''); return }
    void QRCode.toDataURL(`${location.origin}/#/customer?shop=${encodeURIComponent(shop.slug)}`, { width: 320, margin: 2, color: { dark: '#09111f', light: '#ffffff' } }).then(setBookingQr)
  }, [shop])

  async function appointmentAction(id: string, action: 'check-in' | 'complete' | 'no-show' | 'cancel') {
    setBusy(true)
    try {
      await api(`/api/appointments/${id}${action === 'cancel' ? '' : `/${action}`}`, { method: action === 'cancel' ? 'DELETE' : 'POST' })
      await load()
      void showSuccessToast('Cita actualizada')
    } catch (error) {
      await showError('No se pudo actualizar la cita', error instanceof Error ? error.message : 'Error inesperado')
    } finally { setBusy(false) }
  }

  return (
    <section className="panel dashboard-section" id="appointments-section">
      <div className="panel-heading"><div><p className="eyebrow">AGENDA HÍBRIDA</p><h2>Próximas citas</h2></div>{shop && capabilities?.canUseAppointments && <a className="secondary-link" href={`#/customer?shop=${shop.slug}`}>Portal del cliente</a>}</div>
      {!capabilities?.canUseAppointments ? <LockedFeature title="Citas y agenda híbrida" text="Reserva horarios, combina citas con turnos por llegada y gestiona la agenda del equipo." /> : <>
        {bookingQr && <div className="booking-qr"><img src={bookingQr} alt="Código QR del portal de clientes" /><div><strong>QR de autoservicio</strong><span>Lleva al portal del cliente para tomar turnos o reservar.</span><a href={bookingQr} download={`barberturn-${shop?.slug ?? 'clientes'}-qr.png`}>Descargar QR</a></div></div>}
        <div className="business-list">{appointments.length ? appointments.map(item => <article key={item.id}><strong>{item.customerName}</strong><span>{item.serviceName} · {item.barberName}</span><small>{new Date(item.startsAtUtc).toLocaleString()} · {item.status}</small>{!isDemo && <div className="billing-actions">{item.status === 'Confirmed' && <><button disabled={busy} onClick={() => void appointmentAction(item.id, 'check-in')}>Check-in</button><button disabled={busy} onClick={() => void appointmentAction(item.id, 'no-show')}>No llegó</button><button disabled={busy} onClick={() => void appointmentAction(item.id, 'cancel')}>Cancelar</button></>}{item.status === 'CheckedIn' && <button disabled={busy} onClick={() => void appointmentAction(item.id, 'complete')}>Completar</button>}</div>}</article>) : <p>No hay citas próximas.</p>}</div>
      </>}
    </section>
  )
}
