import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const INSTALLATION_KEY = 'barbertrix.push.installation-id';
const REGISTRY_KEY = 'barbertrix.push.registry';

type PublicRegistration = { slug: string; requestId: string };
type PushRegistry = { staffUserId?: string; publicRequests: PublicRegistration[] };

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function emptyRegistry(): PushRegistry {
  return { publicRequests: [] };
}

async function readRegistry(): Promise<PushRegistry> {
  const stored = await SecureStore.getItemAsync(REGISTRY_KEY);
  if (!stored) return emptyRegistry();
  try {
    const parsed = JSON.parse(stored) as Partial<PushRegistry>;
    return {
      staffUserId: typeof parsed.staffUserId === 'string' ? parsed.staffUserId : undefined,
      publicRequests: Array.isArray(parsed.publicRequests)
        ? parsed.publicRequests.filter(item => typeof item?.slug === 'string' && typeof item?.requestId === 'string')
        : [],
    };
  } catch {
    return emptyRegistry();
  }
}

async function writeRegistry(registry: PushRegistry) {
  await SecureStore.setItemAsync(REGISTRY_KEY, JSON.stringify(registry), secureOptions);
}

export const pushInstallationStore = {
  async getOrCreateInstallationId() {
    const stored = await SecureStore.getItemAsync(INSTALLATION_KEY);
    if (stored) return stored;
    const installationId = Crypto.randomUUID();
    await SecureStore.setItemAsync(INSTALLATION_KEY, installationId, secureOptions);
    return installationId;
  },

  readRegistry,

  async rememberStaff(userId: string) {
    const registry = await readRegistry();
    registry.staffUserId = userId;
    await writeRegistry(registry);
  },

  async forgetStaff(userId: string) {
    const registry = await readRegistry();
    if (registry.staffUserId !== userId) return;
    delete registry.staffUserId;
    await writeRegistry(registry);
  },

  async rememberPublicRequest(slug: string, requestId: string) {
    const registry = await readRegistry();
    if (!registry.publicRequests.some(item => item.slug === slug && item.requestId === requestId))
      registry.publicRequests.push({ slug, requestId });
    await writeRegistry(registry);
  },

  async forgetPublicRequest(slug: string, requestId: string) {
    const registry = await readRegistry();
    registry.publicRequests = registry.publicRequests.filter(item => item.slug !== slug || item.requestId !== requestId);
    await writeRegistry(registry);
  },
};
