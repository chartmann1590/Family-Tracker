import { useEffect, useState } from 'react';
import { geofenceApi, locationApi } from '../lib/api';
import Navbar from '../components/Navbar';
import { MapPin, Loader2, AlertCircle, Users, User, MapPinned, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
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

interface Geofence {
  id: number;
  family_id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  user_id: number | null;
  is_active: boolean;
  notify_on_exit: boolean;
  notify_on_enter: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface Violation {
  id: number;
  geofence_id: number;
  user_id: number;
  violation_type: 'enter' | 'exit';
  latitude: number;
  longitude: number;
  notified: boolean;
  notification_sent_at: string | null;
  created_at: string;
  user_name: string;
}

export default function UserGeofencesPage() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [violations, setViolations] = useState<{ [key: number]: Violation[] }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGeofence, setExpandedGeofence] = useState<number | null>(null);
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const geofencesData = await geofenceApi.getGeofences();
      setGeofences(geofencesData.geofences);
    } catch (error: any) {
      toast.error('Failed to load geofences');
    } finally {
      setIsLoading(false);
    }
  };

  const loadViolations = async (geofenceId: number) => {
    try {
      const violationsData = await geofenceApi.getViolations(geofenceId);
      setViolations((prev) => ({
        ...prev,
        [geofenceId]: violationsData.violations,
      }));
    } catch (error: any) {
      toast.error('Failed to load violations');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleViolations = (geofenceId: number) => {
    if (expandedGeofence === geofenceId) {
      setExpandedGeofence(null);
    } else {
      setExpandedGeofence(geofenceId);
      if (!violations[geofenceId]) {
        loadViolations(geofenceId);
      }
    }
  };

  const handleShowMap = async (geofence: Geofence) => {
    setSelectedGeofence(geofence);
    try {
      const data = await locationApi.getFamilyLocations();
      const currentUserLocation = data.locations.find(loc => loc.location);
      if (currentUserLocation) {
        setUserLocation({
          latitude: currentUserLocation.location.latitude,
          longitude: currentUserLocation.location.longitude,
        });
      }
    } catch (error) {
      console.error('Failed to load user location:', error);
    }
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters} m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 pt-16 px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Geofences</h1>
            <p className="text-gray-600 mt-2">
              View active geofences and violation history for your family
            </p>
          </div>

          {/* Info Alert */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">About Geofences</p>
                <p>
                  Geofences are virtual boundaries around specific locations. Your family admin
                  receives email notifications when family members enter or exit these areas.
                  Contact your admin to create or modify geofences.
                </p>
              </div>
            </div>
          </div>

          {/* Geofences Grid */}
          {geofences.length === 0 ? (
            <div className="card text-center py-12">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No geofences configured</h3>
              <p className="text-gray-600">
                Your family admin hasn't set up any geofences yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {geofences.map((geofence) => (
                <div key={geofence.id} className="card">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPinned className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{geofence.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {geofence.user_id ? (
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              Tracking specific user
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              Tracking all family members
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div>
                      {geofence.is_active ? (
                        <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-medium">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full font-medium">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Location</p>
                      <button
                        onClick={() => handleShowMap(geofence)}
                        className="text-sm text-primary-600 hover:underline font-medium text-left"
                      >
                        {geofence.latitude.toFixed(4)}, {geofence.longitude.toFixed(4)}
                      </button>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Radius</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDistance(geofence.radius)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Notifications</p>
                      <div className="flex gap-2">
                        {geofence.notify_on_enter && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                            Enter
                          </span>
                        )}
                        {geofence.notify_on_exit && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium">
                            Exit
                          </span>
                        )}
                        {!geofence.notify_on_enter && !geofence.notify_on_exit && (
                          <span className="text-xs text-gray-500">None</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Violations Section */}
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleToggleViolations(geofence.id)}
                      className="text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                      {expandedGeofence === geofence.id
                        ? 'Hide Recent Violations'
                        : 'Show Recent Violations'}
                    </button>

                    {expandedGeofence === geofence.id && (
                      <div className="mt-4">
                        {violations[geofence.id] === undefined ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                          </div>
                        ) : violations[geofence.id].length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <p>No violations recorded yet</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {violations[geofence.id].slice(0, 10).map((violation) => (
                              <div
                                key={violation.id}
                                className="bg-gray-50 p-3 rounded-lg flex items-start justify-between"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-gray-900">
                                      {violation.user_name}
                                    </span>
                                    <span
                                      className={
                                        'text-xs px-2 py-1 rounded font-medium ' +
                                        (violation.violation_type === 'exit'
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-green-100 text-green-700')
                                      }
                                    >
                                      {violation.violation_type === 'exit' ? 'Exited' : 'Entered'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600">
                                    {formatDate(violation.created_at)}
                                  </p>
                                </div>
                                <a
                                  href={`https://www.google.com/maps?q=${violation.latitude},${violation.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary-600 hover:underline"
                                >
                                  View Location
                                </a>
                              </div>
                            ))}
                            {violations[geofence.id].length > 10 && (
                              <p className="text-xs text-gray-500 text-center pt-2">
                                Showing 10 most recent violations
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map Modal */}
        {selectedGeofence && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedGeofence.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Radius: {formatDistance(selectedGeofence.radius)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedGeofence(null);
                    setUserLocation(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Map Container */}
              <div className="relative w-full h-[600px]">
                <MapContainer
                  center={[selectedGeofence.latitude, selectedGeofence.longitude]}
                  zoom={17}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* Geofence Center Marker */}
                  <Marker
                    position={[selectedGeofence.latitude, selectedGeofence.longitude]}
                    icon={DefaultIcon}
                  >
                    <Popup>
                      <div className="p-2">
                        <h4 className="font-bold text-gray-900">{selectedGeofence.name}</h4>
                        <p className="text-sm text-gray-600">Geofence Center</p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Geofence Radius Circle */}
                  <Circle
                    center={[selectedGeofence.latitude, selectedGeofence.longitude]}
                    radius={selectedGeofence.radius}
                    pathOptions={{
                      color: selectedGeofence.is_active ? '#3b82f6' : '#9ca3af',
                      fillColor: selectedGeofence.is_active ? '#3b82f6' : '#9ca3af',
                      fillOpacity: 0.2,
                      weight: 2,
                    }}
                  />

                  {/* User Location Marker (if available) */}
                  {userLocation && (
                    <Marker
                      position={[userLocation.latitude, userLocation.longitude]}
                      icon={new Icon({
                        iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                        `),
                        iconSize: [30, 30],
                        iconAnchor: [15, 30],
                        popupAnchor: [0, -30],
                      })}
                    >
                      <Popup>
                        <div className="p-2">
                          <h4 className="font-bold text-gray-900">Your Location</h4>
                          <p className="text-sm text-gray-600">Current position</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>

                {/* Legend */}
                <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-600"></div>
                      <span className="text-gray-700">Geofence Center</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-blue-500 bg-blue-500 opacity-30"></div>
                      <span className="text-gray-700">Geofence Radius</span>
                    </div>
                    {userLocation && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-600"></div>
                        <span className="text-gray-700">Your Location</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
