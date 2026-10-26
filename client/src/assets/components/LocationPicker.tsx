
import { useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type SelectedLocation = {
  latitude: number;
  longitude: number;
};

type LocationPickerProps = {
  onLocationSelect: (location: SelectedLocation) => void;
  initialLocation?: SelectedLocation;
};

const defaultLocation: SelectedLocation = {
  latitude: 20.5937,
  longitude: 78.9629,
};

const markerIcon = L.icon({
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type MapClickHandlerProps = {
  onSelect: (location: SelectedLocation) => void;
};

function MapClickHandler({ onSelect }: MapClickHandlerProps) {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return null;
}

export default function LocationPicker({
  onLocationSelect,
  initialLocation,
}: LocationPickerProps) {
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocation>(
      initialLocation ?? defaultLocation
    );

  function selectLocation(location: SelectedLocation) {
    setSelectedLocation(location);
    onLocationSelect(location);
  }

  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ fontWeight: 600, marginBottom: 8 }}>
        Select pickup location
      </p>

      <p style={{ color: '#637067', fontSize: 14 }}>
        Click on the map to place the pickup marker.
      </p>

      <div
        style={{
          height: 320,
          width: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #dce4dc',
        }}
      >
        <MapContainer
          center={[
            selectedLocation.latitude,
            selectedLocation.longitude,
          ]}
          zoom={5}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler onSelect={selectLocation} />

          <Marker
            position={[
              selectedLocation.latitude,
              selectedLocation.longitude,
            ]}
            icon={markerIcon}
          />
        </MapContainer>
      </div>

      <p style={{ fontSize: 14, marginTop: 10 }}>
        Latitude: {selectedLocation.latitude}
        <br />
        Longitude: {selectedLocation.longitude}
      </p>
    </div>
  );
}

