import { describe, expect, it, vi } from 'vitest'
import { barberStatusLabel, turnStatusLabel } from './domainLabels'

const t = vi.fn((key: string) => `translated:${key}`)

describe('localized domain labels', () => {
  it('maps queue statuses to translation keys', () => {
    expect(turnStatusLabel(t, 'Waiting')).toBe('translated:waiting')
    expect(turnStatusLabel(t, 'Called')).toBe('translated:status.called')
    expect(turnStatusLabel(t, 'InService')).toBe('translated:inService')
    expect(turnStatusLabel(t, 'Completed')).toBe('translated:completed')
    expect(turnStatusLabel(t, 'Cancelled')).toBe('translated:status.cancelled')
    expect(turnStatusLabel(t, 'NoShow')).toBe('translated:noShow')
  })

  it('maps barber availability statuses to translation keys', () => {
    expect(barberStatusLabel(t, 'Available')).toBe('translated:available')
    expect(barberStatusLabel(t, 'Busy')).toBe('translated:busy')
    expect(barberStatusLabel(t, 'Break')).toBe('translated:break')
    expect(barberStatusLabel(t, 'Offline')).toBe('translated:offline')
  })

  it('does not expose unknown backend status text', () => {
    expect(turnStatusLabel(t, 'UnexpectedBackendValue')).toBe('translated:status.unknown')
    expect(barberStatusLabel(t, 'UnexpectedBackendValue')).toBe('translated:status.unknown')
  })
})
