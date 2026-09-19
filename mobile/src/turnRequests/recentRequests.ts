import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
export type RecentRequest = { id: string; slug: string; serviceId: string; barberId: string };
const memory = new Map<string, RecentRequest[]>();
const key = (userId: string) => `barbertrix.recent.${userId}`;
export async function readRecentRequests(userId: string): Promise<RecentRequest[]> {
 if (Platform.OS === 'web') return memory.get(userId) ?? [];
 const stored = await SecureStore.getItemAsync(key(userId));
 if (!stored) return [];
 try {
   const rows: unknown = JSON.parse(stored);
   return Array.isArray(rows) ? rows.filter((row): row is RecentRequest => !!row && ['id', 'slug', 'serviceId', 'barberId'].every(field => typeof row[field] === 'string')).slice(0, 30) : [];
 } catch { return []; }
}
export async function rememberRequest(userId: string, row: RecentRequest) {
 const rows = [row, ...(await readRecentRequests(userId)).filter(item => item.id !== row.id)].slice(0, 30);
 if (Platform.OS === 'web') { memory.set(userId, rows); return; }
 await SecureStore.setItemAsync(key(userId), JSON.stringify(rows), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}
