import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { pushInstallationStore } from './installationStore';
import type { PushPlatform, PushSubscriptionInput } from './pushApi';

export type PushRegistrationFailure = 'denied' | 'misconfigured' | 'unsupported' | 'unavailable';

export class PushRegistrationError extends Error {
  constructor(public readonly reason: PushRegistrationFailure, message: string) {
    super(message);
    this.name = 'PushRegistrationError';
  }
}

function projectId(): string | undefined {
  const configured = Constants.expoConfig?.extra?.eas?.projectId;
  return (typeof configured === 'string' ? configured : undefined)
    ?? Constants.easConfig?.projectId
    ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
}

async function ensurePermission(askForPermission: boolean) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('turn-requests', {
      name: 'Solicitudes de turno',
      description: 'Cambios importantes en solicitudes y citas.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#111111',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  if (!askForPermission) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

export async function createPushSubscriptionInput(askForPermission = true): Promise<PushSubscriptionInput> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios')
    throw new PushRegistrationError('unsupported', 'Las notificaciones push requieren Android o iOS.');
  if (!await ensurePermission(askForPermission))
    throw new PushRegistrationError('denied', 'Activa las notificaciones de BarberTurn en los ajustes del dispositivo.');

  const easProjectId = projectId();
  if (!easProjectId)
    throw new PushRegistrationError('misconfigured', 'Falta configurar el EAS project ID de BarberTurn.');

  try {
    const [{ data: expoPushToken }, installationId] = await Promise.all([
      Notifications.getExpoPushTokenAsync({ projectId: easProjectId }),
      pushInstallationStore.getOrCreateInstallationId(),
    ]);
    const platform: PushPlatform = Platform.OS === 'android' ? 'Android' : 'Ios';
    return { installationId, expoPushToken, platform };
  } catch {
    throw new PushRegistrationError('unavailable', 'No pudimos registrar este dispositivo con Expo.');
  }
}
