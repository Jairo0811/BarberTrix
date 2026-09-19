import type { ConfigContext, ExpoConfig } from 'expo/config';
export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
  const owner = process.env.EXPO_ACCOUNT_OWNER?.trim();
  if (projectId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) throw new Error('EXPO_PUBLIC_EAS_PROJECT_ID must be the UUID assigned by EAS.');
  if (process.env.EAS_BUILD && !projectId) throw new Error('Link the project with EAS and configure EXPO_PUBLIC_EAS_PROJECT_ID before building.');
  return { ...config, name: 'BarberTrix', slug: 'barbertrix', ...(owner ? { owner } : {}),
    extra: { ...config.extra, environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'Development', ...(projectId ? { eas: { projectId } } : {}) },
    ios: { ...config.ios, buildNumber: config.ios?.buildNumber ?? '1', infoPlist: { ...config.ios?.infoPlist, ITSAppUsesNonExemptEncryption: false } },
    android: { ...config.android, versionCode: config.android?.versionCode ?? 1 },
  };
};
