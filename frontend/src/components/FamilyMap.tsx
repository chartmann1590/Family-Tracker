import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, LatLngBounds } from 'leaflet';
import { formatDistanceToNow } from 'date-fns';
import { LocationWithUser } from '../types';
import { Battery, Navigation, Clock } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = new Icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component to fit bounds when locations change
function FitBounds({ locations }: { locations: LocationWithUser[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length > 0) {
      const bounds = new LatLngBounds(
        locations.map((loc) => [loc.location.latitude, loc.location.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [locations, map]);

  return null;
}

interface FamilyMapProps {
  locations: LocationWithUser[];
}

export default function FamilyMap({ locations }: FamilyMapProps) {
  const defaultCenter: [number, number] = [40.7128, -74.006]; // New York
  const defaultZoom = 13;

  if (locations.length === 0) {
    return (
      <div className="map-container">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          className="w-full h-full"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </MapContainer>
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="text-center p-8 bg-white rounded-xl shadow-lg">
            <Navigation className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">
              No family members with recent locations
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Locations will appear here when family members share their location
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="map-container">
      <MapContainer
        center={[locations[0].location.latitude, locations[0].location.longitude]}
        zoom={defaultZoom}
        className="w-full h-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds locations={locations} />

        {locations.map((loc) => (
          <Marker
            key={loc.userId}
            position={[loc.location.latitude, loc.location.longitude]}
            icon={DefaultIcon}
          >
            <Popup>
              <div className="p-3 min-w-[200px]">
                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  {loc.userName}
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      {formatDistanceToNow(new Date(loc.location.timestamp), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  {loc.location.battery !== undefined && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Battery className="w-4 h-4" />
                      <span>{loc.location.battery}%</span>
                    </div>
                  )}

                  {loc.location.accuracy && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Navigation className="w-4 h-4" />
                      <span>±{Math.round(loc.location.accuracy)}m accuracy</span>
                    </div>
                  )}

                  <div className="pt-2 mt-2 border-t border-gray-200 text-xs text-gray-500">
                    <p>Lat: {loc.location.latitude.toFixed(6)}</p>
                    <p>Lng: {loc.location.longitude.toFixed(6)}</p>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
