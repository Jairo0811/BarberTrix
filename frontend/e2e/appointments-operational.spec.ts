import { expect, test } from '@playwright/test'
import { installMockBackend, seedAuth } from './fixtures/mockBackend'

const owner = {
  accessToken: 'e2e-owner-token', expiresAtUtc: '2099-01-01T00:00:00Z',
  userId: 'owner-1', barberShopId: 'shop-1', name: 'Jairo', role: 'Owner', isEmailVerified: true,
}

test('owner creates and reschedules an appointment from the operational agenda', async ({ page }) => {
  await seedAuth(page, owner)
  await installMockBackend(page, { plan: 'Pro' })
  await page.goto('/#/app/appointments')

  await expect(page.getByRole('heading', { name: 'Agenda de citas' })).toBeVisible()
  await expect(page.getByText('Agenda despejada')).toBeVisible()

  const form = page.locator('.appointment-form-card')
  await form.getByPlaceholder('Nombre del cliente').fill('Ana Pérez')
  await form.getByPlaceholder('Teléfono').fill('8095550101')
  await form.getByRole('combobox').nth(0).selectOption('service-1')
  await form.getByRole('combobox').nth(1).selectOption('barber-1')
  await expect(form.getByRole('combobox').nth(2).locator('option')).toHaveCount(3)
  await form.getByRole('combobox').nth(2).selectOption({ index: 1 })
  await form.getByRole('button', { name: 'Crear cita' }).click()

  await expect(page.getByText('Ana Pérez')).toBeVisible()
  await expect(page.getByText('Corte clásico · Carlos')).toBeVisible()
  await expect(page.locator('.appointment-status').getByText('Confirmada', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Reprogramar' }).click()
  const modal = page.getByRole('dialog', { name: 'Ana Pérez' })
  await expect(modal).toBeVisible()
  await expect(modal.getByRole('combobox').nth(1).locator('option')).toHaveCount(3)
  await modal.getByRole('combobox').nth(1).selectOption({ index: 2 })
  await modal.getByRole('button', { name: 'Guardar cambio' }).click()

  await expect(modal).toHaveCount(0)
  await expect(page.getByText('Ana Pérez')).toBeVisible()
})
