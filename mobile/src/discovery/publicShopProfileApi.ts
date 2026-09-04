import { apiRequest } from '@/api/httpClient';

export type PublicShopLocation = {
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  reference: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type PublicShopProfile = {
  description: string | null;
  publicPhone: string | null;
  whatsAppPhone: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  location: PublicShopLocation;
  acceptsWalkIns: boolean;
  acceptsAppointments: boolean;
  isPublished: boolean;
  publishedAtUtc: string | null;
  publicationIssues: string[];
};

export type UpdatePublicShopProfile = {
  description: string | null;
  publicPhone: string | null;
  whatsAppPhone: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  reference: string | null;
  latitude: number | null;
  longitude: number | null;
  acceptsWalkIns: boolean;
  acceptsAppointments: boolean;
};

export const getPublicShopProfile = (accessToken: string) =>
  apiRequest<PublicShopProfile>('/api/shop/public-profile/', {}, accessToken);

export const updatePublicShopProfile = (accessToken: string, request: UpdatePublicShopProfile) =>
  apiRequest<PublicShopProfile>('/api/shop/public-profile/', { method: 'PUT', body: JSON.stringify(request) }, accessToken);

export const uploadShopMedia = (accessToken: string, kind: 'logo' | 'cover', fileName: string, contentType: string, base64: string) =>
  apiRequest<{ url: string }>(`/api/shop/public-profile/media/${kind}`, {
    method: 'POST',
    body: JSON.stringify({ fileName, contentType, base64 }),
  }, accessToken);

export const setShopPublication = (accessToken: string, published: boolean) =>
  apiRequest<PublicShopProfile>('/api/shop/public-profile/publication', { method: 'PUT', body: JSON.stringify({ published }) }, accessToken);
