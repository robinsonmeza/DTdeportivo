const db   = require('../config/db');
const path = require('path');
const fs   = require('fs');
const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Formato no permitido'));
  },
});

exports.uploadMiddleware = upload.single('foto');

exports.uploadPhoto = async (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
  try {
    let foto_url;
    try {
      const dir = path.join(__dirname, '..', 'uploads', 'players');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
      const filename = `player-${id || Date.now()}${ext}`;
      const filePath = path.join(dir, filename);
      fs.writeFileSync(filePath, req.file.buffer);
      foto_url = `/uploads/players/${filename}`;
    } catch (diskErr) {
      foto_url = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    await db.query('UPDATE jugadores SET foto_url = $1 WHERE id = $2', [foto_url, id]);
    res.json({ foto_url });
  } catch (err) {
    console.error('Error al actualizar foto del jugador:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/jugadores
exports.getAll = async (req, res) => {
  try {
    const { disciplina_id, equipo_id } = req.query;

    // Si es jugador, solo devuelve su propio registro
    if (req.usuario?.rol === 'jugador') {
      const { rows } = await db.query(
        `SELECT j.*, eq.nombre AS equipo_nombre, d.nombre AS disciplina_nombre
         FROM jugadores j
         LEFT JOIN equipos eq ON j.equipo_id = eq.id
         LEFT JOIN disciplinas d ON j.disciplina_id = d.id
         WHERE j.id = $1`,
        [req.usuario.jugador_id]
      );
      return res.json(rows);
    }

    let query = `
      SELECT j.*, eq.nombre AS equipo_nombre, d.nombre AS disciplina_nombre
      FROM jugadores j
      LEFT JOIN equipos eq ON j.equipo_id = eq.id
      LEFT JOIN disciplinas d ON j.disciplina_id = d.id
    `;
    const params = [];

    if (disciplina_id) {
      params.push(disciplina_id);
      query += ` WHERE j.disciplina_id = $${params.length}`;
    } else if (equipo_id) {
      params.push(equipo_id);
      query += ` WHERE j.equipo_id = $${params.length}`;
    }

    query += ` ORDER BY j.nombre ASC`;

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/jugadores/:id
exports.getOne = async (req, res) => {
  try {
    const { rows: playerRows } = await db.query(
      `SELECT j.*, eq.nombre AS equipo_nombre, d.nombre AS disciplina_nombre
       FROM jugadores j
       LEFT JOIN equipos eq ON j.equipo_id = eq.id
       LEFT JOIN disciplinas d ON j.disciplina_id = d.id
       WHERE j.id = $1`,
      [req.params.id]
    );
    if (!playerRows.length) return res.status(404).json({ error: 'Jugador no encontrado' });

    const player = playerRows[0];

    const { rows: antroRows } = await db.query(
      'SELECT * FROM antropometria WHERE jugador_id = $1 ORDER BY fecha DESC LIMIT 1',
      [req.params.id]
    );
    player.ultima_antropometria = antroRows[0] || null;

    const { rows: evalRows } = await db.query(
      'SELECT * FROM evaluaciones_rugby WHERE jugador_id = $1 ORDER BY fecha DESC LIMIT 1',
      [req.params.id]
    );
    player.ultima_evaluacion = evalRows[0] || null;

    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/jugadores
exports.create = async (req, res) => {
  const { nombre, edad, posicion, peso, altura, equipo_id, disciplina_id } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  try {
    const { rows } = await db.query(
      `INSERT INTO jugadores (nombre, edad, posicion, peso, altura, equipo_id, disciplina_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [nombre, edad || null, posicion || null, peso || null, altura || null,
       equipo_id || null, disciplina_id || null]
    );
    res.status(201).json({ id: rows[0].id, nombre, edad, posicion, peso, altura, equipo_id, disciplina_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/jugadores/bulk
// Importación masiva desde CSV
exports.bulkCreate = async (req, res) => {
  const { deportistas } = req.body;
  if (!Array.isArray(deportistas) || deportistas.length === 0) {
    return res.status(400).json({ error: 'Se requiere una lista de deportistas' });
  }

  try {
    const client = await db.connect();
    const inserted = [];
    const errors = [];

    try {
      await client.query('BEGIN');

      for (let i = 0; i < deportistas.length; i++) {
        const item = deportistas[i];
        const nombre = item.nombre ? item.nombre.trim() : '';
        if (!nombre) {
          errors.push({ fila: i + 1, error: 'Nombre vacío' });
          continue;
        }

        let disciplina_id = item.disciplina_id || null;
        // Si viene nombre de deporte o disciplina por texto, buscarla o crearla
        if (!disciplina_id && item.deporte) {
          const depName = item.deporte.trim();
          const { rows: dRows } = await client.query('SELECT id FROM disciplinas WHERE LOWER(nombre) = LOWER($1)', [depName]);
          if (dRows.length > 0) {
            disciplina_id = dRows[0].id;
          } else {
            const { rows: newD } = await client.query('INSERT INTO disciplinas (nombre) VALUES ($1) RETURNING id', [depName]);
            disciplina_id = newD[0].id;
          }
        }

        let equipo_id = item.equipo_id || null;
        if (!equipo_id && item.equipo) {
          const eqName = item.equipo.trim();
          const { rows: eRows } = await client.query('SELECT id FROM equipos WHERE LOWER(nombre) = LOWER($1)', [eqName]);
          if (eRows.length > 0) {
            equipo_id = eRows[0].id;
          } else {
            const { rows: newE } = await client.query('INSERT INTO equipos (nombre) VALUES ($1) RETURNING id', [eqName]);
            equipo_id = newE[0].id;
          }
        }

        const edad = item.edad ? parseInt(item.edad, 10) : null;
        const peso = item.peso ? parseFloat(item.peso) : null;
        const altura = item.altura ? parseFloat(item.altura) : null;
        const posicion = item.posicion ? item.posicion.trim() : null;

        const { rows } = await client.query(
          `INSERT INTO jugadores (nombre, edad, posicion, peso, altura, equipo_id, disciplina_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [nombre, isNaN(edad) ? null : edad, posicion, isNaN(peso) ? null : peso, isNaN(altura) ? null : altura, equipo_id, disciplina_id]
        );

        inserted.push({ id: rows[0].id, nombre, posicion, disciplina_id, equipo_id });
      }

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    res.status(201).json({
      message: `Se importaron ${inserted.length} deportistas correctamente`,
      total: inserted.length,
      insertados: inserted,
      errores: errors
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al procesar la importación: ' + err.message });
  }
};

// PUT /api/jugadores/:id
exports.update = async (req, res) => {
  const { nombre, edad, posicion, peso, altura, equipo_id, disciplina_id } = req.body;

  try {
    const { rowCount } = await db.query(
      `UPDATE jugadores SET nombre=$1, edad=$2, posicion=$3, peso=$4, altura=$5,
       equipo_id=$6, disciplina_id=$7 WHERE id=$8`,
      [nombre, edad || null, posicion || null, peso || null, altura || null,
       equipo_id || null, disciplina_id || null, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Jugador no encontrado' });
    res.json({ message: 'Jugador actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/jugadores/:id
exports.remove = async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM jugadores WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Jugador no encontrado' });
    res.json({ message: 'Jugador eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
