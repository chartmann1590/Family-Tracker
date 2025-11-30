import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, User } from '../types';
import { pool } from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface JWTPayload {
  userId: number;
  email: string;
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;

    const result = await pool.query(
      'SELECT id, email, name, is_admin, family_id, created_at, updated_at FROM users WHERE id = $1',
      [payload.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0] as User;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

export function generateToken(user: User): string {
  return jwt.sign(
    { userId: user.id, email: user.email } as JWTPayload,
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}
