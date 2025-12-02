import axios from 'axios';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  Family,
  LocationWithUser,
  LocationUpdate,
  Message,
  SendMessageRequest,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  me: async (): Promise<{ user: User }> => {
    const response = await api.get<{ user: User }>('/auth/me');
    return response.data;
  },
};

// Locations
export const locationApi = {
  updateLocation: async (data: LocationUpdate) => {
    const response = await api.post('/locations', data);
    return response.data;
  },

  getFamilyLocations: async (): Promise<{ locations: LocationWithUser[] }> => {
    const response = await api.get<{ locations: LocationWithUser[] }>('/locations/family');
    return response.data;
  },

  getLocationHistory: async (userId: number, limit = 100) => {
    const response = await api.get(`/locations/history/${userId}`, {
      params: { limit },
    });
    return response.data;
  },
};

// Families
export const familyApi = {
  createFamily: async (name: string): Promise<{ family: Family }> => {
    const response = await api.post<{ family: Family }>('/families', { name });
    return response.data;
  },

  getMyFamily: async (): Promise<{ family: Family }> => {
    const response = await api.get<{ family: Family }>('/families/me');
    return response.data;
  },

  updateFamily: async (name: string): Promise<{ family: Family }> => {
    const response = await api.patch<{ family: Family }>('/families', { name });
    return response.data;
  },

  inviteUser: async (email: string) => {
    const response = await api.post('/families/invite', { email });
    return response.data;
  },

  leaveFamily: async () => {
    const response = await api.post('/families/leave');
    return response.data;
  },
};

// Admin
export const adminApi = {
  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  createUser: async (data: any) => {
    const response = await api.post('/admin/users', data);
    return response.data;
  },

  updateUser: async (id: number, data: any) => {
    const response = await api.patch(`/admin/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: number) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  getFamilies: async () => {
    const response = await api.get('/admin/families');
    return response.data;
  },

  deleteFamily: async (id: number) => {
    const response = await api.delete(`/admin/families/${id}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // SMTP Settings
  getSmtpSettings: async () => {
    const response = await api.get('/admin/smtp-settings');
    return response.data;
  },

  saveSmtpSettings: async (data: any) => {
    const response = await api.post('/admin/smtp-settings', data);
    return response.data;
  },

  testSmtpConnection: async () => {
    const response = await api.post('/admin/smtp-settings/test');
    return response.data;
  },

  // Geofences
  getAllGeofences: async () => {
    const response = await api.get('/admin/geofences');
    return response.data;
  },

  getViolations: async (limit = 100, offset = 0) => {
    const response = await api.get('/admin/geofence-violations', {
      params: { limit, offset },
    });
    return response.data;
  },
};

// Geofences (User)
export const geofenceApi = {
  getGeofences: async () => {
    const response = await api.get('/geofences');
    return response.data;
  },

  createGeofence: async (data: any) => {
    const response = await api.post('/geofences', data);
    return response.data;
  },

  updateGeofence: async (id: number, data: any) => {
    const response = await api.patch(`/geofences/${id}`, data);
    return response.data;
  },

  deleteGeofence: async (id: number) => {
    const response = await api.delete(`/geofences/${id}`);
    return response.data;
  },

  getViolations: async (id: number) => {
    const response = await api.get(`/geofences/${id}/violations`);
    return response.data;
  },
};

// Messages
export const messageApi = {
  getMessages: async (limit = 100): Promise<{ messages: Message[] }> => {
    const response = await api.get<{ messages: Message[] }>('/messages', {
      params: { limit },
    });
    return response.data;
  },

  sendMessage: async (data: SendMessageRequest): Promise<{ message: Message }> => {
    const response = await api.post<{ message: Message }>('/messages', data);
    return response.data;
  },
};

export default api;
