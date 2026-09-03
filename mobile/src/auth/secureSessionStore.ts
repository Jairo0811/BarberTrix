import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { StoredRefreshSession } from './types';

const RefreshSessionKey = 'barbertrix.mobile.refresh-session.v1';
const isWeb = Platform.OS === 'web';

let webSession: StoredRefreshSession | null = null;

export const secureSessionStore = {
  async read(): Promise<StoredRefreshSession | null> {
    if (isWeb) {
      return webSession;
    }

    const value = await SecureStore.getItemAsync(RefreshSessionKey);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as StoredRefreshSession;
    } catch {
      await SecureStore.deleteItemAsync(RefreshSessionKey);
      return null;
    }
  },

  async write(session: StoredRefreshSession): Promise<void> {
    if (isWeb) {
      webSession = session;
      return;
    }

    await SecureStore.setItemAsync(
      RefreshSessionKey,
      JSON.stringify(session),
      {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      },
    );
  },

  async clear(): Promise<void> {
    if (isWeb) {
      webSession = null;
      return;
    }

    await SecureStore.deleteItemAsync(RefreshSessionKey);
  },
};
