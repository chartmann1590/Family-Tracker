import { pool } from '../config/database';
import emailService from './emailService';

export interface Geofence {
  id: number;
  family_id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  user_id: number | null;
  is_active: boolean;
  notify_on_exit: boolean;
  notify_on_enter: boolean;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface GeofenceViolation {
  id: number;
  geofence_id: number;
  user_id: number;
  violation_type: 'enter' | 'exit';
  latitude: number;
  longitude: number;
  notified: boolean;
  notification_sent_at: Date | null;
  created_at: Date;
}

export class GeofenceService {
  private static instance: GeofenceService;
  private userLastStatus: Map<string, Map<number, boolean>> = new Map(); // user_id -> geofence_id -> isInside

  private constructor() {}

  public static getInstance(): GeofenceService {
    if (!GeofenceService.instance) {
      GeofenceService.instance = new GeofenceService();
    }
    return GeofenceService.instance;
  }

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in meters
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Check if a point is inside a geofence
   */
  private isInsideGeofence(
    lat: number,
    lon: number,
    geofence: Geofence
  ): boolean {
    const distance = this.calculateDistance(
      lat,
      lon,
      geofence.latitude,
      geofence.longitude
    );
    return distance <= geofence.radius;
  }

  /**
   * Check location against active geofences and detect violations
   */
  public async checkGeofences(params: {
    userId: number;
    familyId: number;
    latitude: number;
    longitude: number;
    timestamp: Date;
  }): Promise<void> {
    const { userId, familyId, latitude, longitude, timestamp } = params;

    try {
      // Get active geofences for this family/user
      const geofencesResult = await pool.query<Geofence>(
        `SELECT * FROM geofences
         WHERE family_id = $1
         AND is_active = true
         AND (user_id IS NULL OR user_id = $2)
         ORDER BY id`,
        [familyId, userId]
      );

      const geofences = geofencesResult.rows;

      if (geofences.length === 0) {
        return; // No geofences to check
      }

      // Initialize user status map if not exists
      const userKey = `${userId}`;
      if (!this.userLastStatus.has(userKey)) {
        this.userLastStatus.set(userKey, new Map());
      }
      const userStatus = this.userLastStatus.get(userKey)!;

      // Check each geofence
      for (const geofence of geofences) {
        const isInside = this.isInsideGeofence(latitude, longitude, geofence);
        const wasInside = userStatus.get(geofence.id);

        // Detect violations
        if (wasInside === undefined) {
          // First time checking this geofence, just store the status
          userStatus.set(geofence.id, isInside);
        } else if (wasInside && !isInside && geofence.notify_on_exit) {
          // User exited geofence
          await this.recordViolation({
            geofenceId: geofence.id,
            geofenceName: geofence.name,
            userId,
            violationType: 'exit',
            latitude,
            longitude,
            timestamp,
          });
          userStatus.set(geofence.id, false);
        } else if (!wasInside && isInside && geofence.notify_on_enter) {
          // User entered geofence
          await this.recordViolation({
            geofenceId: geofence.id,
            geofenceName: geofence.name,
            userId,
            violationType: 'enter',
            latitude,
            longitude,
            timestamp,
          });
          userStatus.set(geofence.id, true);
        } else if (wasInside !== isInside) {
          // Status changed but no notification configured
          userStatus.set(geofence.id, isInside);
        }
      }
    } catch (error) {
      console.error('❌ Error checking geofences:', error);
    }
  }

  /**
   * Record geofence violation and send notification
   */
  private async recordViolation(params: {
    geofenceId: number;
    geofenceName: string;
    userId: number;
    violationType: 'enter' | 'exit';
    latitude: number;
    longitude: number;
    timestamp: Date;
  }): Promise<void> {
    const {
      geofenceId,
      geofenceName,
      userId,
      violationType,
      latitude,
      longitude,
      timestamp,
    } = params;

    try {
      // Get user name
      const userResult = await pool.query(
        'SELECT name FROM users WHERE id = $1',
        [userId]
      );
      const userName = userResult.rows[0]?.name || 'Unknown User';

      // Record violation
      const violationResult = await pool.query<GeofenceViolation>(
        `INSERT INTO geofence_violations
         (geofence_id, user_id, violation_type, latitude, longitude, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [geofenceId, userId, violationType, latitude, longitude, timestamp]
      );

      const violation = violationResult.rows[0];

      console.log(
        `⚠️  Geofence violation: ${userName} ${violationType} ${geofenceName}`
      );

      // Send email notification
      const emailSent = await emailService.sendGeofenceViolation({
        userName,
        geofenceName,
        violationType,
        latitude,
        longitude,
        timestamp,
      });

      // Update notification status
      if (emailSent) {
        await pool.query(
          `UPDATE geofence_violations
           SET notified = true, notification_sent_at = NOW()
           WHERE id = $1`,
          [violation.id]
        );
      }
    } catch (error) {
      console.error('❌ Error recording geofence violation:', error);
    }
  }

  /**
   * Get geofences for a family
   */
  public async getGeofencesForFamily(familyId: number): Promise<Geofence[]> {
    const result = await pool.query<Geofence>(
      'SELECT * FROM geofences WHERE family_id = $1 ORDER BY created_at DESC',
      [familyId]
    );
    return result.rows;
  }

  /**
   * Get violations for a geofence
   */
  public async getViolationsForGeofence(
    geofenceId: number
  ): Promise<GeofenceViolation[]> {
    const result = await pool.query<GeofenceViolation>(
      `SELECT gv.*, u.name as user_name
       FROM geofence_violations gv
       JOIN users u ON gv.user_id = u.id
       WHERE gv.geofence_id = $1
       ORDER BY gv.created_at DESC
       LIMIT 100`,
      [geofenceId]
    );
    return result.rows;
  }

  /**
   * Clear user status (useful for testing or when geofences change)
   */
  public clearUserStatus(userId: number): void {
    this.userLastStatus.delete(`${userId}`);
  }
}

export default GeofenceService.getInstance();
