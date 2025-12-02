import { Router, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types';
import geofenceService from '../services/geofenceService';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get geofences for the user's family
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.family_id) {
      return res.status(400).json({ error: 'User is not part of a family' });
    }

    const geofences = await geofenceService.getGeofencesForFamily(req.user.family_id);
    res.json({ geofences });
  } catch (error) {
    console.error('Get geofences error:', error);
    res.status(500).json({ error: 'Failed to retrieve geofences' });
  }
});

// Create a new geofence
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.family_id) {
      return res.status(400).json({ error: 'User is not part of a family' });
    }

    const {
      name,
      latitude,
      longitude,
      radius,
      user_id,
      notify_on_exit,
      notify_on_enter,
    } = z.object({
      name: z.string().min(1),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      radius: z.number().int().min(10).max(100000), // 10m to 100km
      user_id: z.number().int().nullable().optional(),
      notify_on_exit: z.boolean().optional().default(true),
      notify_on_enter: z.boolean().optional().default(false),
    }).parse(req.body);

    // If user_id is specified, verify it belongs to the same family
    if (user_id) {
      const userResult = await pool.query(
        'SELECT family_id FROM users WHERE id = $1',
        [user_id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (userResult.rows[0].family_id !== req.user.family_id) {
        return res.status(403).json({ error: 'User not in your family' });
      }
    }

    const result = await pool.query(
      `INSERT INTO geofences
       (family_id, name, latitude, longitude, radius, user_id,
        notify_on_exit, notify_on_enter, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.user.family_id,
        name,
        latitude,
        longitude,
        radius,
        user_id || null,
        notify_on_exit,
        notify_on_enter,
        req.user.id,
      ]
    );

    res.status(201).json({ geofence: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create geofence error:', error);
    res.status(500).json({ error: 'Failed to create geofence' });
  }
});

// Update geofence
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.family_id) {
      return res.status(400).json({ error: 'User is not part of a family' });
    }

    const geofenceId = parseInt(req.params.id);
    const {
      name,
      latitude,
      longitude,
      radius,
      is_active,
      notify_on_exit,
      notify_on_enter,
    } = z.object({
      name: z.string().min(1).optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      radius: z.number().int().min(10).max(100000).optional(),
      is_active: z.boolean().optional(),
      notify_on_exit: z.boolean().optional(),
      notify_on_enter: z.boolean().optional(),
    }).parse(req.body);

    // Verify geofence belongs to user's family
    const geofenceResult = await pool.query(
      'SELECT family_id FROM geofences WHERE id = $1',
      [geofenceId]
    );

    if (geofenceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    if (geofenceResult.rows[0].family_id !== req.user.family_id) {
      return res.status(403).json({ error: 'Not authorized to modify this geofence' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (latitude !== undefined) {
      updates.push(`latitude = $${paramCount++}`);
      values.push(latitude);
    }
    if (longitude !== undefined) {
      updates.push(`longitude = $${paramCount++}`);
      values.push(longitude);
    }
    if (radius !== undefined) {
      updates.push(`radius = $${paramCount++}`);
      values.push(radius);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    if (notify_on_exit !== undefined) {
      updates.push(`notify_on_exit = $${paramCount++}`);
      values.push(notify_on_exit);
    }
    if (notify_on_enter !== undefined) {
      updates.push(`notify_on_enter = $${paramCount++}`);
      values.push(notify_on_enter);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(geofenceId);

    const result = await pool.query(
      `UPDATE geofences SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    res.json({ geofence: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update geofence error:', error);
    res.status(500).json({ error: 'Failed to update geofence' });
  }
});

// Delete geofence
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.family_id) {
      return res.status(400).json({ error: 'User is not part of a family' });
    }

    const geofenceId = parseInt(req.params.id);

    // Verify geofence belongs to user's family
    const geofenceResult = await pool.query(
      'SELECT family_id FROM geofences WHERE id = $1',
      [geofenceId]
    );

    if (geofenceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    if (geofenceResult.rows[0].family_id !== req.user.family_id) {
      return res.status(403).json({ error: 'Not authorized to delete this geofence' });
    }

    await pool.query('DELETE FROM geofences WHERE id = $1', [geofenceId]);

    res.json({ success: true, message: 'Geofence deleted successfully' });
  } catch (error) {
    console.error('Delete geofence error:', error);
    res.status(500).json({ error: 'Failed to delete geofence' });
  }
});

// Get violations for a specific geofence
router.get('/:id/violations', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.family_id) {
      return res.status(400).json({ error: 'User is not part of a family' });
    }

    const geofenceId = parseInt(req.params.id);

    // Verify geofence belongs to user's family
    const geofenceResult = await pool.query(
      'SELECT family_id FROM geofences WHERE id = $1',
      [geofenceId]
    );

    if (geofenceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    if (geofenceResult.rows[0].family_id !== req.user.family_id) {
      return res.status(403).json({ error: 'Not authorized to view these violations' });
    }

    const violations = await geofenceService.getViolationsForGeofence(geofenceId);

    res.json({ violations });
  } catch (error) {
    console.error('Get violations error:', error);
    res.status(500).json({ error: 'Failed to retrieve violations' });
  }
});

export default router;
