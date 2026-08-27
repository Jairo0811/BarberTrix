import type { Auth, Barber } from './types'
import './business-modules.css'
import './role-portals.css'
import { useCommercialContext } from './portals/admin/hooks/useCommercialContext'
import AppointmentsSection from './features/appointments/components/AppointmentsSection'
import CustomersSection from './features/customers/components/CustomersSection'
import PaymentsSection from './features/payments/components/PaymentsSection'
import ReportsSection from './features/reports/components/ReportsSection'
import TeamSection from './features/team/components/TeamSection'
import LocationsSection from './features/locations/components/LocationsSection'
import BillingSection from './features/billing/components/BillingSection'

type Props = { auth: Auth; barbers: Barber[]; isDemo: boolean }

export default function BusinessModules({ auth, barbers, isDemo }: Props) {
  const elevated = auth.role === 'Owner' || auth.role === 'Administrator'
  const { shop, capabilities, refresh } = useCommercialContext()

  return <>
    <AppointmentsSection isDemo={isDemo} shop={shop} capabilities={capabilities} />
    <CustomersSection isDemo={isDemo} />
    {elevated && <PaymentsSection isDemo={isDemo} />}
    {elevated && <ReportsSection isDemo={isDemo} capabilities={capabilities} />}
    {elevated && <TeamSection auth={auth} barbers={barbers} isDemo={isDemo} />}
    {auth.role === 'Owner' && <LocationsSection isDemo={isDemo} shop={shop} onShopUpdated={refresh} />}
    {auth.role === 'Owner' && <BillingSection isDemo={isDemo} shop={shop} capabilities={capabilities} />}
  </>
}
