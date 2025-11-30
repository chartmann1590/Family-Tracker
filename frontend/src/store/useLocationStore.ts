import { create } from 'zustand';
import { LocationWithUser } from '../types';
import { locationApi } from '../lib/api';
import { wsClient } from '../lib/websocket';

interface LocationState {
  locations: LocationWithUser[];
  isLoading: boolean;
  error: string | null;
  fetchLocations: () => Promise<void>;
  updateLocation: (location: LocationWithUser) => void;
  initWebSocket: () => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  locations: [],
  isLoading: false,
  error: null,

  fetchLocations: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await locationApi.getFamilyLocations();
      set({ locations: response.locations, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to fetch locations',
        isLoading: false,
      });
    }
  },

  updateLocation: (newLocation: LocationWithUser) => {
    set((state) => {
      const existingIndex = state.locations.findIndex(
        (loc) => loc.userId === newLocation.userId
      );

      if (existingIndex >= 0) {
        const updatedLocations = [...state.locations];
        updatedLocations[existingIndex] = newLocation;
        return { locations: updatedLocations };
      } else {
        return { locations: [...state.locations, newLocation] };
      }
    });
  },

  initWebSocket: () => {
    wsClient.on('location_update', (data: LocationWithUser) => {
      console.log('Location update received:', data);
      get().updateLocation(data);
    });
  },
}));
