import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { pool } from './config/database';
import { User } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface AuthenticatedWebSocket extends WebSocket {
  user?: User;
  isAlive?: boolean;
}

let wss: WebSocketServer;
const familyConnections = new Map<number, Set<AuthenticatedWebSocket>>();

export function initWebSocket(server: any) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
    console.log('New WebSocket connection attempt');

    // Extract token from query parameter
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }

    try {
      // Verify token
      const payload = jwt.verify(token, JWT_SECRET) as any;

      // Get user from database
      const result = await pool.query(
        'SELECT id, email, name, is_admin, family_id, created_at, updated_at FROM users WHERE id = $1',
        [payload.userId]
      );

      if (result.rows.length === 0) {
        ws.close(1008, 'User not found');
        return;
      }

      ws.user = result.rows[0] as User;
      ws.isAlive = true;

      // Add to family connections
      if (ws.user.family_id) {
        if (!familyConnections.has(ws.user.family_id)) {
          familyConnections.set(ws.user.family_id, new Set());
        }
        familyConnections.get(ws.user.family_id)!.add(ws);
      }

      console.log(`WebSocket authenticated: ${ws.user.email}`);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to Family Tracker',
        familyId: ws.user.family_id,
      }));

      // Handle pong messages
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle messages
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('WebSocket message:', data);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        if (ws.user?.family_id) {
          const connections = familyConnections.get(ws.user.family_id);
          if (connections) {
            connections.delete(ws);
            if (connections.size === 0) {
              familyConnections.delete(ws.user.family_id);
            }
          }
        }
        console.log(`WebSocket disconnected: ${ws.user?.email}`);
      });
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      ws.close(1008, 'Invalid token');
    }
  });

  // Heartbeat to detect broken connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      const authWs = ws as AuthenticatedWebSocket;
      if (authWs.isAlive === false) {
        return authWs.terminate();
      }
      authWs.isAlive = false;
      authWs.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  console.log('✅ WebSocket server initialized');
}

export function broadcastLocationUpdate(familyId: number, data: any) {
  const connections = familyConnections.get(familyId);
  if (!connections) return;

  const message = JSON.stringify({
    type: 'location_update',
    data,
  });

  connections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

export function broadcastToUser(userId: number, data: any) {
  wss.clients.forEach((ws) => {
    const authWs = ws as AuthenticatedWebSocket;
    if (authWs.user?.id === userId && authWs.readyState === WebSocket.OPEN) {
      authWs.send(JSON.stringify(data));
    }
  });
}
