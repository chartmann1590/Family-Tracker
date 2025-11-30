import { Request } from 'express';

export interface User {
  id: number;
  email: string;
  name: string;
  is_admin: boolean;
  family_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface Location {
  id: number;
  user_id: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  battery?: number;
  timestamp: Date;
  created_at: Date;
}

export interface Family {
  id: number;
  name: string;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  battery?: number;
  timestamp?: string;
}

export interface OwnTracksLocation {
  _type: 'location';
  tid?: string;
  lat: number;
  lon: number;
  acc?: number;
  alt?: number;
  batt?: number;
  tst: number;
}
