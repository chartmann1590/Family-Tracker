import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useLocationStore } from '../store/useLocationStore';
import FamilyMap from '../components/FamilyMap';
import Navbar from '../components/Navbar';
import LocationList from '../components/LocationList';
import { Users, AlertCircle, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { locations, isLoading, error, fetchLocations } = useLocationStore();
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLocations();
    // Refresh locations every 30 seconds
    const interval = setInterval(fetchLocations, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!user?.family_id) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center px-4">
          <div className="card max-w-md text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <Users className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Join or Create a Family
            </h2>
            <p className="text-gray-600 mb-6">
              To start tracking locations, you need to be part of a family group.
              Create a new family or ask a family member to invite you.
            </p>
            <button
              onClick={() => navigate('/family')}
              className="btn btn-primary w-full"
            >
              Manage Family
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="h-screen pt-16 flex flex-col lg:flex-row bg-gray-50">
        {/* Map Section */}
        <div className="flex-1 relative">
          <div className="absolute inset-4">
            {isLoading && locations.length === 0 ? (
              <div className="h-full flex items-center justify-center bg-white rounded-xl shadow-lg">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-2" />
                  <p className="text-gray-600">Loading locations...</p>
                </div>
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center bg-white rounded-xl shadow-lg">
                <div className="text-center p-6">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                  <p className="text-gray-800 font-medium mb-2">
                    Failed to load locations
                  </p>
                  <p className="text-sm text-gray-600 mb-4">{error}</p>
                  <button
                    onClick={fetchLocations}
                    className="btn btn-primary"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <FamilyMap locations={locations} />
            )}
          </div>

          {/* Mobile List Toggle */}
          <button
            onClick={() => setIsMobileListOpen(!isMobileListOpen)}
            className="lg:hidden absolute bottom-8 right-8 btn btn-primary shadow-lg z-[1000]"
          >
            <Users className="w-5 h-5 mr-2" />
            Family ({locations.length})
          </button>
        </div>

        {/* Location List - Desktop */}
        <div className="hidden lg:block w-96 bg-white border-l border-gray-200 overflow-y-auto">
          <LocationList locations={locations} />
        </div>

        {/* Location List - Mobile */}
        {isMobileListOpen && (
          <div className="lg:hidden fixed inset-0 z-[1001] bg-black/50 animate-fade-in">
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto animate-slide-up">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  Family Locations
                </h3>
                <button
                  onClick={() => setIsMobileListOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <span className="sr-only">Close</span>
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <LocationList locations={locations} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
