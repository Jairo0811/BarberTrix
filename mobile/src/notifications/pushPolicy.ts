export function resolveEasProjectId(configured?: unknown, easConfig?: unknown, environment?: unknown): string | undefined {
 const candidate = [configured, easConfig, environment].find(value => typeof value === 'string' && value.trim());
 if (typeof candidate !== 'string') return undefined;
 const value = candidate.trim();
 return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : undefined;
}
export function safeNotificationPath(value: unknown): string | null {
 if (value === '/(app)/turn-requests') return value;
 return typeof value === 'string' && /^\/request-status\/[a-z0-9-]+\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}
