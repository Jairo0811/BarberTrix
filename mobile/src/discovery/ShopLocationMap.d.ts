import type { ComponentType } from 'react';

export type GeoCoordinate = {
  latitude: number;
  longitude: number;
};

export type ShopLocationMapProps = {
  coordinate: GeoCoordinate | null;
  fallbackCoordinate: GeoCoordinate;
  onCoordinateChange(coordinate: GeoCoordinate): void;
};

export const ShopLocationMap: ComponentType<ShopLocationMapProps>;
