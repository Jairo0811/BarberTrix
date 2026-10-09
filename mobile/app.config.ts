import type { ConfigContext, ExpoConfig } from 'expo/config';

const projectIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default ({ config }: ConfigContext): ExpoConfig => {
  const configuredProjectId = typeof config.extra?.eas?.projectId === 'string'
    ? config.extra.eas.projectId.trim()
    : undefined;
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim()
    || process.env.EAS_BUILD_PROJECT_ID?.trim()
    || configuredProjectId;
  const owner = process.env.EXPO_ACCOUNT_OWNER?.trim();

  if (projectId && !projectIdPattern.test(projectId))
    throw new Error('EAS projectId must be the UUID assigned by EAS.');
  if (process.env.EAS_BUILD && !projectId)
    throw new Error('Link the project with EAS so extra.eas.projectId is available before building.');

  return {
    ...config,
    name: 'BarberTrix',
    slug: 'barbertrix',
    ...(owner ? { owner } : {}),
    extra: {
      ...config.extra,
      environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'Development',
      ...(projectId ? { eas: { ...config.extra?.eas, projectId } } : {}),
    },
    ios: {
      ...config.ios,
      buildNumber: config.ios?.buildNumber ?? '1',
      infoPlist: { ...config.ios?.infoPlist, ITSAppUsesNonExemptEncryption: false },
    },
    android: { ...config.android, versionCode: config.android?.versionCode ?? 1 },
  };
};
