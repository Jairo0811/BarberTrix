import { expect, test } from '@playwright/test'
import { installMockBackend, seedAuth } from './fixtures/mockBackend'

const owner = {
  accessToken: 'e2e-owner-token', expiresAtUtc: '2099-01-01T00:00:00Z',
  userId: 'owner-1', barberShopId: 'shop-1', name: 'Jairo', role: 'Owner', isEmailVerified: true,
}

test('owner reviews and updates a customer CRM profile', async ({ page }) => {
  await seedAuth(page, owner)
  await installMockBackend(page, { plan: 'Business' })
  await page.goto('/#/app/customers')

  await expect(page.getByRole('heading', { name: 'CRM de clientes' })).toBeVisible()
  await page.getByRole('button', { name: /Ana Pérez/ }).click()

  const profile = page.locator('.customer-profile')
  await expect(profile.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible()
  await expect(profile.getByText('3', { exact: true })).toBeVisible()
  await expect(profile.getByText(/DOP\s*1,800\.00/)).toBeVisible()
  await expect(profile.getByText('Corte clásico')).toBeVisible()

  await profile.getByRole('button', { name: 'Editar datos' }).click()
  const editForm = profile.locator('.customer-edit-card form')
  await editForm.getByPlaceholder('Nombre').fill('Ana Pérez Gómez')
  await editForm.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(profile.getByRole('heading', { name: 'Ana Pérez Gómez' })).toBeVisible()

  const notes = profile.getByPlaceholder(/prefiere degradado bajo/i)
  await notes.fill('Prefiere degradado bajo y cita con Carlos.')
  await profile.getByRole('button', { name: 'Guardar notas' }).click()
  await expect(notes).toHaveValue('Prefiere degradado bajo y cita con Carlos.')
})
