import { expect, test } from '@playwright/test'
import { barberAuth, installMockBackend, seedAuth } from './fixtures/mockBackend'

const owner = {
  accessToken: 'e2e-owner-token', expiresAtUtc: '2099-01-01T00:00:00Z',
  userId: 'owner-1', barberShopId: 'shop-1', name: 'Jairo', role: 'Owner', isEmailVerified: true,
}

test('commercial demo exposes core flow and locks sensitive modules', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('barberturn.locale', 'es-419'))
  await installMockBackend(page, { plan: 'Starter', demo: true })
  await page.goto('/#/demo')

  await expect(page.getByRole('heading', { name: 'Panel de demostración' })).toBeVisible()

  await page.getByRole('button', { name: 'Clientes' }).click()
  await expect(page).toHaveURL(/#\/app\/customers$/)
  await expect(page.getByText('🔒 CRM de clientes')).toBeVisible()

  await page.getByRole('button', { name: 'Reportes' }).click()
  await expect(page).toHaveURL(/#\/app\/reports$/)
  await expect(page.getByText('🔒 Reportes avanzados')).toBeVisible()

  await page.getByRole('button', { name: 'Suscripción' }).click()
  await expect(page).toHaveURL(/#\/app\/billing$/)
  await expect(page.getByText('🔒 Planes y suscripción')).toBeVisible()
})

test('barber opens the operational portal without administration access', async ({ page }) => {
  await seedAuth(page, barberAuth())
  await installMockBackend(page, { plan: 'Starter' })
  await page.goto('/#/login')

  await expect(page.getByRole('heading', { name: 'Tu trabajo de hoy, sin ruido administrativo.' })).toBeVisible()
  await expect(page.getByText('Portal del barbero')).toBeVisible()
  await expect(page.locator('#dashboard-sidebar')).toHaveCount(0)
  await expect(page.getByText('SUSCRIPCIÓN')).toHaveCount(0)
})

test('public customer portal loads without an authenticated account', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('barberturn.locale', 'es-419'))
  await installMockBackend(page, { plan: 'Pro' })
  await page.goto('/#/customer?shop=central')

  await expect(page.getByText('Portal del cliente')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tu turno, tu cita y tu barbería en un solo lugar.' })).toBeVisible()
  await expect(page.getByText('Corte clásico')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Tomar turno' })).toBeVisible()
})

test('Starter owner sees routed Pro paywalls and can access billing', async ({ page }) => {
  await seedAuth(page, owner)
  await installMockBackend(page, { plan: 'Starter', subscriptionStatus: 'Active' })
  await page.goto('/#/login')

  await expect(page.getByRole('heading', { name: 'Panel de administración' })).toBeVisible()

  await page.getByRole('button', { name: 'Citas' }).click()
  await expect(page).toHaveURL(/#\/app\/appointments$/)
  await expect(page.getByRole('link', { name: 'Disponible con BarberTurn Pro' })).toBeVisible()

  await page.getByRole('button', { name: 'Reportes' }).click()
  await expect(page).toHaveURL(/#\/app\/reports$/)
  await expect(page.getByRole('link', { name: 'Disponible con BarberTurn Business' })).toBeVisible()

  await page.getByRole('button', { name: 'Suscripción' }).click()
  await expect(page).toHaveURL(/#\/app\/billing$/)
  await expect(page.locator('#billing-section h2')).toHaveText('Starter · Activo')
})
