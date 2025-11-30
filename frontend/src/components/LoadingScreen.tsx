import { Loader2 } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Loading Family Tracker...</p>
      </div>
    </div>
  );
}
