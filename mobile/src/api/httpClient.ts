import { env } from '@/config/env';

export class MobileApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly correlationId?: string,
  ) {
    super(message);
    this.name = 'MobileApiError';
  }
}

type ApiErrorBody = { code?: string; message?: string; correlationId?: string };

export async function apiRequest<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  init.signal?.addEventListener('abort', abort);
  if (init.signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 20_000);
  let response: Response;
  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    signal: controller.signal,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  } catch (error) {
    if (controller.signal.aborted && !init.signal?.aborted) throw new MobileApiError('', 0, 'NETWORK_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener('abort', abort);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiErrorBody;
    throw new MobileApiError(
      body.message || 'La solicitud no pudo completarse.',
      response.status,
      body.code,
      body.correlationId ?? response.headers.get('X-Correlation-ID') ?? undefined,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
