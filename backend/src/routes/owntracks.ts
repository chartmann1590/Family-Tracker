import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest, OwnTracksLocation } from '../types';
import { broadcastLocationUpdate } from '../websocket';

const router = Router();

// OwnTracks HTTP endpoint
// OwnTracks can be configured to send location updates to this endpoint
// Authentication can be done via Basic Auth or token in query parameter
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body as OwnTracksLocation;

    // Validate OwnTracks location format
    if (data._type !== 'location' || !data.lat || !data.lon || !data.tst) {
      return res.status(400).json({ error: 'Invalid OwnTracks location data' });
    }

    // Convert Unix timestamp to Date
    const timestamp = new Date(data.tst * 1000);

    // Store location
    const result = await pool.query(
      `INSERT INTO locations (user_id, latitude, longitude, accuracy, altitude, battery, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, latitude, longitude, accuracy, altitude, battery, timestamp, created_at`,
      [
        req.user!.id,
        data.lat,
        data.lon,
        data.acc || null,
        data.alt || null,
        data.batt || null,
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
    console.error('OwnTracks location error:', error);
    res.status(500).json({ error: 'Failed to save location' });
  }
});

// Batch endpoint for OwnTracks
router.post('/batch', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const locations = req.body as OwnTracksLocation[];

    if (!Array.isArray(locations)) {
      return res.status(400).json({ error: 'Expected array of locations' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const data of locations) {
        if (data._type === 'location' && data.lat && data.lon && data.tst) {
          const timestamp = new Date(data.tst * 1000);

          await client.query(
            `INSERT INTO locations (user_id, latitude, longitude, accuracy, altitude, battery, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              req.user!.id,
              data.lat,
              data.lon,
              data.acc || null,
              data.alt || null,
              data.batt || null,
              timestamp,
            ]
          );
        }
      }

      await client.query('COMMIT');

      // Broadcast latest location to WebSocket clients
      if (req.user!.family_id && locations.length > 0) {
        const latest = locations[locations.length - 1];
        if (latest._type === 'location') {
          broadcastLocationUpdate(req.user!.family_id, {
            userId: req.user!.id,
            userName: req.user!.name,
            location: {
              latitude: latest.lat,
              longitude: latest.lon,
              accuracy: latest.acc,
              altitude: latest.alt,
              battery: latest.batt,
              timestamp: new Date(latest.tst * 1000),
            },
          });
        }
      }

      res.status(201).json({ success: true, count: locations.length });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('OwnTracks batch error:', error);
    res.status(500).json({ error: 'Failed to save locations' });
  }
});

export default router;
