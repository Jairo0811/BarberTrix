const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

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

export const env = {
  apiBaseUrl: rawApiBaseUrl.replace(/\/$/, ''),
} as const;
