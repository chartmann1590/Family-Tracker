export interface User {
  id: number;
  email: string;
  name: string;
  is_admin: boolean;
  family_id: number | null;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  battery?: number;
  timestamp: string;
}

export interface LocationWithUser {
  userId: number;
  userName: string;
  userEmail?: string;
  location: Location;
}

export interface Family {
  id: number;
  name: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  members?: FamilyMember[];
}

export interface FamilyMember {
  id: number;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  battery?: number;
}
