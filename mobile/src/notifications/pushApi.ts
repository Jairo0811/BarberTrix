import { apiRequest } from '@/api/httpClient';

export type PushPlatform = 'Android' | 'Ios';

export type PushSubscriptionInput = {
  installationId: string;
  expoPushToken: string;
  platform: PushPlatform;
};

export function registerStaffPush(input: PushSubscriptionInput, accessToken: string) {
  return apiRequest<void>('/api/push/subscriptions', {
    method: 'PUT',
    body: JSON.stringify(input),
  }, accessToken);
}

export function unregisterStaffPush(installationId: string, accessToken: string) {
  return apiRequest<void>(`/api/push/subscriptions/${encodeURIComponent(installationId)}`, {
    method: 'DELETE',
  }, accessToken);
}

export function registerPublicPush(
  slug: string,
  requestId: string,
  lookupToken: string,
  input: PushSubscriptionInput,
) {
  const path = `/api/public/shops/${encodeURIComponent(slug)}/turn-requests/${encodeURIComponent(requestId)}/push-subscription?token=${encodeURIComponent(lookupToken)}`;
  return apiRequest<void>(path, { method: 'PUT', body: JSON.stringify(input) });
}

export function unregisterPublicPush(
  slug: string,
  requestId: string,
  lookupToken: string,
  installationId: string,
) {
  const path = `/api/public/shops/${encodeURIComponent(slug)}/turn-requests/${encodeURIComponent(requestId)}/push-subscription/${encodeURIComponent(installationId)}?token=${encodeURIComponent(lookupToken)}`;
  return apiRequest<void>(path, { method: 'DELETE' });
}
