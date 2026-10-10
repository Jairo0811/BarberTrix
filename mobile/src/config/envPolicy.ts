export function resolveApiBaseUrl(rawValue: unknown, environmentValue: unknown): string {
  const rawApiBaseUrl = typeof rawValue === 'string' ? rawValue.trim() : '';

  if (!rawApiBaseUrl)
    throw new Error('EXPO_PUBLIC_API_BASE_URL is required.');

  let apiUrl: URL;
  try {
    apiUrl = new URL(rawApiBaseUrl);
  } catch {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must be a valid absolute URL.');
  }

  if (apiUrl.protocol !== 'http:' && apiUrl.protocol !== 'https:')
    throw new Error('EXPO_PUBLIC_API_BASE_URL must use http or https.');

  const environment = typeof environmentValue === 'string'
    ? environmentValue.trim().toLowerCase()
    : '';
  if (environment === 'production' && apiUrl.protocol !== 'https:')
    throw new Error('EXPO_PUBLIC_API_BASE_URL must use https in Production.');

  return rawApiBaseUrl.replace(/\/+$/, '');
}
