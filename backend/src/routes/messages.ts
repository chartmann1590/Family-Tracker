import { Router, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types';
import { broadcastMessage } from '../websocket';

const router = Router();

const sendMessageSchema = z.object({
  message: z.string().min(1).max(5000),
});

// Send a message to family
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user!.family_id) {
      return res.status(400).json({ error: 'User does not belong to a family' });
    }

    const { message } = sendMessageSchema.parse(req.body);

    const result = await pool.query(
      `INSERT INTO messages (family_id, user_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, family_id, user_id, message, created_at, updated_at`,
      [req.user!.family_id, req.user!.id, message]
    );

    const savedMessage = result.rows[0];

    // Broadcast to WebSocket clients in the same family
    broadcastMessage(req.user!.family_id, {
      id: savedMessage.id,
      familyId: savedMessage.family_id,
      userId: savedMessage.user_id,
      userName: req.user!.name,
      userEmail: req.user!.email,
      message: savedMessage.message,
      createdAt: savedMessage.created_at,
    });

    res.status(201).json({
      message: {
        id: savedMessage.id,
        familyId: savedMessage.family_id,
        userId: savedMessage.user_id,
        userName: req.user!.name,
        userEmail: req.user!.email,
        message: savedMessage.message,
        createdAt: savedMessage.created_at,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get family messages
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user!.family_id) {
      return res.json({ messages: [] });
    }

    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pool.query(
      `SELECT m.id, m.family_id, m.user_id, m.message, m.created_at, m.updated_at,
              u.name as user_name, u.email as user_email
       FROM messages m
       INNER JOIN users u ON m.user_id = u.id
       WHERE m.family_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user!.family_id, limit, offset]
    );

    const messages = result.rows.map((row) => ({
      id: row.id,
      familyId: row.family_id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      message: row.message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    // Get total count for pagination
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM messages WHERE family_id = $1',
      [req.user!.family_id]
    );

    res.json({
      messages,
      pagination: {
        limit,
        offset,
        total: parseInt(countResult.rows[0].total),
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

// Delete a message (only message owner or admin)
router.delete('/:messageId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const messageId = parseInt(req.params.messageId);

    // Get message details
    const messageResult = await pool.query(
      'SELECT user_id, family_id FROM messages WHERE id = $1',
      [messageId]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = messageResult.rows[0];

    // Check if user is the message owner or admin
    if (message.user_id !== req.user!.id && !req.user!.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete message
    await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);

    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
