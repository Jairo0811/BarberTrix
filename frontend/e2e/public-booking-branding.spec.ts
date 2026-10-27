import { expect, test } from '@playwright/test'
import { installMockBackend } from './fixtures/mockBackend'

const centralShop = {
  name: 'Barbería Central',
  slug: 'central',
  timeZoneId: 'America/Santo_Domingo',
  services: [{ id: 'service-1', name: 'Corte clásico', price: 500, estimatedDurationMinutes: 30 }],
  barbers: [{ id: 'barber-1', name: 'Carlos', chairNumber: 1 }],
}

test('public booking displays a published shop profile and contact actions', async ({ page }) => {
  await installMockBackend(page, { plan: 'Pro' })
  await page.route('**/api/public/shops/central', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ...centralShop,
      profile: {
        description: 'Cortes y estilos en Santo Domingo Este.',
        logoUrl: '/branding/barbertrix-logo.webp',
        coverImageUrl: '/branding/barbertrix-home-chair.webp',
        whatsAppPhone: '+1 (809) 555-0101',
        publicPhone: '+1 (809) 555-0102',
        address: 'Av. España 10',
        city: 'Santo Domingo Este',
        latitude: 18.47,
        longitude: -69.86,
      },
    }),
  }))

  await page.goto('/#/book?shop=central')
  const hero = page.locator('.shop-hero')
  await expect(hero.getByRole('heading', { name: 'Barbería Central' })).toBeVisible()
  await expect(hero.locator('.shop-description')).toContainText('Cortes y estilos')
  await expect(hero.locator('.shop-logo')).toHaveAttribute('src', '/branding/barbertrix-logo.webp')
  await expect(hero.locator('.shop-cover')).toHaveAttribute('src', '/branding/barbertrix-home-chair.webp')
  await expect(hero.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', 'https://wa.me/18095550101')
  await expect(hero.getByRole('link', { name: '+1 (809) 555-0102' })).toHaveAttribute('href', 'tel:+18095550102')
  await expect(hero.getByRole('link', { name: /Av. España 10/ })).toHaveAttribute('href', 'https://www.google.com/maps?q=18.47,-69.86')
  await expect(page.locator('.booking-form')).toBeVisible()
})

test('unpublished or missing shop cannot display an actionable booking form', async ({ page }) => {
  await installMockBackend(page, { plan: 'Pro' })
  await page.route('**/api/public/shops/central', route => route.fulfill({
    status: 404,
    contentType: 'application/json',
    body: JSON.stringify({ code: 'SHOP_NOT_FOUND' }),
  }))

  await page.goto('/#/book?shop=central')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.locator('.booking-form')).toHaveCount(0)
  await expect(page.locator('.booking-tabs')).toHaveCount(0)
})

test('untrusted non-HTTP shop media URLs are not rendered', async ({ page }) => {
  await installMockBackend(page, { plan: 'Pro' })
  await page.route('**/api/public/shops/central', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ...centralShop,
      profile: { logoUrl: 'javascript:alert(1)', coverImageUrl: 'data:image/svg+xml,unsafe' },
    }),
  }))

  await page.goto('/#/book?shop=central')
  await expect(page.locator('.shop-logo-fallback')).toBeVisible()
  await expect(page.locator('.shop-cover')).toHaveCount(0)
  await expect(page.locator('.booking-form')).toBeVisible()
})
