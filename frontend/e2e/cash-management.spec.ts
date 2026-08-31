import { expect, test } from '@playwright/test'
import { installMockBackend, seedAuth } from './fixtures/mockBackend'

const owner = {
  accessToken: 'e2e-owner-token', expiresAtUtc: '2099-01-01T00:00:00Z',
  userId: 'owner-1', barberShopId: 'shop-1', name: 'Jairo', role: 'Owner', isEmailVerified: true,
}

test('owner opens, operates and reconciles a cash session', async ({ page }) => {
  await seedAuth(page, owner)
  await installMockBackend(page, { plan: 'Business' })
  await page.goto('/#/app/payments')

  await expect(page.getByRole('heading', { name: 'Control y conciliación' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Abre la caja antes de operar' })).toBeVisible()

  await page.getByLabel('Fondo inicial').fill('1000')
  await page.getByRole('button', { name: 'Abrir caja' }).click()
  await expect(page.locator('.cash-status.open')).toHaveText('Caja abierta · DOP')
  await expect(page.locator('.cash-kpis article.primary strong')).toContainText('1,000.00')

  const paymentCard = page.locator('.cash-card').filter({ hasText: 'Registrar pago' })
  await paymentCard.getByLabel('Monto').fill('500')
  await paymentCard.getByRole('button', { name: 'Registrar pago' }).click()
  await expect(page.locator('.cash-kpis article.primary strong')).toContainText('1,500.00')

  const movementCard = page.locator('.cash-card').filter({ hasText: 'Entrada o salida manual' })
  await movementCard.getByLabel('Monto').fill('100')
  await movementCard.getByLabel('Motivo').fill('Compra de insumos')
  await movementCard.getByRole('button', { name: 'Guardar movimiento' }).click()
  await expect(page.locator('.cash-kpis article.primary strong')).toContainText('1,400.00')
  await expect(page.getByText('Compra de insumos')).toBeVisible()

  const closeCard = page.locator('.cash-card').filter({ hasText: 'Conciliar caja' })
  await closeCard.getByLabel('Efectivo contado').fill('1390')
  await expect(closeCard.locator('.cash-difference strong')).toContainText('10.00')
  await closeCard.getByRole('button', { name: 'Cerrar caja' }).click()
  await page.locator('.swal2-confirm').click()

  await expect(page.getByRole('heading', { name: 'Abre la caja antes de operar' })).toBeVisible()
  await expect(page.locator('.cash-session-grid')).toContainText('1,400.00')
  await expect(page.locator('.cash-session-grid')).toContainText('1,390.00')
})
