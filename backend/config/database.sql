-- ============================================================
-- SCRIPT SQL COMPLETO - Sistema de Gestión Deportiva
-- Base de datos: deportivo_db
-- ============================================================

CREATE DATABASE IF NOT EXISTS deportivo_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE deportivo_db;

-- -------------------------------------------------------
-- 1. JUGADORES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS jugadores (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  edad        INT,
  posicion    VARCHAR(50),
  peso        DECIMAL(5,2),
  altura      DECIMAL(4,2),
  foto_url    VARCHAR(255),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 2. ENTRENAMIENTOS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS entrenamientos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  fecha        DATE NOT NULL,
  tipo         VARCHAR(80) NOT NULL,
  descripcion  TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 3. ASISTENCIA A ENTRENAMIENTOS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS asistencia_entrenamiento (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  jugador_id        INT NOT NULL,
  entrenamiento_id  INT NOT NULL,
  asistencia        TINYINT(1) DEFAULT 0,
  FOREIGN KEY (jugador_id)       REFERENCES jugadores(id)      ON DELETE CASCADE,
  FOREIGN KEY (entrenamiento_id) REFERENCES entrenamientos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 4. LESIONES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesiones (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  jugador_id   INT NOT NULL,
  tipo         VARCHAR(100),
  descripcion  TEXT,
  fecha_inicio DATE,
  fecha_fin    DATE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 5. EVALUACIONES FÍSICAS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluaciones (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  jugador_id   INT NOT NULL,
  tipo         ENUM('inicial','final') NOT NULL,
  velocidad    DECIMAL(5,2),
  resistencia  DECIMAL(5,2),
  fuerza       DECIMAL(5,2),
  fecha        DATE NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 6. PARTIDOS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS partidos (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  fecha      DATE NOT NULL,
  rival      VARCHAR(100) NOT NULL,
  tipo       ENUM('liga','amistoso') NOT NULL,
  resultado  VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 7. ESTADÍSTICAS POR JUGADOR (vinculadas a partido)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS estadisticas_jugador (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  jugador_id       INT NOT NULL,
  partido_id       INT,
  goles            INT DEFAULT 0,
  asistencias      INT DEFAULT 0,
  minutos_jugados  INT DEFAULT 0,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE,
  FOREIGN KEY (partido_id) REFERENCES partidos(id)  ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- DATOS DE EJEMPLO (seed)
-- -------------------------------------------------------
INSERT INTO jugadores (nombre, edad, posicion, peso, altura) VALUES
  ('Carlos Méndez',   22, 'Delantero',  72.5, 1.78),
  ('Luis García',     25, 'Mediocampo', 68.0, 1.75),
  ('Pedro Ramírez',   19, 'Defensa',    80.0, 1.82),
  ('Andrés Torres',   28, 'Portero',    85.0, 1.88),
  ('Miguel Flores',   21, 'Delantero',  70.0, 1.76);

INSERT INTO entrenamientos (fecha, tipo, descripcion) VALUES
  ('2026-03-25', 'Resistencia',   'Carrera continua 45 min + circuito'),
  ('2026-03-27', 'Fuerza',        'Pesas y ejercicios funcionales'),
  ('2026-03-29', 'Táctica',       'Prácticas de posicionamiento y pressing');

INSERT INTO asistencia_entrenamiento (jugador_id, entrenamiento_id, asistencia) VALUES
  (1,1,1),(2,1,1),(3,1,0),(4,1,1),(5,1,1),
  (1,2,1),(2,2,0),(3,2,1),(4,2,1),(5,2,1),
  (1,3,1),(2,3,1),(3,3,1),(4,3,1),(5,3,0);

INSERT INTO lesiones (jugador_id, tipo, descripcion, fecha_inicio, fecha_fin) VALUES
  (3, 'Muscular', 'Desgarro en isquiotibial derecho', '2026-03-10', NULL),
  (5, 'Contusión','Golpe en tobillo izquierdo',       '2026-03-20', '2026-03-28');

INSERT INTO evaluaciones (jugador_id, tipo, velocidad, resistencia, fuerza, fecha) VALUES
  (1,'inicial',8.2,7.5,8.0,'2026-01-10'),
  (2,'inicial',7.8,8.0,7.0,'2026-01-10'),
  (3,'inicial',6.5,7.0,9.0,'2026-01-10'),
  (1,'final',  8.8,8.2,8.5,'2026-03-28'),
  (2,'final',  8.1,8.5,7.8,'2026-03-28');

INSERT INTO partidos (fecha, rival, tipo, resultado) VALUES
  ('2026-03-15', 'Club Atlético Norte', 'liga',      '2-1'),
  ('2026-03-22', 'Deportivo Sur',       'liga',      '0-0'),
  ('2026-04-05', 'FC Estrella',         'amistoso',  NULL);

INSERT INTO estadisticas_jugador (jugador_id, partido_id, goles, asistencias, minutos_jugados) VALUES
  (1,1,2,0,90),(2,1,0,2,90),(3,1,0,0,90),(4,1,0,0,90),(5,1,0,0,80),
  (1,2,0,0,90),(2,2,0,1,90),(3,2,0,0,90),(4,2,0,0,90),(5,2,0,0,90);

-- -------------------------------------------------------
-- 8. ANTROPOMETRÍA (somatotipo Heath-Carter)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS antropometria (
  id                        INT AUTO_INCREMENT PRIMARY KEY,
  jugador_id                INT NOT NULL,
  fecha                     DATE NOT NULL,
  -- Medidas básicas
  peso                      DECIMAL(5,2),
  estatura                  DECIMAL(4,2),
  imc                       DECIMAL(4,2),
  -- Pliegues cutáneos (8)
  pliegue_biceps            DECIMAL(4,1),
  pliegue_triceps           DECIMAL(4,1),
  pliegue_subescapular      DECIMAL(4,1),
  pliegue_suprailiaco       DECIMAL(4,1),
  pliegue_supraespinal      DECIMAL(4,1),
  pliegue_abdominal         DECIMAL(4,1),
  pliegue_muslo_anterior    DECIMAL(4,1),
  pliegue_pierna_medial     DECIMAL(4,1),
  -- Perímetros musculares (4)
  perimetro_brazo_relajado  DECIMAL(4,1),
  perimetro_brazo_contraido DECIMAL(4,1),
  perimetro_muslo_medio     DECIMAL(4,1),
  perimetro_pierna          DECIMAL(4,1),
  -- Diámetros óseos (3)
  diametro_humero           DECIMAL(4,1),
  diametro_muneca           DECIMAL(4,1),
  diametro_femur            DECIMAL(4,1),
  -- Composición corporal
  porcentaje_grasa          DECIMAL(4,2),
  masa_muscular_esqueletica DECIMAL(5,2),
  masa_mineral_osea         DECIMAL(5,2),
  sumatoria_pliegues        DECIMAL(5,1),
  -- Clasificación
  posicion_rugby            VARCHAR(50),
  categoria                 VARCHAR(50),
  grupo                     VARCHAR(50),
  -- Somatotipo
  endomorfia                DECIMAL(4,2),
  mesomorfia                DECIMAL(4,2),
  ectomorfia                DECIMAL(4,2),
  x_somatocarta             DECIMAL(5,2),
  y_somatocarta             DECIMAL(5,2),
  created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------
-- 9. EVALUACIONES DE RENDIMIENTO FÍSICO (Rugby)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluaciones_rugby (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  jugador_id         INT NOT NULL,
  fecha              DATE NOT NULL,
  -- Rendimiento Físico
  sprint_30m         DECIMAL(5,2),
  salto_vertical     DECIMAL(5,2),
  resistencia_yoyo   INT,
  -- Composición Corporal
  peso               DECIMAL(5,2),
  estatura           DECIMAL(4,2),
  porcentaje_grasa   DECIMAL(4,2),
  masa_muscular      DECIMAL(5,2),
  imc                DECIMAL(4,2),
  -- Scores normalizados (0-100)
  score_velocidad    INT,
  score_potencia     INT,
  score_resistencia  INT,
  score_grasa        INT,
  score_musculo      INT,
  score_general      INT,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE
) ENGINE=InnoDB;
