const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_ADMIN_USER,
  password: process.env.SQL_ADMIN_PASSWORD,
  database: process.env.SQL_DB_NAME,
});

const crypto = require('crypto');
function generateSalt() { return crypto.randomBytes(16).toString('hex'); }
function hashPassword(password, salt) { return crypto.createHmac('sha256', salt).update(password).digest('hex'); }

async function seed() {
  console.log('Seeding cloud SQL...');
  const sports = ['Rugby', 'Fútbol', 'Fútbol Sala', 'Baloncesto', 'Atletismo', 'Voleibol', 'Natación', 'Tenis', 'Hockey'];
  for (const s of sports) {
    const { rows } = await pool.query('SELECT id FROM disciplinas WHERE nombre = $1', [s]);
    if (rows.length === 0) {
      await pool.query('INSERT INTO disciplinas (nombre) VALUES ($1)', [s]);
    }
  }

  const { rows: jug } = await pool.query('SELECT id FROM jugadores LIMIT 1');
  if (jug.length === 0) {
    await pool.query(`
      INSERT INTO jugadores (nombre, edad, posicion, peso, altura, equipo_id, disciplina_id) VALUES
        ('Carlos Méndez', 22, 'Penetrador', 78.5, 1.80, 1, 1),
        ('Luis García', 25, 'Enlace', 74.0, 1.75, 1, 1),
        ('Pedro Ramírez', 21, 'Wing', 82.0, 1.85, 1, 1),
        ('Andrés Torres', 28, 'Trasportador', 88.0, 1.88, 1, 1),
        ('Miguel Flores', 23, 'Forward', 85.0, 1.82, 1, 1)
    `);
  }

  const salt = generateSalt();
  const seedUsers = [
    { nombre: 'Administrador', email: 'admin@dtdeportivo.com', password: 'Admin123!', rol: 'administrador' },
    { nombre: 'Entrenador', email: 'entrenador@dtdeportivo.com', password: 'Coach123!', rol: 'entrenador' },
    { nombre: 'Personal Salud', email: 'salud@dtdeportivo.com', password: 'Salud123!', rol: 'personal_salud' },
    { nombre: 'Jugador Demo', email: 'jugador@dtdeportivo.com', password: 'Jugador123!', rol: 'jugador', jugador_id: 1 },
  ];

  for (const u of seedUsers) {
    const { rows } = await pool.query('SELECT id FROM usuarios WHERE email = $1', [u.email]);
    if (rows.length === 0) {
      const uSalt = generateSalt();
      const uHash = hashPassword(u.password, uSalt);
      await pool.query(
        'INSERT INTO usuarios (nombre, email, password_hash, salt, rol, primer_login, jugador_id) VALUES ($1, $2, $3, $4, $5, false, $6)',
        [u.nombre, u.email, uHash, uSalt, u.rol, u.jugador_id || null]
      );
    }
  }

  const { rows: antro } = await pool.query('SELECT id FROM antropometria LIMIT 1');
  if (antro.length === 0) {
    await pool.query(`
      INSERT INTO antropometria (
        jugador_id, fecha, peso, estatura, imc,
        pliegue_biceps, pliegue_triceps, pliegue_subescapular, pliegue_suprailiaco, pliegue_supraespinal, pliegue_abdominal, pliegue_muslo_anterior, pliegue_pierna_medial,
        perimetro_brazo_relajado, perimetro_brazo_contraido, perimetro_muslo_medio, perimetro_pierna,
        diametro_humero, diametro_muneca, diametro_femur,
        porcentaje_grasa, masa_muscular_esqueletica, masa_mineral_osea, sumatoria_pliegues,
        posicion_rugby, categoria, grupo,
        endomorfia, mesomorfia, ectomorfia, x_somatocarta, y_somatocarta
      ) VALUES
      (1, '2026-01-15', 80.0, 1.80, 24.69, 4.5, 8.0, 9.5, 11.0, 7.5, 12.0, 10.5, 7.0, 32.5, 35.0, 56.0, 37.5, 6.8, 5.5, 9.6, 12.8, 38.5, 11.5, 69.5, 'Penetrador', 'Primera', 'Delanteros', 2.8, 5.2, 2.1, -0.7, 5.5),
      (1, '2026-02-15', 79.0, 1.80, 24.38, 4.0, 7.5, 9.0, 10.0, 7.0, 11.0, 9.5, 6.5, 33.0, 35.5, 56.5, 37.8, 6.8, 5.5, 9.6, 11.9, 39.2, 11.6, 64.5, 'Penetrador', 'Primera', 'Delanteros', 2.5, 5.4, 2.3, -0.2, 6.0),
      (1, '2026-03-15', 78.5, 1.80, 24.23, 3.8, 7.0, 8.5, 9.5, 6.8, 10.0, 9.0, 6.0, 33.5, 36.0, 57.0, 38.0, 6.8, 5.5, 9.6, 11.2, 40.1, 11.7, 60.6, 'Penetrador', 'Primera', 'Delanteros', 2.3, 5.6, 2.4, 0.1, 6.5)
    `);
  }

  await pool.query('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ai_studio_app_user');
  await pool.query('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ai_studio_app_user');

  console.log('✅ Base de datos Cloud SQL lista');
  await pool.end();
}

seed().catch(err => {
  console.error('Error en seed:', err);
  process.exit(1);
});
