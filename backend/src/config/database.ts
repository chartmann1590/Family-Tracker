import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'family_tracker',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err: Error) => {
  console.error('Unexpected database error:', err);
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        family_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Families table
    await client.query(`
      CREATE TABLE IF NOT EXISTS families (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Locations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        accuracy DOUBLE PRECISION,
        altitude DOUBLE PRECISION,
        battery INTEGER,
        timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for faster location queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_locations_user_timestamp
      ON locations(user_id, timestamp DESC)
    `);

    // Create index for family lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_family
      ON users(family_id)
    `);

    // Add foreign key for family_id in users table
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_family_id_fkey'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_family_id_fkey
          FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for faster message queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_family_created
      ON messages(family_id, created_at DESC)
    `);

    // SMTP Settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS smtp_settings (
        id SERIAL PRIMARY KEY,
        smtp_host VARCHAR(255) NOT NULL,
        smtp_port INTEGER NOT NULL,
        smtp_secure BOOLEAN DEFAULT TRUE,
        smtp_user VARCHAR(255) NOT NULL,
        smtp_password VARCHAR(255) NOT NULL,
        from_email VARCHAR(255) NOT NULL,
        from_name VARCHAR(255) DEFAULT 'Family Tracker',
        admin_email VARCHAR(255) NOT NULL,
        notification_emails TEXT[], -- Array of additional emails to notify
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add notification settings columns if they don't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name='smtp_settings' AND column_name='notify_low_battery') THEN
          ALTER TABLE smtp_settings ADD COLUMN notify_low_battery BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name='smtp_settings' AND column_name='low_battery_threshold') THEN
          ALTER TABLE smtp_settings ADD COLUMN low_battery_threshold INTEGER DEFAULT 20;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name='smtp_settings' AND column_name='notify_device_offline') THEN
          ALTER TABLE smtp_settings ADD COLUMN notify_device_offline BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name='smtp_settings' AND column_name='device_offline_minutes') THEN
          ALTER TABLE smtp_settings ADD COLUMN device_offline_minutes INTEGER DEFAULT 30;
        END IF;
      END $$;
    `);

    // Geofences table
    await client.query(`
      CREATE TABLE IF NOT EXISTS geofences (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        radius INTEGER NOT NULL, -- radius in meters
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- specific user or NULL for all family
        is_active BOOLEAN DEFAULT TRUE,
        notify_on_exit BOOLEAN DEFAULT TRUE,
        notify_on_enter BOOLEAN DEFAULT FALSE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Geofence violations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS geofence_violations (
        id SERIAL PRIMARY KEY,
        geofence_id INTEGER NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        violation_type VARCHAR(50) NOT NULL, -- 'exit' or 'enter'
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        notified BOOLEAN DEFAULT FALSE,
        notification_sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for geofence queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_geofences_family
      ON geofences(family_id, is_active)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_geofence_violations_geofence
      ON geofence_violations(geofence_id, created_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_geofence_violations_user
      ON geofence_violations(user_id, created_at DESC)
    `);

    // Device status notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS device_status_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_type VARCHAR(50) NOT NULL, -- 'low_battery' or 'device_offline'
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        battery_level INTEGER,
        minutes_offline INTEGER
      )
    `);

    // Create index for device status notifications
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_device_status_notifications_user
      ON device_status_notifications(user_id, notification_type, sent_at DESC)
    `);

    await client.query('COMMIT');
    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}
