
import { useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type SelectedLocation = {
  latitude: number
  longitude: number
}

type Props = {
  onLocationSelect: (location: SelectedLocation) => void
  initialLocation?: SelectedLocation
}

const defaultLocation: SelectedLocation = {
  latitude: 26.9124,
  longitude: 75.7873,
}

const markerIcon = L.icon({
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

type ClickProps = {
  onSelect: (location: SelectedLocation) => void
}

function MapClickHandler({ onSelect }: ClickProps) {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      })
    },
  })

  return null
}

export default function LocationPicker({
  onLocationSelect,
  initialLocation,
}: Props) {
  const [selected, setSelected] = useState<SelectedLocation>(
    initialLocation ?? defaultLocation
  )

  function select(location: SelectedLocation) {
    setSelected(location)
    onLocationSelect(location)
  }

  return (
    <div
      className="pickup-map-section"
      style={{
        width: '100%',
        minWidth: 0,
        marginTop: 16,
        marginBottom: 16,
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 8 }}>
        Select pickup location on the map
      </p>

      <p style={{ color: '#637067', fontSize: 14 }}>
        Click the map to place the marker at the actual pickup location.
        You can zoom in or out using the map controls.
      </p>

      <div
        style={{
          height: 450,
          width: '100%',
          minWidth: 0,
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #dce4dc',
          position: 'relative',
        }}
      >
        <MapContainer
          center={[
            selected.latitude,
            selected.longitude,
          ]}
          zoom={12}
          scrollWheelZoom
          style={{
            height: '100%',
            width: '100%',
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler onSelect={select} />

          <Marker
            position={[selected.latitude, selected.longitude]}
            icon={markerIcon}
          />
        </MapContainer>
      </div>

      <p style={{ fontSize: 14, marginTop: 10 }}>
        Latitude: {selected.latitude} · Longitude: {selected.longitude}
      </p>
    </div>
  )
}
