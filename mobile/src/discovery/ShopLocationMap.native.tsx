import MapView, { Marker, type LatLng } from 'react-native-maps';
import { StyleSheet } from 'react-native';

export type GeoCoordinate = LatLng;

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange(coordinate: GeoCoordinate): void;
};

const DEFAULT_COORDINATE: GeoCoordinate = {
  latitude: 18.4861,
  longitude: -69.9312,
};

export function ShopLocationMap({ latitude, longitude, onChange }: Props) {
  const coordinate = {
    latitude: latitude ?? DEFAULT_COORDINATE.latitude,
    longitude: longitude ?? DEFAULT_COORDINATE.longitude,
  };

  return (
    <MapView
      key={`${coordinate.latitude}-${coordinate.longitude}`}
      initialRegion={{ ...coordinate, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
      onPress={event => onChange(event.nativeEvent.coordinate)}
      style={styles.map}
    >
      {latitude != null && longitude != null && (
        <Marker
          draggable
          coordinate={{ latitude, longitude }}
          onDragEnd={event => onChange(event.nativeEvent.coordinate)}
        />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: 230, borderRadius: 12, overflow: 'hidden' },
});
