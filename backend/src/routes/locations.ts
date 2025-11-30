import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest, LocationUpdate } from '../types';
import { broadcastLocationUpdate } from '../websocket';

const router = Router();

const locationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  altitude: z.number().optional(),
  battery: z.number().min(0).max(100).optional(),
  timestamp: z.string().optional(),
});

// Update own location
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const data = locationUpdateSchema.parse(req.body) as LocationUpdate;

    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

    const result = await pool.query(
      `INSERT INTO locations (user_id, latitude, longitude, accuracy, altitude, battery, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, latitude, longitude, accuracy, altitude, battery, timestamp, created_at`,
      [
        req.user!.id,
        data.latitude,
        data.longitude,
        data.accuracy || null,
        data.altitude || null,
        data.battery || null,
        timestamp,
      ]
    );

    const location = result.rows[0];

    // Broadcast to WebSocket clients in the same family
    if (req.user!.family_id) {
      broadcastLocationUpdate(req.user!.family_id, {
        userId: req.user!.id,
        userName: req.user!.name,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          altitude: location.altitude,
          battery: location.battery,
          timestamp: location.timestamp,
        },
      });
    }

    res.status(201).json({ success: true, location });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Location update error:', error);
    res.status(500).json({ error: 'Failed to save location' });
  }
});

// Get latest locations for all family members
router.get('/family', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user!.family_id) {
      return res.json({ locations: [] });
    }

    const result = await pool.query(
      `SELECT DISTINCT ON (l.user_id)
        l.id, l.user_id, l.latitude, l.longitude, l.accuracy, l.altitude, l.battery, l.timestamp,
        u.name as user_name, u.email as user_email
       FROM locations l
       INNER JOIN users u ON l.user_id = u.id
       WHERE u.family_id = $1
       ORDER BY l.user_id, l.timestamp DESC`,
      [req.user!.family_id]
    );

    const locations = result.rows.map((row: any) => ({
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      location: {
        latitude: row.latitude,
        longitude: row.longitude,
        accuracy: row.accuracy,
        altitude: row.altitude,
        battery: row.battery,
        timestamp: row.timestamp,
      },
    }));

    res.json({ locations });
  } catch (error) {
    console.error('Get family locations error:', error);
    res.status(500).json({ error: 'Failed to retrieve locations' });
  }
});

// Get location history for a specific user
router.get('/history/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit as string) || 100;

    // Verify user is in the same family or is admin
    const userCheck = await pool.query(
      'SELECT family_id FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetFamilyId = userCheck.rows[0].family_id;

    if (
      !req.user!.is_admin &&
      req.user!.id !== userId &&
      (!req.user!.family_id || req.user!.family_id !== targetFamilyId)
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT id, user_id, latitude, longitude, accuracy, altitude, battery, timestamp, created_at
       FROM locations
       WHERE user_id = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json({ locations: result.rows });
  } catch (error) {
    console.error('Get location history error:', error);
    res.status(500).json({ error: 'Failed to retrieve location history' });
  }
});

export default router;
