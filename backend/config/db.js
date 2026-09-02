const { Pool } = require('pg');
require('dotenv').config();

// Global pool cache for Node / serverless hot reloads
let pgPool = null;
let firestoreAdapter = null;

function shouldUseFirestore() {
  if (process.env.USE_FIREBASE === 'false') return false;
  return true;
}

function getPgPool() {
  if (pgPool) return pgPool;

  if (process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_DB_NAME) {
    console.log('☁️ Conectando a Cloud SQL PostgreSQL...');
    pgPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 10000,
    });
  } else if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('placeholder')) {
    console.log('🔗 Conectando con DATABASE_URL...');
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
    });
  } else {
    pgPool = new Pool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'dt_deportivo',
      connectionTimeoutMillis: 3000,
    });
  }

  pgPool.on('error', (err) => {
    console.error('⚠️ Error en pool PostgreSQL:', err.message);
  });

  return pgPool;
}

function getFirestoreAdapter() {
  if (!firestoreAdapter) {
    console.log('🔥 Utilizando Firebase Firestore como base de datos activa...');
    firestoreAdapter = require('./firestore_db');
  }
  return firestoreAdapter;
}

const dbWrapper = {
  query: async (text, params) => {
    if (shouldUseFirestore()) {
      return getFirestoreAdapter().query(text, params);
    }
    try {
      const p = getPgPool();
      return await p.query(text, params);
    } catch (err) {
      console.warn('⚠️ Fallo conexión PostgreSQL. Conmutando a Firebase Firestore:', err.message);
      return getFirestoreAdapter().query(text, params);
    }
  },
  connect: async () => {
    if (shouldUseFirestore()) {
      return getFirestoreAdapter().connect();
    }
    try {
      const p = getPgPool();
      return await p.connect();
    } catch (err) {
      console.warn('⚠️ Fallo connect PostgreSQL. Conmutando a Firebase Firestore:', err.message);
      return getFirestoreAdapter().connect();
    }
  },
};

module.exports = dbWrapper;
