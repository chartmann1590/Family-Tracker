import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import { pool, initDatabase } from './config/database';
import { initWebSocket } from './websocket';
import authRoutes from './routes/auth';
import locationRoutes from './routes/locations';
import familyRoutes from './routes/families';
import owntracksRoutes from './routes/owntracks';
import adminRoutes from './routes/admin';
import messageRoutes from './routes/messages';
import geofenceRoutes from './routes/geofences';
import emailService from './services/emailService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow WebSocket connections
}));

app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
}));

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/owntracks', owntracksRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/geofences', geofenceRoutes);

// APK Download Route
app.get('/api/download/apk', (req, res) => {
  const apkPath = path.join(__dirname, '../downloads/family-tracker.apk');
  
  if (fs.existsSync(apkPath)) {
    const stat = fs.statSync(apkPath);
    
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename=family-tracker.apk',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    
    const readStream = fs.createReadStream(apkPath);
    readStream.pipe(res);
  } else {
    console.error(`APK not found at path: ${apkPath}`);
    res.status(404).json({ error: 'APK file not found' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket
initWebSocket(server);

// Create admin user if it doesn't exist
async function createAdminUser() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@familytracker.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Administrator';

    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingAdmin.rows.length === 0) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        `INSERT INTO users (email, password_hash, name, is_admin)
         VALUES ($1, $2, $3, TRUE)`,
        [adminEmail, passwordHash, adminName]
      );
      console.log(`✅ Admin user created: ${adminEmail}`);
      console.log(`⚠️  Default password: ${adminPassword}`);
      console.log('⚠️  PLEASE CHANGE THE DEFAULT PASSWORD!');
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
  }
}

// Start server
async function start() {
  try {
    // Initialize database
    await initDatabase();

    // Create admin user
    await createAdminUser();

    // Load SMTP settings if configured
    await emailService.loadSettings();

    // Start listening
    server.listen(PORT, () => {
      console.log('');
      console.log('🚀 Family Tracker Backend');
      console.log('==========================');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌐 API: http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
      console.log(`📍 OwnTracks: http://localhost:${PORT}/api/owntracks`);
      console.log(`🛡️  Geofencing: Enabled with email notifications`);
      console.log('==========================');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    pool.end();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    pool.end();
    process.exit(0);
  });
});

start();
