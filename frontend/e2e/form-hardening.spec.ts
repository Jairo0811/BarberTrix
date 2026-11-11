import { expect, test } from '@playwright/test'
import { installMockBackend, seedAuth } from './fixtures/mockBackend'

const owner = {
  accessToken: 'e2e-owner-token', expiresAtUtc: '2099-01-01T00:00:00Z',
  userId: 'owner-1', barberShopId: 'shop-1', name: 'QA Owner',
  role: 'Owner', isEmailVerified: true,
}

test('new barber invitation sends a valid chair number without requiring a linked barber', async ({ page }) => {
  await seedAuth(page, owner)
  await installMockBackend(page, { plan: 'Business' })
  await page.goto('/#/app/team')

  const form = page.locator('#team-section form.business-form')
  await expect(form).toBeVisible()
  await form.locator('input[name="name"]').fill('Barbero de prueba')
  await form.locator('input[name="email"]').fill('barbero@example.com')
  await form.locator('select[name="role"]').selectOption('Barber')
  await expect(form.locator('input[name="chairNumber"]')).toBeVisible()
  await form.locator('input[name="chairNumber"]').fill('4')

  const request = page.waitForRequest(req => req.url().endsWith('/api/team/invitations') && req.method() === 'POST')
  await form.locator('button').last().click()
  const payload = (await request).postDataJSON() as Record<string, unknown>

  expect(payload.role).toBe('Barber')
  expect(payload.barberId).toBeNull()
  expect(payload.chairNumber).toBe(4)
})

test('public appointment form validates inputs and clears stale availability', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('barbertrix.locale', 'es-419'))
  await installMockBackend(page, { plan: 'Pro' })

  let submitted = 0
  await page.route('**/api/public/shops/central/appointments', async route => {
    if (route.request().method() !== 'POST') { await route.fallback(); return }
    submitted += 1
    const payload = route.request().postDataJSON() as Record<string, string>
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        appointment: {
          id: 'booking-audit-1', startsAtUtc: payload.startsAt,
          status: 'Confirmed', serviceName: 'Corte clásico', barberName: 'Carlos',
        },
        lookupToken: 'test-booking-token',
      }),
    })
  })

  await page.goto('/#/book?shop=central')
  await page.locator('.booking-tabs button').nth(1).click()
  const form = page.locator('.booking-form')
  await form.locator('input[name="serviceId"]').first().check({ force: true })
  await form.locator('input[name="customerName"]').fill('Ana Pérez')
  await form.locator('input[name="date"]').fill('2099-01-01')
  await form.locator('button[type="submit"], button:not([type])').first().click()
  await expect(form.locator('.slot-grid button')).toHaveCount(2)

  await form.locator('input[name="date"]').fill('2099-01-02')
  await expect(form.locator('.slot-grid button')).toHaveCount(0)
  await form.locator('button:not([type])').first().click()
  await expect(form.locator('.slot-grid button')).toHaveCount(2)

  await form.locator('input[name="customerName"]').fill('')
  await form.locator('.slot-grid button').first().click()
  expect(submitted).toBe(0)

  await form.locator('input[name="customerName"]').fill('Ana Pérez')
  await form.locator('input[name="customerEmail"]').fill('correo-no-valido')
  await form.locator('.slot-grid button').first().click()
  expect(submitted).toBe(0)

  await form.locator('input[name="customerEmail"]').fill('ana@example.com')
  await form.locator('.slot-grid button').first().click()
  await expect(page.getByText('Corte clásico')).toBeVisible()
  expect(submitted).toBe(1)
})

test('customer profile ignores a late response for a previously selected customer', async ({ page }) => {
  await seedAuth(page, owner)
  await installMockBackend(page, { plan: 'Business' })

  await page.route('**/api/customers/customer-1/profile', async route => {
    await new Promise(resolve => setTimeout(resolve, 500))
    await route.fallback()
  })

  await page.goto('/#/app/customers')
  const createForm = page.locator('.customer-create-card form')
  await createForm.locator('input[name="name"]').fill('Cliente B')
  await createForm.locator('button').click()
  await expect(page.locator('.customer-profile-heading h3')).toHaveText('Cliente B')

  await page.locator('.customer-list-button').filter({ hasText: 'Ana Pérez' }).click()
  await page.locator('.customer-list-button').filter({ hasText: 'Cliente B' }).click()
  await expect(page.locator('.customer-profile-heading h3')).toHaveText('Cliente B')
  await page.waitForTimeout(650)
  await expect(page.locator('.customer-profile-heading h3')).toHaveText('Cliente B')
})
