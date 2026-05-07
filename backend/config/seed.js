// Ejecutar después de correr database.sql:  node config/seed.js
const crypto = require('crypto');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

const seedUsers = [
  { nombre: 'Administrador',  email: 'admin@dtdeportivo.com',      password: 'Admin123!',   rol: 'administrador'  },
  { nombre: 'Entrenador',     email: 'entrenador@dtdeportivo.com', password: 'Coach123!',   rol: 'entrenador'     },
  { nombre: 'Personal Salud', email: 'salud@dtdeportivo.com',      password: 'Salud123!',   rol: 'personal_salud' },
  { nombre: 'Jugador Demo',   email: 'jugador@dtdeportivo.com',    password: 'Jugador123!', rol: 'jugador'        },
];

async function run() {
  const client = await pool.connect();
  try {
    for (const u of seedUsers) {
      const salt = generateSalt();
      const hash = hashPassword(u.password, salt);
      await client.query(
        `INSERT INTO usuarios (nombre, email, password_hash, salt, rol, primer_login)
         VALUES ($1, $2, $3, $4, $5, false)
         ON CONFLICT (email) DO UPDATE
           SET password_hash = $3, salt = $4, primer_login = false`,
        [u.nombre, u.email, hash, salt, u.rol]
      );
      console.log(`✅  ${u.rol}: ${u.email} → ${u.password}`);
    }
    console.log('\n🎉  Seed completado');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
