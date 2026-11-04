import { expect, test } from '@playwright/test'

test('showcase simulates a complete turn without persisting real data', async ({ page }) => {
  await page.goto('/#/showcase')
  await expect(page.getByRole('main', { name: 'BarberTrix Showcase' })).toBeVisible()
  await expect(page.getByText('Datos 100% ficticios')).toBeVisible()

  const modules = page.getByRole('navigation', { name: 'Secciones del showcase' })
  await modules.getByRole('button', { name: 'Fila digital' }).click()

  await page.getByPlaceholder('Ej.: Cliente Demo').fill('Cliente QA')
  await page.getByRole('button', { name: 'Generar turno' }).click()

  const ticket = page.locator('.bt-showcase-ticket').filter({ hasText: 'BT-018' })
  await expect(ticket).toContainText('Cliente QA')
  await expect(ticket).toContainText('En espera')

  await ticket.getByRole('button', { name: 'Llamar' }).click()
  await expect(ticket).toContainText('Llamado')
  await ticket.getByRole('button', { name: 'Atender' }).click()
  await expect(ticket).toContainText('En servicio')
  await ticket.getByRole('button', { name: 'Finalizar' }).click()
  await expect(ticket).toContainText('Finalizado')

  await page.getByRole('button', { name: 'Reiniciar demo' }).click()
  await expect(page.locator('.bt-showcase-ticket').filter({ hasText: 'BT-018' })).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Datos ficticios restablecidos.' })).toBeVisible()
})

test('client demo role cannot operate staff-only modules or call turns', async ({ page }) => {
  await page.goto('/#/showcase')
  const roleChooser = page.getByRole('group', { name: 'Explorar roles' })
  await roleChooser.getByRole('button', { name: /Cliente/ }).click()

  const modules = page.getByRole('navigation', { name: 'Secciones del showcase' })
  await expect(modules.getByRole('button', { name: 'CRM' })).toHaveCount(0)
  await expect(modules.getByRole('button', { name: 'Reportes' })).toHaveCount(0)

  await modules.getByRole('button', { name: 'Fila digital' }).click()
  const waitingTicket = page.locator('.bt-showcase-ticket').filter({ hasText: 'BT-016' })
  await expect(waitingTicket).toContainText('En espera')
  await expect(waitingTicket.getByRole('button', { name: 'Llamar' })).toHaveCount(0)
})
