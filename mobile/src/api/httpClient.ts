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
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

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
