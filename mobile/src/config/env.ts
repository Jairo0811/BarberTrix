import Constants from 'expo-constants';

const configuredUrl = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;

export const env = {
  apiBaseUrl: configuredUrl?.trim() || process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:8080',
};
