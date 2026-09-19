// Coalesces transport recovery. A failed group join must not start an already
// connected socket, and retries must remain possible for a long-running kiosk.
export function createTvRecovery(connection: { readonly state: string; start(): Promise<void> }, join: () => Promise<boolean>, snapshot: () => Promise<void>, offline: () => void) {
  let disposed = false
  let pending: Promise<void> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const clearRetry = () => { if (timer) clearTimeout(timer); timer = undefined }
  const retry = () => {
    clearRetry()
    if (!disposed) timer = setTimeout(() => { void recover() }, 5_000)
  }
  function recover(): Promise<void> {
    if (disposed) return Promise.resolve()
    if (pending) return pending
    clearRetry()
    pending = (async () => {
      try {
        if (connection.state === 'Disconnected') await connection.start()
        if (disposed) return
        if (connection.state !== 'Connected') return
        if (await join() && !disposed) await snapshot()
      } catch {
        if (!disposed) { offline(); retry() }
      }
    })().finally(() => { pending = undefined })
    return pending
  }
  return { recover, retry, dispose() { disposed = true; clearRetry() } }
}
