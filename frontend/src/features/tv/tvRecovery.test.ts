import { afterEach, expect, it, vi } from 'vitest'
import { createTvRecovery } from './tvRecovery'
afterEach(() => vi.useRealTimers())
it('retries a failed display join without restarting a connected transport', async () => {
  vi.useFakeTimers()
  const connection = { state: 'Connected', start: vi.fn() }
  const join = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue(true)
  const snapshot = vi.fn().mockResolvedValue(undefined)
  const offline = vi.fn()
  const recovery = createTvRecovery(connection, join, snapshot, offline)
  await recovery.recover()
  expect(offline).toHaveBeenCalledOnce()
  await vi.advanceTimersByTimeAsync(5_000)
  expect(connection.start).not.toHaveBeenCalled()
  expect(join).toHaveBeenCalledTimes(2)
  expect(snapshot).toHaveBeenCalledOnce()
  recovery.dispose()
})
it('coalesces recovery and does not join after disposal during start', async () => {
  let finish!: () => void
  const connection = { state: 'Disconnected', start: vi.fn(() => new Promise<void>(resolve => { finish = () => { connection.state = 'Connected'; resolve() } })) }
  const join = vi.fn().mockResolvedValue(true)
  const recovery = createTvRecovery(connection, join, vi.fn(), vi.fn())
  const first = recovery.recover()
  expect(recovery.recover()).toBe(first)
  recovery.dispose(); finish(); await first
  expect(connection.start).toHaveBeenCalledOnce()
  expect(join).not.toHaveBeenCalled()
})
it('does not fetch private display data after a rejected capability', async () => {
  const snapshot = vi.fn()
  const recovery = createTvRecovery({ state: 'Connected', start: vi.fn() }, async () => false, snapshot, vi.fn())
  await recovery.recover()
  expect(snapshot).not.toHaveBeenCalled()
  recovery.dispose()
})
