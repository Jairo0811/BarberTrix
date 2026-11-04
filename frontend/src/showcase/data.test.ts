import { describe, expect, it } from 'vitest'
import { addAppointment, addTurn, advanceTurn, initialState } from './data'

describe('Showcase: estados independientes y ficticios', () => {
  it('genera tickets consecutivos sin llamar a una API', () => {
    const next = addTurn(initialState(), 'Cliente Demo', 'cut')
    expect(next.turns.at(-1)?.ticket).toBe('BT-018')
    expect(next.nextTicket).toBe(19)
  })
  it('no permite saltar de Waiting a Completed', () => {
    const state = initialState()
    expect(advanceTurn(state, 't16', 'complete')).toBe(state)
  })
  it('permite un ciclo válido de llamada y atención', () => {
    const called = advanceTurn(initialState(), 't16', 'call')
    const started = advanceTurn(called, 't16', 'start')
    const completed = advanceTurn(started, 't16', 'complete')
    expect(completed.turns.find(t => t.id === 't16')?.status).toBe('Completed')
  })
  it('rechaza citas en el pasado y servicios desconocidos', () => {
    const state = initialState()
    expect(addAppointment(state, 'Cliente Demo', 'cut', 'barber-1', '2000-01-01T10:00')).toBe(state)
    expect(addAppointment(state, 'Cliente Demo', 'invalido', 'barber-1', '2099-01-01T10:00')).toBe(state)
  })
})
