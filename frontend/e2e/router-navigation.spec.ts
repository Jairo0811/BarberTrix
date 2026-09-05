import { expect, test } from '@playwright/test'
import { installMockBackend, seedAuth } from './fixtures/mockBackend'

const owner = {
  accessToken: 'e2e-owner-token', expiresAtUtc: '2099-01-01T00:00:00Z',
  userId: 'owner-1', barberShopId: 'shop-1', name: 'Jairo', role: 'Owner', isEmailVerified: true,
}

const barber = {
  accessToken: 'e2e-barber-token', expiresAtUtc: '2099-01-01T00:00:00Z',
  userId: 'barber-1', barberShopId: 'shop-1', name: 'Barbero de Prueba', role: 'Barber', isEmailVerified: true,
}

test('admin deep links and browser history stay synchronized', async ({ page }) => {
  await seedAuth(page, owner)
  await installMockBackend(page, { plan: 'Business' })
  await page.goto('/#/app/customers')

  const customers = page.locator('.dashboard-nav button').filter({ hasText: 'Clientes' })
  const appointments = page.locator('.dashboard-nav button').filter({ hasText: 'Citas' })

  await expect(page).toHaveURL(/#\/app\/customers$/)
  await expect(customers).toHaveAttribute('aria-current', 'page')

  await appointments.click()
  await expect(page).toHaveURL(/#\/app\/appointments$/)
  await expect(appointments).toHaveAttribute('aria-current', 'page')

  await page.goBack()
  await expect(page).toHaveURL(/#\/app\/customers$/)
  await expect(customers).toHaveAttribute('aria-current', 'page')

  await page.goForward()
  await expect(page).toHaveURL(/#\/app\/appointments$/)
  await expect(appointments).toHaveAttribute('aria-current', 'page')
})

test('invalid and legacy admin hashes normalize to canonical routes', async ({ page }) => {
  await seedAuth(page, owner)
  await installMockBackend(page, { plan: 'Business' })

  await page.goto('/#/app/not-a-page')
  await expect(page).toHaveURL(/#\/app\/overview$/)

  await page.goto('/#billing-section')
  await expect(page).toHaveURL(/#\/app\/billing$/)
})

test('landing section anchors do not escape the HashRouter route', async ({ page }) => {
  await page.goto('/#/')
  await page.locator('a[href="#precios"]').first().click()

  await expect(page).toHaveURL(/#\/$/)
  await expect(page.locator('#precios')).toBeInViewport()
})

test('paid pricing selection is preserved when signup or login is required', async ({ page }) => {
  await page.goto('/#/')

  const proCard = page.locator('.pricing-card').filter({ hasText: 'Pro' })
  await proCard.getByRole('button', { name: /Pro/ }).click()

  await expect(page).toHaveURL(/#\/register\?plan=Pro$/)
  await expect(page.locator('.register-showcase')).toContainText('Pro')
  await expect(page.locator('.register-login-copy a')).toHaveAttribute('href', '#/login?plan=Pro')

  await page.goto('/#/')
  const freeCard = page.locator('.pricing-card').filter({ hasText: 'Free' })
  await freeCard.getByRole('button').click()
  await expect(page).toHaveURL(/#\/register$/)
})

test('authenticated owner goes directly from landing pricing to billing', async ({ page }) => {
  await seedAuth(page, owner)
  await installMockBackend(page, { plan: 'Free' })
  await page.goto('/#/')

  const proCard = page.locator('.pricing-card').filter({ hasText: 'Pro' })
  await proCard.getByRole('button', { name: /Pro/ }).click()

  await expect(page).toHaveURL(/#\/app\/billing\?plan=Pro$/)
})

test('authenticated barber is never sent to registration for a paid plan', async ({ page }) => {
  await seedAuth(page, barber)
  await page.goto('/#/')

  const businessCard = page.locator('.pricing-card').filter({ hasText: 'Business' })
  await businessCard.getByRole('button', { name: /Business/ }).click()

  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByText('El propietario administra la suscripción')).toBeVisible()
  await expect(page.getByText(/Tu sesión actual es Barber/)).toBeVisible()
})
