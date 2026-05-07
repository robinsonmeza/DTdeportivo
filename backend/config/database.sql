-- ============================================================
-- SCHEMA PostgreSQL - Sistema de Gestión Deportiva
-- Compatible con Neon (serverless PostgreSQL)
-- ============================================================

-- -------------------------------------------------------
-- 1. EQUIPOS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipos (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  categoria   VARCHAR(50),
  descripcion TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 2. DISCIPLINAS DEPORTIVAS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS disciplinas (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 3. JUGADORES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS jugadores (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  edad           INT,
  posicion       VARCHAR(50),
  peso           DECIMAL(5,2),
  altura         DECIMAL(4,2),
  foto_url       VARCHAR(255),
  equipo_id      INT REFERENCES equipos(id) ON DELETE SET NULL,
  disciplina_id  INT REFERENCES disciplinas(id) ON DELETE SET NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 4. USUARIOS (auth)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  salt           VARCHAR(64) NOT NULL,
  rol            VARCHAR(20) NOT NULL CHECK (rol IN ('administrador','entrenador','personal_salud','jugador')),
  jugador_id     INT REFERENCES jugadores(id) ON DELETE SET NULL,
  activo         BOOLEAN DEFAULT TRUE,
  primer_login   BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 5. ENTRENAMIENTOS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS entrenamientos (
  id           SERIAL PRIMARY KEY,
  fecha        DATE NOT NULL,
  tipo         VARCHAR(80) NOT NULL,
  descripcion  TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 6. ASISTENCIA A ENTRENAMIENTOS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS asistencia_entrenamiento (
  id                SERIAL PRIMARY KEY,
  jugador_id        INT NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  entrenamiento_id  INT NOT NULL REFERENCES entrenamientos(id) ON DELETE CASCADE,
  asistencia        BOOLEAN DEFAULT FALSE
);

-- -------------------------------------------------------
-- 7. LESIONES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesiones (
  id           SERIAL PRIMARY KEY,
  jugador_id   INT NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  tipo         VARCHAR(100),
  descripcion  TEXT,
  fecha_inicio DATE,
  fecha_fin    DATE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 8. EVALUACIONES FÍSICAS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluaciones (
  id           SERIAL PRIMARY KEY,
  jugador_id   INT NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  tipo         VARCHAR(10) NOT NULL CHECK (tipo IN ('inicial','final')),
  velocidad    DECIMAL(5,2),
  resistencia  DECIMAL(5,2),
  fuerza       DECIMAL(5,2),
  fecha        DATE NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 9. PARTIDOS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS partidos (
  id         SERIAL PRIMARY KEY,
  fecha      DATE NOT NULL,
  rival      VARCHAR(100) NOT NULL,
  tipo       VARCHAR(10) NOT NULL CHECK (tipo IN ('liga','amistoso')),
  resultado  VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 10. ESTADÍSTICAS POR JUGADOR
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS estadisticas_jugador (
  id               SERIAL PRIMARY KEY,
  jugador_id       INT NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  partido_id       INT REFERENCES partidos(id) ON DELETE SET NULL,
  goles            INT DEFAULT 0,
  asistencias      INT DEFAULT 0,
  minutos_jugados  INT DEFAULT 0,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 11. ANTROPOMETRÍA
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS antropometria (
  id                        SERIAL PRIMARY KEY,
  jugador_id                INT NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  fecha                     DATE NOT NULL,
  peso                      DECIMAL(5,2),
  estatura                  DECIMAL(4,2),
  imc                       DECIMAL(4,2),
  pliegue_biceps            DECIMAL(4,1),
  pliegue_triceps           DECIMAL(4,1),
  pliegue_subescapular      DECIMAL(4,1),
  pliegue_suprailiaco       DECIMAL(4,1),
  pliegue_supraespinal      DECIMAL(4,1),
  pliegue_abdominal         DECIMAL(4,1),
  pliegue_muslo_anterior    DECIMAL(4,1),
  pliegue_pierna_medial     DECIMAL(4,1),
  perimetro_brazo_relajado  DECIMAL(4,1),
  perimetro_brazo_contraido DECIMAL(4,1),
  perimetro_muslo_medio     DECIMAL(4,1),
  perimetro_pierna          DECIMAL(4,1),
  diametro_humero           DECIMAL(4,1),
  diametro_muneca           DECIMAL(4,1),
  diametro_femur            DECIMAL(4,1),
  porcentaje_grasa          DECIMAL(4,2),
  masa_muscular_esqueletica DECIMAL(5,2),
  masa_mineral_osea         DECIMAL(5,2),
  sumatoria_pliegues        DECIMAL(5,1),
  posicion_rugby            VARCHAR(50),
  categoria                 VARCHAR(50),
  grupo                     VARCHAR(50),
  endomorfia                DECIMAL(4,2),
  mesomorfia                DECIMAL(4,2),
  ectomorfia                DECIMAL(4,2),
  x_somatocarta             DECIMAL(5,2),
  y_somatocarta             DECIMAL(5,2),
  created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- 12. EVALUACIONES RUGBY
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluaciones_rugby (
  id                 SERIAL PRIMARY KEY,
  jugador_id         INT NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  fecha              DATE NOT NULL,
  sprint_30m         DECIMAL(5,2),
  salto_vertical     DECIMAL(5,2),
  resistencia_yoyo   INT,
  peso               DECIMAL(5,2),
  estatura           DECIMAL(4,2),
  porcentaje_grasa   DECIMAL(4,2),
  masa_muscular      DECIMAL(5,2),
  imc                DECIMAL(4,2),
  score_velocidad    INT,
  score_potencia     INT,
  score_resistencia  INT,
  score_grasa        INT,
  score_musculo      INT,
  score_general      INT,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------
-- DATOS SEMILLA
-- -------------------------------------------------------
INSERT INTO equipos (nombre, categoria) VALUES
  ('Los Cóndores', 'Primera División'),
  ('Club Rugby Norte', 'Segunda División')
ON CONFLICT DO NOTHING;

INSERT INTO disciplinas (nombre) VALUES
  ('Fútbol'), ('Rugby'), ('Atletismo'), ('Natación'), ('Baloncesto')
ON CONFLICT DO NOTHING;

INSERT INTO jugadores (nombre, edad, posicion, peso, altura, equipo_id) VALUES
  ('Carlos Méndez',   22, 'Delantero',  72.5, 1.78, 1),
  ('Luis García',     25, 'Mediocampo', 68.0, 1.75, 1),
  ('Pedro Ramírez',   19, 'Defensa',    80.0, 1.82, 1),
  ('Andrés Torres',   28, 'Portero',    85.0, 1.88, 1),
  ('Miguel Flores',   21, 'Delantero',  70.0, 1.76, 1);

-- Contraseñas: Admin123! / Coach123! / Salud123! / Jugador123!
-- Hash generado con SHA-256 + salt (ver auth.controller.js)
INSERT INTO usuarios (nombre, email, password_hash, salt, rol, primer_login) VALUES
  ('Administrador',   'admin@dtdeportivo.com',      'HASH_PLACEHOLDER', 'SALT_PLACEHOLDER', 'administrador',  false),
  ('Entrenador',      'entrenador@dtdeportivo.com', 'HASH_PLACEHOLDER', 'SALT_PLACEHOLDER', 'entrenador',     false),
  ('Personal Salud',  'salud@dtdeportivo.com',      'HASH_PLACEHOLDER', 'SALT_PLACEHOLDER', 'personal_salud', false),
  ('Jugador Demo',    'jugador@dtdeportivo.com',    'HASH_PLACEHOLDER', 'SALT_PLACEHOLDER', 'jugador',        false)
ON CONFLICT DO NOTHING;

INSERT INTO entrenamientos (fecha, tipo, descripcion) VALUES
  ('2026-03-25', 'Resistencia', 'Carrera continua 45 min + circuito'),
  ('2026-03-27', 'Fuerza',      'Pesas y ejercicios funcionales'),
  ('2026-03-29', 'Táctica',     'Prácticas de posicionamiento y pressing');

INSERT INTO partidos (fecha, rival, tipo, resultado) VALUES
  ('2026-03-15', 'Club Atlético Norte', 'liga',     '2-1'),
  ('2026-03-22', 'Deportivo Sur',       'liga',     '0-0'),
  ('2026-04-05', 'FC Estrella',         'amistoso', NULL);
