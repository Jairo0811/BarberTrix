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

test('mobile theme keeps a dedicated AA action color without lowering the touch-target floor', async () => {
  const source = await readFile(new URL('../src/theme/tokens.ts', import.meta.url), 'utf8')

  assert.match(source, /primaryAction:\s*'#0B73E8'/)
  assert.match(source, /minTouch:\s*48/)
})
