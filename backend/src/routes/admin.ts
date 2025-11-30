import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { pool } from '../config/database';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { AuthRequest } from '../types';

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

export default router;
