import { Router, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

const createFamilySchema = z.object({
  name: z.string().min(1),
});

const updateFamilySchema = z.object({
  name: z.string().min(1).optional(),
});

// Create a new family
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = createFamilySchema.parse(req.body);

    // Check if user already has a family
    if (req.user!.family_id) {
      return res.status(400).json({ error: 'User already belongs to a family' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create family
      const familyResult = await client.query(
        `INSERT INTO families (name, created_by)
         VALUES ($1, $2)
         RETURNING id, name, created_by, created_at, updated_at`,
        [name, req.user!.id]
      );

      const family = familyResult.rows[0];

      // Update user's family_id
      await client.query(
        'UPDATE users SET family_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [family.id, req.user!.id]
      );

      await client.query('COMMIT');

      res.status(201).json({ family });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create family error:', error);
    res.status(500).json({ error: 'Failed to create family' });
  }
});

// Get family details
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user!.family_id) {
      return res.status(404).json({ error: 'User does not belong to a family' });
    }

    const familyResult = await pool.query(
      'SELECT id, name, created_by, created_at, updated_at FROM families WHERE id = $1',
      [req.user!.family_id]
    );

    if (familyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Family not found' });
    }

    const family = familyResult.rows[0];

    // Get all members
    const membersResult = await pool.query(
      'SELECT id, email, name, is_admin, created_at FROM users WHERE family_id = $1',
      [req.user!.family_id]
    );

    res.json({
      family: {
        ...family,
        members: membersResult.rows,
      },
    });
  } catch (error) {
    console.error('Get family error:', error);
    res.status(500).json({ error: 'Failed to retrieve family' });
  }
});

// Update family
router.patch('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user!.family_id) {
      return res.status(404).json({ error: 'User does not belong to a family' });
    }

    const { name } = updateFamilySchema.parse(req.body);

    if (!name) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    // Verify user is the family creator or admin
    const familyResult = await pool.query(
      'SELECT created_by FROM families WHERE id = $1',
      [req.user!.family_id]
    );

    if (familyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Family not found' });
    }

    const family = familyResult.rows[0];

    if (family.created_by !== req.user!.id && !req.user!.is_admin) {
      return res.status(403).json({ error: 'Only family creator or admin can update family' });
    }

    const result = await pool.query(
      `UPDATE families
       SET name = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, name, created_by, created_at, updated_at`,
      [name, req.user!.family_id]
    );

    res.json({ family: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update family error:', error);
    res.status(500).json({ error: 'Failed to update family' });
  }
});

// Invite user to family (by email)
router.post('/invite', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user!.family_id) {
      return res.status(400).json({ error: 'User does not belong to a family' });
    }

    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    // Find user to invite
    const userResult = await pool.query(
      'SELECT id, family_id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found with that email' });
    }

    const invitedUser = userResult.rows[0];

    if (invitedUser.family_id) {
      return res.status(400).json({ error: 'User already belongs to a family' });
    }

    // Add user to family
    await pool.query(
      'UPDATE users SET family_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [req.user!.family_id, invitedUser.id]
    );

    res.json({ success: true, message: 'User added to family' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
});

// Leave family
router.post('/leave', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user!.family_id) {
      return res.status(400).json({ error: 'User does not belong to a family' });
    }

    await pool.query(
      'UPDATE users SET family_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [req.user!.id]
    );

    res.json({ success: true, message: 'Left family successfully' });
  } catch (error) {
    console.error('Leave family error:', error);
    res.status(500).json({ error: 'Failed to leave family' });
  }
});

export default router;
