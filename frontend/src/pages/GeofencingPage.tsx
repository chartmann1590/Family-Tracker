import { useEffect, useState } from 'react';
import { adminApi, geofenceApi } from '../lib/api';
import Navbar from '../components/Navbar';
import { MapPin, AlertTriangle, Clock, Loader2, CheckCircle, XCircle, Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import GeofenceMapEditor from '../components/GeofenceMapEditor';

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
  family_name: string;
  user_name: string | null;
  created_by_name: string;
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
  geofence_name: string;
  user_name: string;
  family_name: string;
}

interface Family {
  id: number;
  name: string;
  members?: FamilyMember[];
}

interface FamilyMember {
  id: number;
  name: string;
  email: string;
}

export default function GeofencingPage() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'geofences' | 'violations'>('geofences');
  const [showModal, setShowModal] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    latitude: 0,
    longitude: 0,
    radius: 100,
    family_id: 0,
    user_id: null as number | null,
    notify_on_exit: true,
    notify_on_enter: false,
    is_active: true,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [geofencesData, violationsData, familiesData, usersData] = await Promise.all([
        adminApi.getAllGeofences(),
        adminApi.getViolations(100, 0),
        adminApi.getFamilies(),
        adminApi.getUsers(),
      ]);
      setGeofences(geofencesData.geofences);
      setViolations(violationsData.violations);
      setFamilies(familiesData.families);
      setUsers(usersData.users);
    } catch (error: any) {
      toast.error('Failed to load geofencing data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          toast.success('Current location captured!');
        },
        () => {
          toast.error('Failed to get location. Please enable location services.');
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
  };

  const handleOpenModal = (geofence?: Geofence) => {
    if (geofence) {
      setEditingGeofence(geofence);
      setFormData({
        name: geofence.name,
        latitude: geofence.latitude,
        longitude: geofence.longitude,
        radius: geofence.radius,
        family_id: geofence.family_id,
        user_id: geofence.user_id,
        notify_on_exit: geofence.notify_on_exit,
        notify_on_enter: geofence.notify_on_enter,
        is_active: geofence.is_active,
      });
    } else {
      setEditingGeofence(null);
      // Try to get current location as default
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setFormData({
              name: '',
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              radius: 100,
              family_id: families.length > 0 ? families[0].id : 0,
              user_id: null,
              notify_on_exit: true,
              notify_on_enter: false,
              is_active: true,
            });
          },
          () => {
            // Default to NYC if geolocation fails
            setFormData({
              name: '',
              latitude: 40.7128,
              longitude: -74.006,
              radius: 100,
              family_id: families.length > 0 ? families[0].id : 0,
              user_id: null,
              notify_on_exit: true,
              notify_on_enter: false,
              is_active: true,
            });
          }
        );
      } else {
        setFormData({
          name: '',
          latitude: 40.7128,
          longitude: -74.006,
          radius: 100,
          family_id: families.length > 0 ? families[0].id : 0,
          user_id: null,
          notify_on_exit: true,
          notify_on_enter: false,
          is_active: true,
        });
      }
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGeofence(null);
  };

  const handleSave = async () => {
    if (!formData.name || formData.latitude === 0 || formData.longitude === 0 || formData.family_id === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.radius < 10 || formData.radius > 100000) {
      toast.error('Radius must be between 10 and 100,000 meters');
      return;
    }

    setIsSaving(true);
    try {
      if (editingGeofence) {
        await geofenceApi.updateGeofence(editingGeofence.id, formData);
        toast.success('Geofence updated successfully');
      } else {
        await geofenceApi.createGeofence(formData);
        toast.success('Geofence created successfully');
      }
      await loadData();
      handleCloseModal();
    } catch (error: any) {
      toast.error('Failed to save geofence');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this geofence? This will also delete all violation history.')) {
      return;
    }

    try {
      await geofenceApi.deleteGeofence(id);
      toast.success('Geofence deleted successfully');
      await loadData();
    } catch (error: any) {
      toast.error('Failed to delete geofence');
    }
  };

  const handleToggleActive = async (geofence: Geofence) => {
    try {
      await geofenceApi.updateGeofence(geofence.id, {
        is_active: !geofence.is_active,
      });
      toast.success(geofence.is_active ? 'Geofence deactivated' : 'Geofence activated');
      await loadData();
    } catch (error: any) {
      toast.error('Failed to update geofence');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters} m`;
  };

  const getFamilyUsers = (familyId: number) => {
    return users.filter((u) => u.family_id === familyId);
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
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Geofencing Management
            </h1>
            {activeTab === 'geofences' && (
              <button onClick={() => handleOpenModal()} className="btn btn-primary">
                <Plus className="w-5 h-5" />
                Create Geofence
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex gap-8">
              <button
                onClick={() => setActiveTab('geofences')}
                className={'py-4 px-1 border-b-2 font-medium text-sm transition-colors ' + (
                  activeTab === 'geofences'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Geofences ({geofences.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('violations')}
                className={'py-4 px-1 border-b-2 font-medium text-sm transition-colors ' + (
                  activeTab === 'violations'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Violations ({violations.length})
                </div>
              </button>
            </nav>
          </div>

          {/* Geofences Tab */}
          {activeTab === 'geofences' && (
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                All Geofences
              </h2>
              {geofences.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="mb-4">No geofences configured yet</p>
                  <button onClick={() => handleOpenModal()} className="btn btn-primary">
                    <Plus className="w-5 h-5" />
                    Create First Geofence
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Name
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Family
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          User
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Location
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Radius
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Notifications
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {geofences.map((geofence) => (
                        <tr key={geofence.id} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">
                            {geofence.name}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {geofence.family_name}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {geofence.user_name || 'All family members'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            <a
                              href={`https://www.google.com/maps?q=${geofence.latitude},${geofence.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:underline"
                            >
                              {geofence.latitude.toFixed(4)}, {geofence.longitude.toFixed(4)}
                            </a>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {formatDistance(geofence.radius)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
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
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleActive(geofence)}
                              className={
                                'text-xs px-3 py-1.5 rounded-full font-medium ' +
                                (geofence.is_active
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                              }
                            >
                              {geofence.is_active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleOpenModal(geofence)}
                                className="text-blue-600 hover:text-blue-700"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(geofence.id)}
                                className="text-red-600 hover:text-red-700"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Violations Tab */}
          {activeTab === 'violations' && (
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Recent Violations
              </h2>
              {violations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>No violations recorded yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Timestamp
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          User
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Family
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Geofence
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Type
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Location
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Notified
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {violations.map((violation) => (
                        <tr key={violation.id} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              {formatDate(violation.created_at)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">
                            {violation.user_name}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {violation.family_name}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {violation.geofence_name}
                          </td>
                          <td className="py-3 px-4">
                            {violation.violation_type === 'exit' ? (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                                Exited
                              </span>
                            ) : (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                Entered
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            <a
                              href={`https://www.google.com/maps?q=${violation.latitude},${violation.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:underline"
                            >
                              {violation.latitude.toFixed(4)}, {violation.longitude.toFixed(4)}
                            </a>
                          </td>
                          <td className="py-3 px-4">
                            {violation.notified ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs">
                                  {violation.notification_sent_at
                                    ? formatDate(violation.notification_sent_at)
                                    : 'Yes'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-gray-400">
                                <XCircle className="w-4 h-4" />
                                <span className="text-xs">No</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingGeofence ? 'Edit Geofence' : 'Create Geofence'}
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Form Fields */}
                <div className="space-y-4">
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Geofence Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input w-full"
                    placeholder="Home, School, Work, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Family *
                  </label>
                  <select
                    value={formData.family_id}
                    onChange={(e) =>
                      setFormData({ ...formData, family_id: parseInt(e.target.value), user_id: null })
                    }
                    className="input w-full"
                    disabled={!!editingGeofence}
                  >
                    <option value={0}>Select a family</option>
                    {families.map((family) => (
                      <option key={family.id} value={family.id}>
                        {family.name}
                      </option>
                    ))}
                  </select>
                  {editingGeofence && (
                    <p className="text-xs text-gray-500 mt-1">
                      Cannot change family for existing geofence
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Track Specific User (Optional)
                  </label>
                  <select
                    value={formData.user_id || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        user_id: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="input w-full"
                    disabled={formData.family_id === 0}
                  >
                    <option value="">All Family Members</option>
                    {getFamilyUsers(formData.family_id).map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Latitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) =>
                        setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })
                      }
                      className="input w-full"
                      placeholder="40.7128"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Longitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) =>
                        setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })
                      }
                      className="input w-full"
                      placeholder="-74.0060"
                    />
                  </div>
                </div>

                <button
                  onClick={handleGetCurrentLocation}
                  className="btn btn-secondary w-full"
                >
                  <MapPin className="w-4 h-4" />
                  Use Current Location
                </button>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Radius (meters) *
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="5000"
                      value={formData.radius}
                      onChange={(e) =>
                        setFormData({ ...formData, radius: parseInt(e.target.value) })
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>10m</span>
                      <span className="font-semibold">{formatDistance(formData.radius)}</span>
                      <span>5km</span>
                    </div>
                    <input
                      type="number"
                      value={formData.radius}
                      onChange={(e) =>
                        setFormData({ ...formData, radius: parseInt(e.target.value) || 100 })
                      }
                      className="input w-full mt-2"
                      placeholder="100"
                      min="10"
                      max="100000"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Between 10 and 100,000 meters. Current: {formatDistance(formData.radius)}
                    </p>
                  </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Notification Settings
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.notify_on_enter}
                      onChange={(e) =>
                        setFormData({ ...formData, notify_on_enter: e.target.checked })
                      }
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                    />
                    <span className="text-sm text-gray-700">
                      Send notification when entering this area
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.notify_on_exit}
                      onChange={(e) =>
                        setFormData({ ...formData, notify_on_exit: e.target.checked })
                      }
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                    />
                    <span className="text-sm text-gray-700">
                      Send notification when exiting this area
                    </span>
                  </label>
                </div>

                <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) =>
                          setFormData({ ...formData, is_active: e.target.checked })
                        }
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Geofence is active
                      </span>
                    </label>
                  </div>
                </div>

                {/* Right Column - Interactive Map */}
                <GeofenceMapEditor
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  radius={formData.radius}
                  onLocationChange={(lat, lng) => {
                    setFormData({ ...formData, latitude: lat, longitude: lng });
                    toast.success("Location updated!");
                  }}
                />
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleCloseModal}
                  disabled={isSaving}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 btn btn-primary"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>{editingGeofence ? 'Update Geofence' : 'Create Geofence'}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
