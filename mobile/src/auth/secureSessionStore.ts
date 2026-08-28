import * as SecureStore from 'expo-secure-store';
import type { StoredRefreshSession } from './types';

const RefreshSessionKey = 'barberturn.mobile.refresh-session.v1';

export const secureSessionStore = {
  async read(): Promise<StoredRefreshSession | null> {
    const value = await SecureStore.getItemAsync(RefreshSessionKey);
    if (!value) return null;
    try {
      return JSON.parse(value) as StoredRefreshSession;
    } catch {
      await SecureStore.deleteItemAsync(RefreshSessionKey);
      return null;
    }
  },

  async write(session: StoredRefreshSession): Promise<void> {
    await SecureStore.setItemAsync(RefreshSessionKey, JSON.stringify(session), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  clear(): Promise<void> {
    return SecureStore.deleteItemAsync(RefreshSessionKey);
  },
};
