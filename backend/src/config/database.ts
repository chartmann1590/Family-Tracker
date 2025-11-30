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
