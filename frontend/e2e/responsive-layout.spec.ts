import { expect, test } from '@playwright/test'

// Guards the responsive contract on public screens: no horizontal overflow, readable text,
// and comfortable touch targets for buttons/inputs on narrow screens.
const routes = ['/#/', '/#/login', '/#/register', '/#/forgot-password', '/#/demo', '/#/terms']
const widths = [320, 390, 768, 1280]

for (const width of widths) {
  for (const route of routes) {
    test(`${route} fits ${width}px with readable text and tappable controls`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.route('**/api/**', apiRoute => apiRoute.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
      await page.goto(route, { waitUntil: 'networkidle' })

      const report = await page.evaluate(narrow => {
        const visible = (element: Element) => {
          const rect = element.getBoundingClientRect()
          const style = getComputedStyle(element)
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && !element.closest('.visually-hidden, .skip-link')
        }
        const label = (element: Element) => `${element.tagName.toLowerCase()}.${String(element.className).split(' ')[0]}`
        const tinyText: string[] = []
        const smallTargets: string[] = []
        for (const element of Array.from(document.body.querySelectorAll('*'))) {
          if (!visible(element)) continue
          const hasText = Array.from(element.childNodes).some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
          if (hasText && parseFloat(getComputedStyle(element).fontSize) < 12) tinyText.push(label(element))
          const rect = element.getBoundingClientRect()
          // Inline links inside sentences are exempt (WCAG 2.5.8); controls are not.
          if (narrow && element.matches('button, select, input:not([type=hidden]):not([type=checkbox]):not([type=radio])') && rect.height < 43.5) {
            smallTargets.push(`${label(element)} ${Math.round(rect.width)}x${Math.round(rect.height)}`)
          }
        }
        const root = document.documentElement
        return { overflow: root.scrollWidth - root.clientWidth, tinyText, smallTargets }
      }, width < 1024)

      expect(report.overflow, 'horizontal overflow in px').toBeLessThanOrEqual(1)
      expect(report.tinyText, 'text below 12px').toEqual([])
      expect(report.smallTargets, 'controls shorter than 44px on narrow screens').toEqual([])
    })
  }
}
