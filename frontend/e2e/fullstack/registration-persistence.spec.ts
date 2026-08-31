import { expect, test } from '@playwright/test'

test('owner registration persists through the real API and SQL Server', async ({ page }) => {
  const suffix = crypto.randomUUID().slice(0, 8)
  const shopName = `Fullstack Barber ${suffix}`
  const ownerName = `Owner ${suffix}`
  const email = `fullstack-${suffix}@example.com`
  const password = 'Fullstack123!'

  await page.goto('/#/register')

  await page.locator('input[name="shopName"]').fill(shopName)
  await page.locator('input[name="name"]').fill(ownerName)
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.locator('input[name="confirmPassword"]').fill(password)
  await page.locator('input[name="acceptedTerms"]').check()

  const registrationResponse = page.waitForResponse(response =>
    response.url().endsWith('/api/auth/register-owner') && response.request().method() === 'POST')
  const initialMetricsResponse = page.waitForResponse(response =>
    response.url().endsWith('/api/queue/metrics') && response.request().method() === 'GET')

  await page.locator('button.register-submit').click()

  expect((await registrationResponse).ok()).toBeTruthy()
  expect((await initialMetricsResponse).ok()).toBeTruthy()
  await expect(page).toHaveURL(/#\/app\/overview$/)
  await expect(page).toHaveTitle(/Panel \| BarberTurn/)
  await expect(page.getByRole('heading', { name: 'Panel de administración' })).toBeVisible()
  await expect(page.locator('#queue-section')).toHaveCount(0)

  await page.getByRole('button', { name: 'Cola en vivo' }).click()
  await expect(page).toHaveURL(/#\/app\/queue$/)
  await expect(page.locator('#queue-section')).toBeVisible()

  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto('/#/login')
  await page.reload()

  const loginForm = page.locator('form.login-form')
  await expect(loginForm).toBeVisible()
  await loginForm.locator('input[name="email"]').fill(email)
  await loginForm.locator('input[name="password"]').fill(password)

  const loginResponse = page.waitForResponse(response =>
    response.url().endsWith('/api/auth/login') && response.request().method() === 'POST')
  const persistedMetricsResponse = page.waitForResponse(response =>
    response.url().endsWith('/api/queue/metrics') && response.request().method() === 'GET')

  await loginForm.locator('button.login-submit').click()

  expect((await loginResponse).ok()).toBeTruthy()
  expect((await persistedMetricsResponse).ok()).toBeTruthy()
  await expect(page).toHaveURL(/#\/app\/overview$/)
  await expect(page).toHaveTitle(/Panel \| BarberTurn/)
  await expect(page.getByRole('heading', { name: 'Panel de administración' })).toBeVisible()
})
