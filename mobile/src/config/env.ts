import { resolveApiBaseUrl } from './envPolicy';

export const env = {
  apiBaseUrl: resolveApiBaseUrl(
    process.env.EXPO_PUBLIC_API_BASE_URL,
    process.env.EXPO_PUBLIC_APP_ENV,
  ),
} as const;
