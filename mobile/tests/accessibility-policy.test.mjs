import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const files = [
  'app/(app)/index.tsx',
  'app/(app)/marketplace-profile.tsx',
  'app/(app)/team.tsx',
  'app/(app)/turn-requests.tsx',
  'app/(auth)/login.tsx',
  'app/auth-callback.tsx',
  'app/discover.tsx',
  'app/onboarding.tsx',
  'app/request-status/[slug]/[requestId].tsx',
  'app/request/[slug].tsx',
  'src/notifications/PushOptInCard.tsx',
  'src/theme/tokens.ts',
  'src/ui/MobileBottomNav.tsx',
]

test('accessibility-hardened mobile surfaces keep visible text at 12px or larger', async () => {
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8')
    const undersized = [...source.matchAll(/fontSize\s*:\s*(\d+(?:\.\d+)?)/g)]
      .map(match => Number(match[1]))
      .filter(value => value < 12)

    assert.deepEqual(undersized, [], `${file} contains visible text below the 12px accessibility floor`)
  }
})

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

test('mobile theme keeps AA contrast for action labels without lowering the touch-target floor', async () => {
  const source = await readFile(new URL('../src/theme/tokens.ts', import.meta.url), 'utf8')
  const token = name => source.match(new RegExp(`${name}:\\s*'(#[0-9A-Fa-f]{6})'`))?.[1]

  for (const name of ['primaryAction', 'primaryPressed']) {
    const background = token(name)
    const label = token('onPrimary')
    assert.ok(background && label, `${name}/onPrimary must be defined as 6-digit hex colors`)
    assert.ok(contrast(background, label) >= 4.5, `${label} on ${name} (${background}) must reach 4.5:1`)
  }
  assert.ok(contrast(token('primaryGlow'), token('background')) >= 4.5, 'accent text must stay readable on the app background')
  assert.match(source, /minTouch:\s*48/)
})
