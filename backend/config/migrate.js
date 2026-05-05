const pool = require('../config/db');

const up = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS antropometria (
        id INT AUTO_INCREMENT PRIMARY KEY,
        jugador_id INT NOT NULL,
        fecha DATE NOT NULL,
        
        -- Medidas básicas
        peso DECIMAL(5,2),
        estatura DECIMAL(4,2),
        imc DECIMAL(4,2),
        
        -- Pliegues cutáneos (8)
        pliegue_biceps DECIMAL(4,1),
        pliegue_triceps DECIMAL(4,1),
        pliegue_subescapular DECIMAL(4,1),
        pliegue_suprailiaco DECIMAL(4,1),
        pliegue_supraespinal DECIMAL(4,1),
        pliegue_abdominal DECIMAL(4,1),
        pliegue_muslo_anterior DECIMAL(4,1),
        pliegue_pierna_medial DECIMAL(4,1),
        
        -- Perímetros musculares (4)
        perimetro_brazo_relajado DECIMAL(4,1),
        perimetro_brazo_contraido DECIMAL(4,1),
        perimetro_muslo_medio DECIMAL(4,1),
        perimetro_pierna DECIMAL(4,1),
        
        -- Diámetros óseos (3)
        diametro_humero DECIMAL(4,1),
        diametro_muneca DECIMAL(4,1),
        diametro_femur DECIMAL(4,1),
        
        -- Composición corporal
        porcentaje_grasa DECIMAL(4,2),
        masa_muscular_esqueletica DECIMAL(5,2),
        masa_mineral_osea DECIMAL(5,2),
        sumatoria_pliegues DECIMAL(5,1),
        
        -- Clasificación Rugby
        posicion_rugby VARCHAR(50), -- Enlace, Transportador, Penetrador, Ala, etc.
        categoria VARCHAR(50),
        grupo VARCHAR(50), -- Delanteros / Tres cuartos
        
        -- Somatotipo (Heath-Carter)
        endomorfia DECIMAL(4,2),
        mesomorfia DECIMAL(4,2),
        ectomorfia DECIMAL(4,2),
        x_somatocarta DECIMAL(5,2),
        y_somatocarta DECIMAL(5,2),
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Tabla antropometria creada o ya existe');

    try {
      await pool.query(`ALTER TABLE jugadores ADD COLUMN foto_url VARCHAR(255) AFTER altura`);
      console.log('✅ Columna foto_url añadida a jugadores');
    } catch (e) {
      if (e.code === 'ER_DUP_COLUMN_NAME') console.log('ℹ️ Columna foto_url ya existe');
      else throw e;
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS evaluaciones_rugby (
        id INT AUTO_INCREMENT PRIMARY KEY,
        jugador_id INT NOT NULL,
        fecha DATE NOT NULL,
        
        -- Rendimiento Físico
        sprint_30m DECIMAL(5,2), -- segundos
        salto_vertical DECIMAL(5,2), -- cm
        resistencia_yoyo INT, -- puntaje/distancia
        
        -- Composición Corporal (copiada/referenciada de antropometría en el momento)
        peso DECIMAL(5,2),
        estatura DECIMAL(4,2),
        porcentaje_grasa DECIMAL(4,2),
        masa_muscular DECIMAL(5,2),
        imc DECIMAL(4,2),
        
        -- Puntajes Normalizados (0-100)
        score_velocidad INT,
        score_potencia INT,
        score_resistencia INT,
        score_grasa INT,
        score_musculo INT,
        score_general INT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Tabla evaluaciones_rugby creada');
  } catch (err) {
    console.error('❌ Error al crear tabla antropometria:', err.message);
  }
};

up().then(() => process.exit());
