const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'ramguard_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
});

// Helper to query with automatic logging
const query = (text, params) => pool.query(text, params);

// Connection verification with retry loop on startup
async function waitForDatabase(retries = 10, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const res = await pool.query('SELECT NOW() as current_time');
      console.log(`[DB] Connected to PostgreSQL successfully at ${res.rows[0].current_time}`);
      return true;
    } catch (err) {
      console.warn(`[DB] Waiting for database (attempt ${i}/${retries})... ${err.message}`);
      if (i === retries) {
        throw new Error(`Failed to connect to database after ${retries} attempts: ${err.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

module.exports = {
  pool,
  query,
  waitForDatabase,
};
