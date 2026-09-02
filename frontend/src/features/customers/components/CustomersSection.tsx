import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { apiErrorMessage } from '../../../apiErrorMessages'
import { showError, showSuccessToast } from '../../../alerts'
import { useI18n } from '../../../i18n'
import LockedFeature from '../../../shared/components/LockedFeature'
import type { Customer, CustomerProfile } from '../../../portals/admin/commercialTypes'
import {
  createCustomer,
  getCustomerProfile,
  listCustomers,
  updateCustomer,
  updateCustomerNotes,
} from '../api/customersApi'
import '../customers.css'

const localizedStatuses = new Set(['Confirmed', 'CheckedIn', 'Completed', 'Cancelled', 'NoShow'])

export default function CustomersSection({ isDemo }: { isDemo: boolean }) {
  const { locale, t } = useI18n()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const formatDate = (value?: string | null) => value
    ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
    : t('customersAdmin.noVisits')
  const formatAppointment = (value: string) => new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))
  const statusLabel = (status: string) => localizedStatuses.has(status) ? t(`customersAdmin.status.${status}`) : t('status.unknown')
  const spendLabel = (values: Record<string, number>) => {
    const entries = Object.entries(values)
    if (!entries.length) return t('customersAdmin.noPayments')
    return entries
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, amount]) => {
        try { return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount) }
        catch { return `${currency} ${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}` }
      })
      .join(' · ')
  }

  const loadCustomers = useCallback(async () => {
    if (isDemo) { setCustomers([]); return }
    setCustomers(await listCustomers())
  }, [isDemo])

  const loadProfile = useCallback(async (customerId: string) => {
    setProfileLoading(true)
    try {
      const next = await getCustomerProfile(customerId)
      setProfile(next)
      setNotes(next.notes ?? '')
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => { void loadCustomers().catch(() => undefined) }, [loadCustomers])
  useEffect(() => {
    if (!selectedId || isDemo) { setProfile(null); return }
    void loadProfile(selectedId).catch(() => setProfile(null))
  }, [isDemo, loadProfile, selectedId])

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale)
    if (!normalizedQuery) return customers

    return customers.filter(customer =>
      [customer.name, customer.phone, customer.email]
        .filter(Boolean)
        .some(value => value!.toLocaleLowerCase(locale).includes(normalizedQuery)),
    )
  }, [customers, locale, query])

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setBusy(true)
    try {
      const customer = await createCustomer({
        name: String(data.get('name') ?? '').trim(),
        phone: String(data.get('phone') ?? '').trim() || undefined,
        email: String(data.get('email') ?? '').trim() || undefined,
      })
      form.reset()
      await loadCustomers()
      setSelectedId(customer.id)
      void showSuccessToast(t('customersAdmin.added'))
    } catch (error) {
      await showError(t('customersAdmin.addError'), apiErrorMessage(error, locale, t('customersAdmin.addError')))
    } finally { setBusy(false) }
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    const data = new FormData(event.currentTarget)
    setBusy(true)
    try {
      await updateCustomer(profile.customer.id, {
        name: String(data.get('name') ?? '').trim(),
        phone: String(data.get('phone') ?? '').trim() || undefined,
        email: String(data.get('email') ?? '').trim() || undefined,
      })
      await Promise.all([loadCustomers(), loadProfile(profile.customer.id)])
      setEditing(false)
      void showSuccessToast(t('customersAdmin.updated'))
    } catch (error) {
      await showError(t('customersAdmin.updateError'), apiErrorMessage(error, locale, t('customersAdmin.updateError')))
    } finally { setBusy(false) }
  }

  async function saveNotes() {
    if (!profile) return
    setBusy(true)
    try {
      await updateCustomerNotes(profile.customer.id, notes.trim())
      await loadProfile(profile.customer.id)
      void showSuccessToast(t('customersAdmin.notesSaved'))
    } catch (error) {
      await showError(t('customersAdmin.notesError'), apiErrorMessage(error, locale, t('customersAdmin.notesError')))
    } finally { setBusy(false) }
  }

  return (
    <section className="panel dashboard-section customer-crm" id="customers-section">
      <div className="customer-crm-header">
        <div>
          <p className="eyebrow">{t('customersAdmin.eyebrow')}</p>
          <h2>{t('customersAdmin.title')}</h2>
          <p>{t('customersAdmin.lead')}</p>
        </div>
      </div>

      {isDemo ? <LockedFeature title={t('customersAdmin.lockedTitle')} text={t('customersAdmin.lockedText')} /> : <>
        <section className="customer-create-card">
          <strong>{t('customersAdmin.newCustomer')}</strong>
          <form className="business-form" onSubmit={create}>
            <input name="name" placeholder={t('customersAdmin.name')} required />
            <input name="phone" placeholder={t('customersAdmin.phone')} inputMode="tel" />
            <input name="email" type="email" placeholder={t('customersAdmin.email')} />
            <button disabled={busy}>{t('customersAdmin.add')}</button>
          </form>
        </section>

        <div className="customer-crm-layout">
          <section className="customer-directory" aria-label={t('customersAdmin.directory')}>
            <div className="business-toolbar">
              <input
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={t('customersAdmin.searchPlaceholder')}
                aria-label={t('customersAdmin.searchAria')}
              />
              <span>{t('customersAdmin.count', { filtered: filteredCustomers.length, total: customers.length })}</span>
            </div>

            <div className="customer-list">
              {filteredCustomers.map(item => <button
                type="button"
                key={item.id}
                className={`customer-list-button${selectedId === item.id ? ' active' : ''}`}
                onClick={() => { setEditing(false); setSelectedId(item.id) }}
              >
                <strong>{item.name}</strong>
                <span>{item.phone || item.email || t('customersAdmin.noContact')}</span>
                {item.phone && item.email && <small>{item.email}</small>}
              </button>)}
              {filteredCustomers.length === 0 && <p>{customers.length === 0 ? t('customersAdmin.noCustomers') : t('customersAdmin.noMatches')}</p>}
            </div>
          </section>

          <section className="customer-profile" aria-live="polite">
            {!selectedId && <div className="customer-profile-empty"><div><strong>{t('customersAdmin.selectTitle')}</strong><p>{t('customersAdmin.selectText')}</p></div></div>}
            {selectedId && profileLoading && !profile && <div className="customer-profile-empty"><strong>{t('customersAdmin.loadingProfile')}</strong></div>}

            {profile && <>
              <div className="customer-profile-heading">
                <div>
                  <p className="eyebrow">{t('customersAdmin.profileEyebrow')}</p>
                  <h3>{profile.customer.name}</h3>
                  <div className="customer-meta">{profile.customer.phone || t('customersAdmin.noPhone')} · {profile.customer.email || t('customersAdmin.noEmail')}</div>
                </div>
                <div className="customer-profile-actions">
                  <button type="button" className="secondary-link" onClick={() => setEditing(value => !value)}>{editing ? t('customersAdmin.closeEdit') : t('customersAdmin.editData')}</button>
                </div>
              </div>

              <div className="customer-metrics">
                <article className="customer-metric"><span>{t('customersAdmin.completedVisits')}</span><strong>{profile.completedVisits}</strong></article>
                <article className="customer-metric"><span>{t('customersAdmin.lastVisit')}</span><strong>{formatDate(profile.lastVisitAtUtc)}</strong></article>
                <article className="customer-metric"><span>{t('customersAdmin.lifetimeSpend')}</span><strong>{spendLabel(profile.lifetimeSpendByCurrency)}</strong></article>
              </div>

              {editing && <section className="customer-edit-card">
                <strong>{t('customersAdmin.editContact')}</strong>
                <form className="business-form" onSubmit={saveCustomer}>
                  <input name="name" defaultValue={profile.customer.name} placeholder={t('customersAdmin.name')} required />
                  <input name="phone" defaultValue={profile.customer.phone ?? ''} placeholder={t('customersAdmin.phone')} inputMode="tel" />
                  <input name="email" defaultValue={profile.customer.email ?? ''} type="email" placeholder={t('customersAdmin.email')} />
                  <button disabled={busy}>{t('customersAdmin.saveChanges')}</button>
                </form>
              </section>}

              <section className="customer-note-card">
                <strong>{t('customersAdmin.notesTitle')}</strong>
                <p className="customer-meta">{t('customersAdmin.notesText')}</p>
                <textarea value={notes} maxLength={1000} onChange={event => setNotes(event.target.value)} placeholder={t('customersAdmin.notesPlaceholder')} />
                <button type="button" disabled={busy || notes === (profile.notes ?? '')} onClick={() => void saveNotes()}>{t('customersAdmin.saveNotes')}</button>
              </section>

              <section className="customer-history-card">
                <strong>{t('customersAdmin.recentActivity')}</strong>
                <div className="customer-history-list">
                  {profile.recentAppointments.map(item => <article className="customer-appointment-card" key={item.id}>
                    <div><strong>{item.serviceName}</strong><small>{formatAppointment(item.startsAtUtc)} · {item.barberName}</small></div>
                    <span className="customer-status">{statusLabel(item.status)}</span>
                  </article>)}
                  {!profile.recentAppointments.length && <p className="customer-meta">{t('customersAdmin.noAppointments')}</p>}
                </div>
              </section>
            </>}
          </section>
        </div>
      </>}
    </section>
  )
}
