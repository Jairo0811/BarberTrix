import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { env } from '@/config/env';
import type { ExternalAuthProvider } from './authApi';

const pendingKey = 'barbertrix.social.oauth.pending';

type PendingExternalOAuth = {
  provider: ExternalAuthProvider;
  codeVerifier: string;
  createdAt: number;
};

export async function startExternalOAuth(provider: ExternalAuthProvider) {
  const codeVerifier = createCodeVerifier();
  const codeChallenge = await createCodeChallenge(codeVerifier);
  const returnUri = Linking.createURL('/auth-callback');

  await SecureStore.setItemAsync(pendingKey, JSON.stringify({
    provider,
    codeVerifier,
    createdAt: Date.now(),
  } satisfies PendingExternalOAuth));

  const startUrl = `${env.apiBaseUrl}/api/auth/mobile/oauth/${provider}/start` +
    `?returnUri=${encodeURIComponent(returnUri)}` +
    `&codeChallenge=${encodeURIComponent(codeChallenge)}`;

  await Linking.openURL(startUrl);
}

export async function consumePendingExternalOAuth(): Promise<PendingExternalOAuth | null> {
  const raw = await SecureStore.getItemAsync(pendingKey);
  await SecureStore.deleteItemAsync(pendingKey);
  if (!raw) return null;

  try {
    const pending = JSON.parse(raw) as PendingExternalOAuth;
    if (!pending.codeVerifier || !pending.provider || Date.now() - pending.createdAt > 15 * 60 * 1000)
      return null;
    return pending;
  } catch {
    return null;
  }
}

export async function clearPendingExternalOAuth() {
  await SecureStore.deleteItemAsync(pendingKey);
}

function createCodeVerifier() {
  return `${Crypto.randomUUID()}${Crypto.randomUUID()}`.replaceAll('-', '');
}

async function createCodeChallenge(codeVerifier: string) {
  const base64 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  return base64.replace(/=+$/g, '').replaceAll('+', '-').replaceAll('/', '_');
}
