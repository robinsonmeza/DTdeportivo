const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.connect()
  .then(client => {
    console.log('✅  Conectado a PostgreSQL (Neon)');
    client.release();
  })
  .catch(err => {
    console.error('❌  Error al conectar con PostgreSQL:', err.message);
  });

module.exports = pool;
