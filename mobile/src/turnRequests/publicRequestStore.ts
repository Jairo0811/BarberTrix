import * as SecureStore from 'expo-secure-store';

const PREFIX = 'barberturn.turn-request.';

function key(requestId: string) {
  return `${PREFIX}${requestId}`;
}

export const publicRequestStore = {
  save(requestId: string, lookupToken: string) {
    return SecureStore.setItemAsync(key(requestId), lookupToken, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  read(requestId: string) {
    return SecureStore.getItemAsync(key(requestId));
  },
  clear(requestId: string) {
    return SecureStore.deleteItemAsync(key(requestId));
  },
};
