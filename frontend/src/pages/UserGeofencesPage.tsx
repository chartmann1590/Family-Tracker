import { useEffect, useState } from 'react';
import { geofenceApi } from '../lib/api';
import Navbar from '../components/Navbar';
import { MapPin, Loader2, AlertCircle, Users, User, MapPinned } from 'lucide-react';
import toast from 'react-hot-toast';

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
                      <a
                        href={`https://www.google.com/maps?q=${geofence.latitude},${geofence.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 hover:underline font-medium"
                      >
                        {geofence.latitude.toFixed(4)}, {geofence.longitude.toFixed(4)}
                      </a>
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
      </div>
    </>
  );
}
