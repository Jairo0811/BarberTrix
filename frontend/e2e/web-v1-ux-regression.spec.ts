import { expect, test, type Page } from '@playwright/test'
import { barberAuth, installMockBackend, seedAuth } from './fixtures/mockBackend'

type DashboardRole = 'Owner' | 'Administrator' | 'Receptionist'

const baseAuth = {
  accessToken: 'e2e-final-qa-token',
  expiresAtUtc: '2099-01-01T00:00:00Z',
  userId: 'qa-user-1',
  barberShopId: 'shop-1',
  name: 'QA User',
  isEmailVerified: true,
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
}

for (const role of ['Owner', 'Administrator', 'Receptionist'] satisfies DashboardRole[]) {
  test(`${role} dashboard keeps its empty state usable on mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await seedAuth(page, { ...baseAuth, role })
    await installMockBackend(page, { plan: 'Business' })

    await page.goto('/#/login')

    await expect(page.locator('#queue-section')).toBeVisible()
    await expect(page.locator('#queue-list .turn-list .empty')).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
}

test('barber portal exposes empty operational states without mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedAuth(page, barberAuth())
  await installMockBackend(page, { plan: 'Business' })

  await page.goto('/#/login')

  await expect(page.getByRole('heading', { name: 'Tu trabajo de hoy, sin ruido administrativo.' })).toBeVisible()
  await expect(page.getByText('No tienes un cliente activo.')).toBeVisible()
  await expect(page.getByText('No hay clientes pendientes.')).toBeVisible()
  await expect(page.getByText('No tienes citas próximas.')).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('customer portal remains responsive on desktop tablet and mobile', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('barberturn.locale', 'es-419'))
  await installMockBackend(page, { plan: 'Pro' })

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 820, height: 1180 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/#/customer?shop=central')
    await expect(page.getByRole('heading', { name: 'Tu turno, tu cita y tu barbería en un solo lugar.' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tomar turno' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  }
})

test('customer portal exposes deterministic loading and error feedback', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('barberturn.locale', 'es-419'))
  await installMockBackend(page, { plan: 'Pro' })
  await page.route('http://localhost:8080/api/public/shops/central', async route => {
    await new Promise(resolve => setTimeout(resolve, 500))
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'E2E_PUBLIC_SHOP_FAILURE' }),
    })
  })

  await page.goto('/#/customer?shop=central')

  await expect(page.getByText('Cargando servicios…')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveText('No encontramos esta barbería.')
})
