import { useState } from 'react'
import { api, clearAuth, readAuth } from './api'
import { useI18n } from './i18n'
import './legal.css'

export default function AccountDeletionPage() {
  const { locale } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const signedIn = Boolean(readAuth())
  const spanish = locale.toLowerCase().startsWith('es')
  const copy = spanish ? {
    title: 'Eliminación de cuenta',
    intro: 'Puedes iniciar aquí la eliminación permanente de tu cuenta de BarberTrix. También puedes hacerlo desde Ajustes en la app móvil.',
    owner: 'Si eres Owner, eliminar tu cuenta cierra el espacio de trabajo de la barbería, revoca el acceso del equipo y cancela una suscripción activa antes del cierre.',
    retention: 'Tu identidad se anonimiza. Los registros operativos, contables o de seguridad que deban conservarse permanecen únicamente durante el periodo necesario y separados de tu identidad.',
    signIn: 'Iniciar sesión para eliminar mi cuenta',
    action: 'Eliminar permanentemente mi cuenta',
    busy: 'Eliminando…',
    confirm: 'Esta acción no se puede deshacer. ¿Quieres eliminar permanentemente tu cuenta de BarberTrix?',
    failure: 'No se pudo eliminar la cuenta.',
    done: 'Tu cuenta fue eliminada. Volverás al inicio.',
    back: 'Volver al inicio',
  } : {
    title: 'Account deletion',
    intro: 'You can start permanent deletion of your BarberTrix account here. You can also do it from Settings in the mobile app.',
    owner: 'If you are an Owner, deleting your account closes the barbershop workspace, revokes team access and cancels an active subscription before shutdown.',
    retention: 'Your identity is anonymized. Operational, accounting or security records that must be retained remain only for the necessary period and detached from your identity.',
    signIn: 'Sign in to delete my account',
    action: 'Permanently delete my account',
    busy: 'Deleting…',
    confirm: 'This action cannot be undone. Permanently delete your BarberTrix account?',
    failure: 'Account deletion failed.',
    done: 'Your account was deleted. You will return to the home page.',
    back: 'Back to home',
  }

  const deleteAccount = async () => {
    if (busy || !window.confirm(copy.confirm)) return
    setBusy(true)
    setError('')
    try {
      await api('/api/account', { method: 'DELETE', body: JSON.stringify({ confirmation: 'DELETE' }) })
      clearAuth()
      window.alert(copy.done)
      window.location.hash = '#/'
      window.location.reload()
    } catch (exception) {
      setError(exception instanceof Error && exception.message ? exception.message : copy.failure)
    } finally {
      setBusy(false)
    }
  }

  return <main className="login-shell"><article className="login-card legal-card">
    <a className="back-home-link" href="#/">← {copy.back}</a>
    <img className="legal-logo" src="/branding/barbertrix-logo.png" alt="BarberTrix" />
    <h1>{copy.title}</h1>
    <p>{copy.intro}</p>
    <p>{copy.owner}</p>
    <p>{copy.retention}</p>
    {error && <p role="alert" className="login-error">{error}</p>}
    {signedIn
      ? <button className="login-submit" disabled={busy} onClick={() => { void deleteAccount() }}>{busy ? copy.busy : copy.action}</button>
      : <a className="login-submit" href="#/login">{copy.signIn}</a>}
  </article></main>
}
