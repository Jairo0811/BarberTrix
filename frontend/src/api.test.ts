import { describe, expect, it } from 'vitest'
import { api, ApiClientError } from './api'

describe('authenticated API client', () => {
  it('rejects immediately with the stable session-expired code when auth is missing', async () => {
    await expect(api('/api/queue/turns')).rejects.toMatchObject({
      name: 'ApiClientError', status: 401, code: 'AUTH_SESSION_EXPIRED',
    } satisfies Partial<ApiClientError>)
  })
})
