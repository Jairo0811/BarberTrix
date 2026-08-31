import { expect, test } from '@playwright/test'
import { installMockBackend, seedAuth } from './fixtures/mockBackend'

const owner = {
  accessToken: 'e2e-owner-token', expiresAtUtc: '2099-01-01T00:00:00Z',
  userId: 'owner-1', barberShopId: 'shop-1', name: 'Jairo', role: 'Owner', isEmailVerified: true,
}

test('commercial shared and appointment feature styles load together', async ({ page }) => {
  await seedAuth(page, owner)
  await installMockBackend(page, { plan: 'Pro' })
  await page.goto('/#/app/appointments')

  const toolbar = page.locator('.appointments-toolbar')
  const form = page.locator('.business-form.appointment-form')
  const selfService = page.locator('.booking-qr')

  await expect(toolbar).toBeVisible()
  await expect(form).toBeVisible()
  await expect(selfService).toBeVisible()

  await expect(toolbar).toHaveCSS('display', 'grid')
  await expect(form).toHaveCSS('display', 'grid')
  await expect(selfService).toHaveCSS('display', 'flex')
})
