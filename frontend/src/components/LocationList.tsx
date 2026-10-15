import { formatDistanceToNow } from 'date-fns';
import { LocationWithUser } from '../types';
import { MapPin, Battery, Clock, Navigation } from 'lucide-react';
import clsx from 'clsx';

interface LocationListProps {
  locations: LocationWithUser[];
}

function getBatteryColor(battery: number): string {
  if (battery > 50) return 'text-green-600';
  if (battery > 20) return 'text-yellow-600';
  return 'text-red-600';
}

function getBatteryBgColor(battery: number): string {
  if (battery > 50) return 'bg-green-100';
  if (battery > 20) return 'bg-yellow-100';
  return 'bg-red-100';
}

export default function LocationList({ locations }: LocationListProps) {
  if (locations.length === 0) {
    return (
      <div className="p-6 text-center">
        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No locations yet</p>
        <p className="text-sm text-gray-500 mt-1">
          Family members will appear here when they share their location
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Family Locations ({locations.length})
      </h2>
      <div className="space-y-3">
        {locations.map((loc) => (
          <div
            key={loc.userId}
            className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-primary-300 transition-all duration-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  {loc.userName}
                </h3>
                {loc.userEmail && (
                  <p className="text-xs text-gray-500">{loc.userEmail}</p>
                )}
              </div>
              {loc.location.battery !== undefined && (
                <div
                  className={clsx(
                    'flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium',
                    getBatteryBgColor(loc.location.battery),
                    getBatteryColor(loc.location.battery)
                  )}
                >
                  <Battery className="w-4 h-4" />
                  {loc.location.battery}%
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>
                  Updated{' '}
                  {formatDistanceToNow(new Date(loc.location.timestamp), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              {loc.location.accuracy && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Navigation className="w-4 h-4" />
                  <span>±{Math.round(loc.location.accuracy)}m accuracy</span>
                </div>
              )}

              <div className="flex items-start gap-2 text-gray-600 pt-2 border-t border-gray-200 mt-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="text-xs font-mono">
                  <p>{loc.location.latitude.toFixed(6)}°N</p>
                  <p>{loc.location.longitude.toFixed(6)}°E</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
