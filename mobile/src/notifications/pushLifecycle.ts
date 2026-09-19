import { pushInstallationStore } from './installationStore';
import { unregisterPublicPush, unregisterStaffPush } from './pushApi';
import { publicRequestStore } from '@/turnRequests/publicRequestStore';
import { Platform } from 'react-native';

export async function disableStaffPush(accessToken: string, userId: string) {
  const installationId = await pushInstallationStore.getOrCreateInstallationId();
  await unregisterStaffPush(installationId, accessToken);
  await pushInstallationStore.forgetStaff(userId);
}

export async function disableDevicePush(accessToken: string, userId: string) {
  if (Platform.OS === 'web') return;
  const registry = await pushInstallationStore.readRegistry();
  const installationId = await pushInstallationStore.getOrCreateInstallationId();
  for (const item of registry.publicRequests) {
    const token = await publicRequestStore.read(item.requestId);
    try {
      if (token) await unregisterPublicPush(item.slug, item.requestId, token, installationId);
    } catch { /* Remote removal can be retried after connectivity returns. */ } finally {
      // Never re-register a previous account's subscription on the next login.
      await pushInstallationStore.forgetPublicRequest(item.slug, item.requestId);
    }
  }
  if (registry.staffUserId === userId) {
    try { await unregisterStaffPush(installationId, accessToken); }
    finally { await pushInstallationStore.forgetStaff(userId); }
  }
}
