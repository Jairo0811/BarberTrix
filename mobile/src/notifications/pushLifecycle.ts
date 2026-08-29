import { pushInstallationStore } from './installationStore';
import { unregisterStaffPush } from './pushApi';

export async function disableStaffPush(accessToken: string, userId: string) {
  const installationId = await pushInstallationStore.getOrCreateInstallationId();
  await unregisterStaffPush(installationId, accessToken);
  await pushInstallationStore.forgetStaff(userId);
}
