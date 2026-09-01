const { Pool } = require('pg');
require('dotenv').config();

// Global pool cache for Node / serverless hot reloads
let pool = null;

function getPool() {
  if (pool) return pool;

  // 1. Prioritize Cloud SQL Object Config if available
  if (process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_DB_NAME) {
    console.log('☁️ Conectando a Cloud SQL PostgreSQL...');
    pool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });
  } else if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('host:') && !process.env.DATABASE_URL.includes('placeholder')) {
    // 2. Fallback to DATABASE_URL if valid
    console.log('🔗 Conectando con DATABASE_URL...');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
    });
  } else {
    // 3. Fallback to local / standard default
    console.log('ℹ️ Conectando con pool por defecto...');
    pool = new Pool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'dt_deportivo',
    });
  }

  pool.on('error', (err) => {
    console.error('⚠️ Error inesperado en el pool PostgreSQL:', err.message);
  });

  return pool;
}

const dbWrapper = {
  query: async (text, params) => {
    const p = getPool();
    return p.query(text, params);
  },
  connect: async () => {
    const p = getPool();
    return p.connect();
  },
};

module.exports = dbWrapper;
