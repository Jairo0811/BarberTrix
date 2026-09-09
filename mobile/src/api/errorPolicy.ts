export type SafeError = { key: string; retryable: boolean; correlationId?: string };
// Deliberately never return server messages: they may contain implementation details.
export function mapMobileError(error: unknown): SafeError {
  const value = error && typeof error === 'object' ? error as { status?: number; code?: string; correlationId?: string; name?: string } : {};
  const codes: Record<string, string> = {
    BARBER_SERVICE_ACTIVE: 'errors.activeService', BARBER_STATUS_INVALID: 'errors.invalid',
    TEAM_CHAIR_CONFLICT: 'errors.chair', TEAM_MEMBER_EXISTS: 'errors.member',
    TEAM_INVITATION_EXISTS: 'errors.invitation', TEAM_BARBER_LINKED: 'errors.barberLinked',
    PLAN_RESOURCE_LIMIT: 'errors.plan', PLAN_FEATURE_UNAVAILABLE: 'errors.plan',
    MEDIA_TOO_LARGE: 'errors.mediaSize', MEDIA_EMPTY: 'errors.mediaEmpty',
    MEDIA_TYPE_INVALID: 'errors.mediaType', MEDIA_KIND_INVALID: 'errors.invalid',
    AUTH_INVALID_CREDENTIALS: 'login.invalidCredentials', NETWORK_TIMEOUT: 'errors.timeout',
  };
  const statuses: Record<number, string> = { 400: 'errors.invalid', 401: 'errors.session', 403: 'errors.forbidden', 404: 'errors.missing', 409: 'errors.conflict', 422: 'errors.invalid', 429: 'errors.rateLimit' };
  const status = value.status;
  const key = (value.code && codes[value.code]) || (status && statuses[status]) ||
    (value.name === 'TypeError' || status === 0 ? 'errors.offline' : 'errors.unexpected');
  return { key, retryable: !status || status === 408 || status === 429 || status >= 500,
    correlationId: typeof value.correlationId === 'string' && /^[a-zA-Z0-9:_-]{1,128}$/.test(value.correlationId) ? value.correlationId : undefined };
}
