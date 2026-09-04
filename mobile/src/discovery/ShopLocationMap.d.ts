import type { ComponentType } from 'react';

export type GeoCoordinate = {
  latitude: number;
  longitude: number;
};

export type ShopLocationMapProps = {
  latitude: number | null;
  longitude: number | null;
  onChange(coordinate: GeoCoordinate): void;
};

export const ShopLocationMap: ComponentType<ShopLocationMapProps>;
