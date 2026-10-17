import { env } from '@/config/env';

/** Turns API-relative media paths (e.g. /api/public/shop-media/...) into absolute URLs. Only http(s) and relative paths are accepted. */
export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('/')) return `${env.apiBaseUrl}${url}`;
  return /^https?:\/\//i.test(url) ? url : null;
}
