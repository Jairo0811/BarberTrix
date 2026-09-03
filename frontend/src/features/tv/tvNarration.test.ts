import { describe, expect, it } from 'vitest'
import { buildTvAnnouncement, clampTvVolume, collectNewCalledTurns, tvAnnouncementKey } from './tvNarration'

describe('BarberTrix TV narration', () => {
  it('uses the exact operational phrase requested for a called turn', () => {
    expect(buildTvAnnouncement({ ticketNumber: 'A-123', status: 'Called', chairNumber: 4 }))
      .toBe('Turno: A-123, pasar a Silla: 4.')
  })

  it('does not announce turns that are not called or do not have a chair', () => {
    expect(buildTvAnnouncement({ ticketNumber: 'A-123', status: 'Waiting', chairNumber: 4 })).toBeNull()
    expect(buildTvAnnouncement({ ticketNumber: 'A-123', status: 'Called' })).toBeNull()
    expect(buildTvAnnouncement({ ticketNumber: 'A-123', status: 'Called', chairNumber: 0 })).toBeNull()
  })

  it('uses ticket and chair as the announcement identity', () => {
    expect(tvAnnouncementKey({ ticketNumber: ' A-123 ', status: 'Called', chairNumber: 4 })).toBe('A-123|4')
  })

  it('treats the first snapshot as a baseline without narrating stale calls', () => {
    const delta = collectNewCalledTurns(null, [
      { ticketNumber: 'A-123', status: 'Called', chairNumber: 4 },
    ])

    expect(delta.newTurns).toHaveLength(0)
    expect([...delta.currentKeys]).toEqual(['A-123|4'])
  })

  it('does not repeat a call when polling or SignalR returns the same snapshot', () => {
    const previous = new Set(['A-123|4'])
    const delta = collectNewCalledTurns(previous, [
      { ticketNumber: 'A-123', status: 'Called', chairNumber: 4 },
    ])

    expect(delta.newTurns).toHaveLength(0)
  })

  it('announces a newly called turn and preserves queue order', () => {
    const delta = collectNewCalledTurns(new Set(['A-123|4']), [
      { ticketNumber: 'A-123', status: 'Called', chairNumber: 4 },
      { ticketNumber: 'B-007', status: 'Called', chairNumber: 2 },
      { ticketNumber: 'C-010', status: 'Called', chairNumber: 6 },
    ])

    expect(delta.newTurns.map(turn => turn.ticketNumber)).toEqual(['B-007', 'C-010'])
  })

  it('announces again when the chair changes while the turn remains called', () => {
    const delta = collectNewCalledTurns(new Set(['A-123|4']), [
      { ticketNumber: 'A-123', status: 'Called', chairNumber: 5 },
    ])

    expect(delta.newTurns).toEqual([{ ticketNumber: 'A-123', status: 'Called', chairNumber: 5 }])
  })

  it('allows a real re-call after the turn leaves Called and later returns', () => {
    const afterLeaving = collectNewCalledTurns(new Set(['A-123|4']), [
      { ticketNumber: 'A-123', status: 'InService', chairNumber: 4 },
    ])
    expect(afterLeaving.currentKeys.size).toBe(0)

    const recalled = collectNewCalledTurns(afterLeaving.currentKeys, [
      { ticketNumber: 'A-123', status: 'Called', chairNumber: 4 },
    ])
    expect(recalled.newTurns).toHaveLength(1)
  })

  it('clamps persisted audio volume to the browser-supported range', () => {
    expect(clampTvVolume(-0.5)).toBe(0)
    expect(clampTvVolume(0.65)).toBe(0.65)
    expect(clampTvVolume(2)).toBe(1)
    expect(clampTvVolume(Number.NaN)).toBe(0.85)
  })
})
