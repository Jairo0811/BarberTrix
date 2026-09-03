import { apiRequest } from '@/api/httpClient';

export type PublicShopProfile = {
  description: string | null;
  publicPhone: string | null;
  whatsAppPhone: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  acceptsWalkIns: boolean;
  acceptsAppointments: boolean;
  isPublished: boolean;
  publishedAtUtc: string | null;
  publicationIssues: string[];
};

export type UpdatePublicShopProfile = Pick<
  PublicShopProfile,
  'description' | 'publicPhone' | 'whatsAppPhone' | 'logoUrl' | 'coverImageUrl' | 'acceptsWalkIns' | 'acceptsAppointments'
>;

export const getPublicShopProfile = (accessToken: string) =>
  apiRequest<PublicShopProfile>('/api/shop/public-profile/', {}, accessToken);

export const updatePublicShopProfile = (accessToken: string, request: UpdatePublicShopProfile) =>
  apiRequest<PublicShopProfile>('/api/shop/public-profile/', { method: 'PUT', body: JSON.stringify(request) }, accessToken);

export const setShopPublication = (accessToken: string, published: boolean) =>
  apiRequest<PublicShopProfile>('/api/shop/public-profile/publication', { method: 'PUT', body: JSON.stringify({ published }) }, accessToken);
