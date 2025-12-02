import { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Move } from 'lucide-react';

// Fix Leaflet default icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface GeofenceMapEditorProps {
  latitude: number;
  longitude: number;
  radius: number;
  onLocationChange: (lat: number, lng: number) => void;
}

// Map click handler component
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to recenter map when location changes
function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center[0] !== 0 && center[1] !== 0) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

export default function GeofenceMapEditor({
  latitude,
  longitude,
  radius,
  onLocationChange,
}: GeofenceMapEditorProps) {
  const handleMapClick = (lat: number, lng: number) => {
    onLocationChange(lat, lng);
  };

  const handleMarkerDrag = (e: any) => {
    const marker = e.target;
    const position = marker.getLatLng();
    onLocationChange(position.lat, position.lng);
  };

  if (latitude === 0 && longitude === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <Move className="w-4 h-4 inline mr-1" />
        Click on map to set location
      </label>
      <div className="h-[600px] rounded-lg overflow-hidden border-2 border-gray-300">
        <MapContainer
          center={[latitude, longitude]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onMapClick={handleMapClick} />
          <MapRecenter center={[latitude, longitude]} />
          <Marker
            position={[latitude, longitude]}
            draggable={true}
            eventHandlers={{
              dragend: handleMarkerDrag,
            }}
          />
          <Circle
            center={[latitude, longitude]}
            radius={radius}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.2,
            }}
          />
        </MapContainer>
      </div>
      <p className="text-xs text-gray-600 mt-2">
        Drag the marker or click anywhere on the map to set the geofence center. The circle shows the geofence radius.
      </p>
    </div>
  );
}
