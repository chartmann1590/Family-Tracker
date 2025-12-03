import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { pool } from '../config/database';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { AuthRequest } from '../types';
import emailService from '../services/emailService';
import geofenceService from '../services/geofenceService';

const router = Router();

// All routes require admin access
router.use(authenticateToken, requireAdmin);

// Get all users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.is_admin, u.family_id, u.created_at, u.updated_at,
              f.name as family_name
       FROM users u
       LEFT JOIN families f ON u.family_id = f.id
       ORDER BY u.created_at DESC`
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Create user (admin only)
router.post('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, is_admin } = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().min(1),
      is_admin: z.boolean().optional(),
    }).parse(req.body);

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, is_admin)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, is_admin, family_id, created_at, updated_at`,
      [email, passwordHash, name, is_admin || false]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.patch('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { email, name, is_admin, family_id } = z.object({
      email: z.string().email().optional(),
      name: z.string().min(1).optional(),
      is_admin: z.boolean().optional(),
      family_id: z.number().nullable().optional(),
    }).parse(req.body);

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (is_admin !== undefined) {
      updates.push(`is_admin = $${paramCount++}`);
      values.push(is_admin);
    }
    if (family_id !== undefined) {
      updates.push(`family_id = $${paramCount++}`);
      values.push(family_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const result = await pool.query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, email, name, is_admin, family_id, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    // Prevent deleting yourself
    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get all families
router.get('/families', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT f.id, f.name, f.created_by, f.created_at, f.updated_at,
              u.name as creator_name,
              COUNT(um.id) as member_count
       FROM families f
       LEFT JOIN users u ON f.created_by = u.id
       LEFT JOIN users um ON um.family_id = f.id
       GROUP BY f.id, u.name
       ORDER BY f.created_at DESC`
    );

    res.json({ families: result.rows });
  } catch (error) {
    console.error('Get families error:', error);
    res.status(500).json({ error: 'Failed to retrieve families' });
  }
});

// Delete family
router.delete('/families/:id', async (req: AuthRequest, res: Response) => {
  try {
    const familyId = parseInt(req.params.id);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Remove family_id from all users
      await client.query(
        'UPDATE users SET family_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE family_id = $1',
        [familyId]
      );

      // Delete family
      const result = await client.query(
        'DELETE FROM families WHERE id = $1 RETURNING id',
        [familyId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Family not found' });
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'Family deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete family error:', error);
    res.status(500).json({ error: 'Failed to delete family' });
  }
});

// Get system statistics
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const familiesResult = await pool.query('SELECT COUNT(*) as count FROM families');
    const locationsResult = await pool.query('SELECT COUNT(*) as count FROM locations');
    const recentLocationsResult = await pool.query(
      `SELECT COUNT(*) as count FROM locations
       WHERE timestamp > NOW() - INTERVAL '24 hours'`
    );

    res.json({
      stats: {
        totalUsers: parseInt(usersResult.rows[0].count),
        totalFamilies: parseInt(familiesResult.rows[0].count),
        totalLocations: parseInt(locationsResult.rows[0].count),
        locationsLast24h: parseInt(recentLocationsResult.rows[0].count),
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

// ===== SMTP Settings Routes =====

// Get SMTP settings
router.get('/smtp-settings', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM smtp_settings ORDER BY id DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      return res.json({ smtpSettings: null });
    }

    // Don't send the password to the frontend
    const settings = { ...result.rows[0] };
    delete settings.smtp_password;

    res.json({ smtpSettings: settings });
  } catch (error) {
    console.error('Get SMTP settings error:', error);
    res.status(500).json({ error: 'Failed to retrieve SMTP settings' });
  }
});

// Create or update SMTP settings
router.post('/smtp-settings', async (req: AuthRequest, res: Response) => {
  try {
    const {
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_user,
      smtp_password,
      from_email,
      from_name,
      admin_email,
      notification_emails,
      notify_low_battery,
      low_battery_threshold,
      notify_device_offline,
      device_offline_minutes,
    } = z.object({
      smtp_host: z.string().min(1),
      smtp_port: z.number().int().min(1).max(65535),
      smtp_secure: z.boolean(),
      smtp_user: z.string().min(1),
      smtp_password: z.string().min(1),
      from_email: z.string().email(),
      from_name: z.string().optional().default('Family Tracker'),
      admin_email: z.string().email(),
      notification_emails: z.array(z.string().email()).optional().default([]),
      notify_low_battery: z.boolean().optional().default(false),
      low_battery_threshold: z.number().int().min(5).max(50).optional().default(20),
      notify_device_offline: z.boolean().optional().default(false),
      device_offline_minutes: z.number().int().min(10).max(1440).optional().default(30),
    }).parse(req.body);

    // Check if settings exist
    const existingResult = await pool.query(
      'SELECT id FROM smtp_settings ORDER BY id DESC LIMIT 1'
    );

    let result;
    if (existingResult.rows.length > 0) {
      // Update existing settings
      result = await pool.query(
        `UPDATE smtp_settings
         SET smtp_host = $1, smtp_port = $2, smtp_secure = $3,
             smtp_user = $4, smtp_password = $5, from_email = $6,
             from_name = $7, admin_email = $8, notification_emails = $9,
             notify_low_battery = $10, low_battery_threshold = $11,
             notify_device_offline = $12, device_offline_minutes = $13,
             updated_at = NOW()
         WHERE id = $14
         RETURNING id, smtp_host, smtp_port, smtp_secure, smtp_user, from_email,
                   from_name, admin_email, notification_emails,
                   notify_low_battery, low_battery_threshold,
                   notify_device_offline, device_offline_minutes,
                   created_at, updated_at`,
        [
          smtp_host,
          smtp_port,
          smtp_secure,
          smtp_user,
          smtp_password,
          from_email,
          from_name,
          admin_email,
          notification_emails,
          notify_low_battery,
          low_battery_threshold,
          notify_device_offline,
          device_offline_minutes,
          existingResult.rows[0].id,
        ]
      );
    } else {
      // Insert new settings
      result = await pool.query(
        `INSERT INTO smtp_settings
         (smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password,
          from_email, from_name, admin_email, notification_emails,
          notify_low_battery, low_battery_threshold,
          notify_device_offline, device_offline_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id, smtp_host, smtp_port, smtp_secure, smtp_user, from_email,
                   from_name, admin_email, notification_emails,
                   notify_low_battery, low_battery_threshold,
                   notify_device_offline, device_offline_minutes,
                   created_at, updated_at`,
        [
          smtp_host,
          smtp_port,
          smtp_secure,
          smtp_user,
          smtp_password,
          from_email,
          from_name,
          admin_email,
          notification_emails,
          notify_low_battery,
          low_battery_threshold,
          notify_device_offline,
          device_offline_minutes,
        ]
      );
    }

    // Reload settings in email service
    await emailService.loadSettings();

    res.json({ smtpSettings: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Save SMTP settings error:', error);
    res.status(500).json({ error: 'Failed to save SMTP settings' });
  }
});

// Test SMTP connection
router.post('/smtp-settings/test', async (req: AuthRequest, res: Response) => {
  try {
    await emailService.loadSettings();
    const success = await emailService.testConnection();

    if (success) {
      res.json({ success: true, message: 'SMTP connection successful' });
    } else {
      res.status(400).json({ success: false, error: 'SMTP connection failed' });
    }
  } catch (error) {
    console.error('Test SMTP connection error:', error);
    res.status(500).json({ error: 'Failed to test SMTP connection' });
  }
});

// ===== Geofence Routes =====

// Get all geofences (for all families)
router.get('/geofences', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT g.*, f.name as family_name, u.name as user_name, c.name as created_by_name
       FROM geofences g
       LEFT JOIN families f ON g.family_id = f.id
       LEFT JOIN users u ON g.user_id = u.id
       LEFT JOIN users c ON g.created_by = c.id
       ORDER BY g.created_at DESC`
    );

    res.json({ geofences: result.rows });
  } catch (error) {
    console.error('Get geofences error:', error);
    res.status(500).json({ error: 'Failed to retrieve geofences' });
  }
});

// Get geofence violations
router.get('/geofence-violations', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pool.query(
      `SELECT gv.*, g.name as geofence_name, u.name as user_name,
              f.name as family_name
       FROM geofence_violations gv
       JOIN geofences g ON gv.geofence_id = g.id
       JOIN users u ON gv.user_id = u.id
       JOIN families f ON g.family_id = f.id
       ORDER BY gv.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM geofence_violations'
    );

    res.json({
      violations: result.rows,
      pagination: {
        limit,
        offset,
        total: parseInt(countResult.rows[0].total),
      },
    });
  } catch (error) {
    console.error('Get violations error:', error);
    res.status(500).json({ error: 'Failed to retrieve violations' });
  }
});

export default router;
