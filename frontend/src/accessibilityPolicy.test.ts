import { describe, expect, it } from 'vitest'
import accessibilityCss from './accessibility.css?raw'
import mainSource from './main.tsx?raw'
import tokensCss from './tokens.css?raw'

function token(name: string) {
  const match = tokensCss.match(new RegExp(`--${name}:\\s*([^;]+);`))
  if (!match) throw new Error(`Missing CSS token --${name}`)
  return match[1].trim()
}

function channel(value: number) {
  const normalized = value / 255
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string) {
  const value = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(value)) throw new Error(`Expected six-digit hex color, received ${hex}`)
  const [r, g, b] = [0, 2, 4].map(index => channel(Number.parseInt(value.slice(index, index + 2), 16)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

describe('web accessibility policy', () => {
  it('defines every design token consumed by the global accessibility layer', () => {
    const defined = new Set([...tokensCss.matchAll(/--([a-z0-9-]+)\s*:/gi)].map(match => match[1]))
    const consumed = new Set([...accessibilityCss.matchAll(/var\(--([a-z0-9-]+)\)/gi)].map(match => match[1]))

    expect([...consumed].filter(name => !defined.has(name))).toEqual([])
    expect(token('bt-tap-target')).toBe('44px')
  })

  it('keeps white text on primary action colors at WCAG AA contrast', () => {
    expect(contrastRatio('#ffffff', token('bt-primary-action'))).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio('#ffffff', token('bt-primary-action-strong'))).toBeGreaterThanOrEqual(4.5)
  })

  it('guards keyboard focus, reduced motion, readable microcopy and coarse-pointer targets', () => {
    expect(accessibilityCss).toContain(':focus-visible')
    expect(accessibilityCss).toContain('@media (prefers-reduced-motion: reduce)')
    expect(accessibilityCss).toContain('@media (pointer: coarse)')
    expect(accessibilityCss).toContain('font-size: 12px !important')
    expect(accessibilityCss).toContain('min-height: var(--bt-tap-target)')
    expect(accessibilityCss).toContain('.ticket small')
    expect(accessibilityCss).toContain('.home-feature-row small')
  })

  it('loads tokens before application styles and the accessibility layer', () => {
    const tokensIndex = mainSource.indexOf("import './tokens.css'")
    const stylesIndex = mainSource.indexOf("import './styles.css'")
    const accessibilityIndex = mainSource.indexOf("import './accessibility.css'")

    expect(tokensIndex).toBeGreaterThanOrEqual(0)
    expect(stylesIndex).toBeGreaterThan(tokensIndex)
    expect(accessibilityIndex).toBeGreaterThan(stylesIndex)
  })
})
