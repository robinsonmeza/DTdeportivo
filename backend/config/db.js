const { Pool } = require('pg');
const { newDb } = require('pg-mem');
const crypto = require('crypto');
require('dotenv').config();

let pool = null;
let isMock = false;
let memPool = null;

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

function getInMemoryDb() {
  if (memPool) return memPool;

  console.log('ℹ️  Iniciando base de datos PostgreSQL en memoria (pg-mem)...');
  const mem = newDb();

  // Registrar funciones o extensiones
  mem.public.registerFunction({
    name: 'current_date',
    implementation: () => new Date().toISOString().split('T')[0],
  });

  const schemaSql = `
    CREATE TABLE IF NOT EXISTS equipos (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      categoria TEXT,
      descripcion TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS disciplinas (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS jugadores (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      edad INT,
      posicion TEXT,
      peso FLOAT,
      altura FLOAT,
      foto_url TEXT,
      equipo_id INT,
      disciplina_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      rol TEXT NOT NULL,
      jugador_id INT,
      activo BOOLEAN DEFAULT TRUE,
      primer_login BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS entrenamientos (
      id SERIAL PRIMARY KEY,
      fecha DATE NOT NULL,
      tipo TEXT NOT NULL,
      descripcion TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS asistencia_entrenamiento (
      id SERIAL PRIMARY KEY,
      jugador_id INT NOT NULL,
      entrenamiento_id INT NOT NULL,
      asistencia BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS lesiones (
      id SERIAL PRIMARY KEY,
      jugador_id INT NOT NULL,
      tipo TEXT,
      descripcion TEXT,
      fecha_inicio DATE,
      fecha_fin DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS evaluaciones (
      id SERIAL PRIMARY KEY,
      jugador_id INT NOT NULL,
      tipo TEXT NOT NULL,
      velocidad FLOAT,
      resistencia FLOAT,
      fuerza FLOAT,
      fecha DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS partidos (
      id SERIAL PRIMARY KEY,
      fecha DATE NOT NULL,
      rival TEXT NOT NULL,
      tipo TEXT NOT NULL,
      resultado TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS estadisticas_jugador (
      id SERIAL PRIMARY KEY,
      jugador_id INT NOT NULL,
      partido_id INT,
      goles INT DEFAULT 0,
      asistencias INT DEFAULT 0,
      minutos_jugados INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS antropometria (
      id SERIAL PRIMARY KEY,
      jugador_id INT NOT NULL,
      fecha DATE NOT NULL,
      peso FLOAT,
      estatura FLOAT,
      imc FLOAT,
      pliegue_biceps FLOAT,
      pliegue_triceps FLOAT,
      pliegue_subescapular FLOAT,
      pliegue_suprailiaco FLOAT,
      pliegue_supraespinal FLOAT,
      pliegue_abdominal FLOAT,
      pliegue_muslo_anterior FLOAT,
      pliegue_pierna_medial FLOAT,
      perimetro_brazo_relajado FLOAT,
      perimetro_brazo_contraido FLOAT,
      perimetro_muslo_medio FLOAT,
      perimetro_pierna FLOAT,
      diametro_humero FLOAT,
      diametro_muneca FLOAT,
      diametro_femur FLOAT,
      porcentaje_grasa FLOAT,
      masa_muscular_esqueletica FLOAT,
      masa_mineral_osea FLOAT,
      sumatoria_pliegues FLOAT,
      posicion_rugby TEXT,
      categoria TEXT,
      grupo TEXT,
      endomorfia FLOAT,
      mesomorfia FLOAT,
      ectomorfia FLOAT,
      x_somatocarta FLOAT,
      y_somatocarta FLOAT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS evaluaciones_rugby (
      id SERIAL PRIMARY KEY,
      jugador_id INT NOT NULL,
      fecha DATE NOT NULL,
      sprint_30m FLOAT,
      salto_vertical FLOAT,
      resistencia_yoyo INT,
      peso FLOAT,
      estatura FLOAT,
      porcentaje_grasa FLOAT,
      masa_muscular FLOAT,
      imc FLOAT,
      score_velocidad INT,
      score_potencia INT,
      score_resistencia INT,
      score_grasa INT,
      score_musculo INT,
      score_general INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  mem.public.none(schemaSql);

  // Semilla de datos iniciales
  mem.public.none(`
    INSERT INTO equipos (nombre, categoria) VALUES
      ('Los Cóndores', 'Primera División'),
      ('Club Rugby Norte', 'Segunda División');

    INSERT INTO disciplinas (nombre) VALUES
      ('Fútbol'), ('Rugby'), ('Atletismo'), ('Natación'), ('Baloncesto');

    INSERT INTO jugadores (nombre, edad, posicion, peso, altura, equipo_id) VALUES
      ('Carlos Méndez', 22, 'Delantero', 72.5, 1.78, 1),
      ('Luis García', 25, 'Mediocampo', 68.0, 1.75, 1),
      ('Pedro Ramírez', 19, 'Defensa', 80.0, 1.82, 1),
      ('Andrés Torres', 28, 'Portero', 85.0, 1.88, 1),
      ('Miguel Flores', 21, 'Delantero', 70.0, 1.76, 1);

    INSERT INTO entrenamientos (fecha, tipo, descripcion) VALUES
      ('2026-03-25', 'Resistencia', 'Carrera continua 45 min + circuito'),
      ('2026-03-27', 'Fuerza', 'Pesas y ejercicios funcionales'),
      ('2026-03-29', 'Táctica', 'Prácticas de posicionamiento y pressing');

    INSERT INTO partidos (fecha, rival, tipo, resultado) VALUES
      ('2026-03-15', 'Club Atlético Norte', 'liga', '2-1'),
      ('2026-03-22', 'Deportivo Sur', 'liga', '0-0'),
      ('2026-04-05', 'FC Estrella', 'amistoso', NULL);
  `);

  const seedUsers = [
    { nombre: 'Administrador', email: 'admin@dtdeportivo.com', password: 'Admin123!', rol: 'administrador' },
    { nombre: 'Entrenador', email: 'entrenador@dtdeportivo.com', password: 'Coach123!', rol: 'entrenador' },
    { nombre: 'Personal Salud', email: 'salud@dtdeportivo.com', password: 'Salud123!', rol: 'personal_salud' },
    { nombre: 'Jugador Demo', email: 'jugador@dtdeportivo.com', password: 'Jugador123!', rol: 'jugador', jugador_id: 1 },
  ];

  for (const u of seedUsers) {
    const salt = generateSalt();
    const hash = hashPassword(u.password, salt);
    mem.public.none(
      `INSERT INTO usuarios (nombre, email, password_hash, salt, rol, primer_login, jugador_id)
       VALUES ('${u.nombre}', '${u.email}', '${hash}', '${salt}', '${u.rol}', false, ${u.jugador_id || 'NULL'});`
    );
  }

  const { Pool: MemPool } = mem.adapters.createPg();
  memPool = new MemPool();

  console.log('✅  Base de datos en memoria inicializada con éxito');
  return memPool;
}

const rawDbUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.trim() : '';
const isValidUrl = rawDbUrl && (rawDbUrl.startsWith('postgres://') || rawDbUrl.startsWith('postgresql://')) && !rawDbUrl.includes('host:') && !rawDbUrl.includes('placeholder');

if (isValidUrl) {
  try {
    pool = new Pool({
      connectionString: rawDbUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 2000,
    });
  } catch {
    isMock = true;
  }
} else {
  isMock = true;
}

const dbWrapper = {
  query: async (text, params) => {
    if (isMock || !pool) {
      return getInMemoryDb().query(text, params);
    }
    try {
      return await pool.query(text, params);
    } catch (err) {
      if (err.code === 'EAI_AGAIN' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
        console.warn('⚠️  Error de conexión a PostgreSQL remoto, cambiando a base de datos en memoria:', err.message);
        isMock = true;
        return getInMemoryDb().query(text, params);
      }
      throw err;
    }
  },
  connect: async () => {
    if (isMock || !pool) {
      return getInMemoryDb().connect();
    }
    try {
      return await pool.connect();
    } catch (err) {
      console.warn('⚠️  Error al conectar con PostgreSQL remoto, usando en memoria:', err.message);
      isMock = true;
      return getInMemoryDb().connect();
    }
  },
};

module.exports = dbWrapper;
