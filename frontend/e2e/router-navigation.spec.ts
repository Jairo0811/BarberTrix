import { expect, test } from '@playwright/test'
import { installMockBackend, seedAuth } from './fixtures/mockBackend'

const owner = {
  accessToken: 'e2e-owner-token', expiresAtUtc: '2099-01-01T00:00:00Z',
  userId: 'owner-1', barberShopId: 'shop-1', name: 'Jairo', role: 'Owner', isEmailVerified: true,
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
  await page.getByRole('link', { name: 'Precios' }).click()

  await expect(page).toHaveURL(/#\/$/)
  await expect(page.locator('#precios')).toBeInViewport()
})
