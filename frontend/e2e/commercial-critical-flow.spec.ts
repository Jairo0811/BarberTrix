import { expect, test } from '@playwright/test'
import { installMockBackend } from './fixtures/mockBackend'

test('registration, login and full queue lifecycle', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('barbertrix.locale', 'es-419'))
  await installMockBackend(page, { plan: 'Business' })

  await page.goto('/#/register')
  await page.getByPlaceholder('Barbería Central').fill('Barbería Central')
  await page.getByPlaceholder('Tu nombre completo').fill('Jairo Matías')
  await page.getByPlaceholder('ejemplo@barberia.com').fill('jairo@example.com')
  await page.locator('input[name="password"]').fill('Secure123!')
  await page.locator('input[name="confirmPassword"]').fill('Secure123!')
  await page.locator('input[name="acceptedTerms"]').check()
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page.getByRole('heading', { name: 'Panel de administración' })).toBeVisible()

  await page.evaluate(() => {
    localStorage.removeItem('barbertrix.auth')
    sessionStorage.removeItem('barbertrix.auth')
  })
  await page.goto('/?e2e=login#/login')
  await page.getByPlaceholder('ejemplo@barberia.com').fill('jairo@example.com')
  await page.getByPlaceholder('••••••••••••').fill('Secure123!')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page.getByRole('heading', { name: 'Panel de administración' })).toBeVisible()

  await page.getByRole('button', { name: 'Cola en vivo' }).click()
  const queueSection = page.locator('#queue-section')
  await queueSection.locator('input[name="customerName"]').fill('Cliente E2E')
  await queueSection.locator('select[name="serviceId"]').selectOption('service-1')
  await queueSection.getByRole('button', { name: 'Generar turno' }).click()

  const turn = page.locator('.turn-card').filter({ hasText: 'BT-001' })
  await expect(turn).toContainText('Waiting')
  await turn.getByRole('button', { name: 'Llamar con Carlos' }).click()
  await expect(turn).toContainText('Called')
  await turn.getByRole('button', { name: 'Iniciar servicio' }).click()
  await expect(turn).toContainText('InService')
  await turn.getByRole('button', { name: 'Completar' }).click()
  await expect(turn).toContainText('Completed')
})
