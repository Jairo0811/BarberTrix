import { apiRequest } from '@/api/httpClient';

export type DiscoveryShopCard = {
  id: string;
  name: string;
  slug: string;
  locationName?: string | null;
  address?: string | null;
  waitingCount: number;
  inServiceCount: number;
  activeBarbers: number;
  availableBarbers: number;
  startingPrice?: number | null;
  estimatedWaitMinutes?: number | null;
};

export async function searchShops(query?: string): Promise<DiscoveryShopCard[]> {
  const params = new URLSearchParams();
  if (query?.trim()) params.set('q', query.trim());
  params.set('limit', '30');
  return apiRequest<DiscoveryShopCard[]>(`/api/public/discovery/shops?${params.toString()}`);
}
