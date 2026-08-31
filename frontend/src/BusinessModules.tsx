import type { Auth, Barber } from './types'
import './business-modules.css'
import './role-portals.css'
import type { Capabilities, Shop } from './portals/admin/commercialTypes'
import AppointmentsSection from './features/appointments/components/AppointmentsSection'
import CustomersSection from './features/customers/components/CustomersSection'
import PaymentsSection from './features/payments/components/PaymentsSection'
import ReportsSection from './features/reports/components/ReportsSection'
import TeamSection from './features/team/components/TeamSection'
import LocationsSection from './features/locations/components/LocationsSection'
import BillingSection from './features/billing/components/BillingSection'

type Props = {
  auth: Auth
  barbers: Barber[]
  isDemo: boolean
  isSystemAdmin: boolean
  shop: Shop | null
  capabilities: Capabilities | null
  onShopUpdated: () => Promise<void>
}

export default function BusinessModules({ auth, barbers, isDemo, isSystemAdmin, shop, capabilities, onShopUpdated }: Props) {
  const elevated = auth.role === 'Owner' || auth.role === 'Administrator'
  const hasOwnerAccess = auth.role === 'Owner' || isSystemAdmin

  return <>
    <AppointmentsSection isDemo={isDemo} shop={shop} capabilities={capabilities} />
    <CustomersSection isDemo={isDemo} />
    {elevated && <PaymentsSection isDemo={isDemo} />}
    {elevated && <ReportsSection isDemo={isDemo} capabilities={capabilities} />}
    {elevated && <TeamSection auth={auth} barbers={barbers} isDemo={isDemo} isSystemAdmin={isSystemAdmin} />}
    {hasOwnerAccess && <LocationsSection isDemo={isDemo} shop={shop} onShopUpdated={onShopUpdated} />}
    {hasOwnerAccess && <BillingSection isDemo={isDemo} shop={shop} capabilities={capabilities} />}
  </>
}
