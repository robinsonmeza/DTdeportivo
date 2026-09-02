const db     = require('../config/db');
const path   = require('path');
const fs     = require('fs');
const multer = require('multer');

// Asegurar columnas en la base de datos al inicio
let columnasAseguradas = false;
async function asegurarColumnasEquipos() {
  if (columnasAseguradas) return;
  try {
    await db.query(`
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE equipos ADD COLUMN logo_url TEXT;
        EXCEPTION WHEN duplicate_column THEN END;
        BEGIN
          ALTER TABLE equipos ADD COLUMN disciplina_id INT;
        EXCEPTION WHEN duplicate_column THEN END;
      END $$;
    `);
    columnasAseguradas = true;
  } catch (e) {
    // Si la BD es MySQL o no soporta DO block, intentar ALTER directo
    try {
      await db.query('ALTER TABLE equipos ADD COLUMN IF NOT EXISTS logo_url TEXT');
    } catch (_) {}
    try {
      await db.query('ALTER TABLE equipos ADD COLUMN IF NOT EXISTS disciplina_id INT');
    } catch (_) {}
    columnasAseguradas = true;
  }
}

// Configuración de Multer para imágenes de equipos (logos/escudos)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'teams');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `team-${req.params.id || Date.now()}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Formato de imagen no permitido (use PNG, JPG, WEBP o SVG)'));
  },
});

exports.uploadMiddleware = upload.single('logo');

exports.uploadLogo = async (req, res) => {
  await asegurarColumnasEquipos();
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo de imagen' });
  try {
    const logo_url = `/uploads/teams/${req.file.filename}`;
    await db.query('UPDATE equipos SET logo_url = $1 WHERE id = $2', [logo_url, id]);
    res.json({ logo_url, message: 'Imagen del equipo actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/equipos
exports.getAll = async (req, res) => {
  await asegurarColumnasEquipos();
  try {
    const { disciplina_id } = req.query;
    let query = `
      SELECT e.*, d.nombre AS disciplina_nombre,
             COUNT(j.id)::int AS total_jugadores
      FROM equipos e
      LEFT JOIN disciplinas d ON e.disciplina_id = d.id
      LEFT JOIN jugadores j ON j.equipo_id = e.id
    `;
    const params = [];
    if (disciplina_id && disciplina_id !== 'todos') {
      params.push(disciplina_id);
      query += ` WHERE e.disciplina_id = $1`;
    }
    query += ` GROUP BY e.id, d.nombre ORDER BY e.nombre ASC`;

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/equipos/:id
exports.getOne = async (req, res) => {
  await asegurarColumnasEquipos();
  try {
    const { rows: teamRows } = await db.query(
      `SELECT e.*, d.nombre AS disciplina_nombre
       FROM equipos e
       LEFT JOIN disciplinas d ON e.disciplina_id = d.id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (!teamRows.length) return res.status(404).json({ error: 'Equipo no encontrado' });

    const equipo = teamRows[0];

    // Obtener los deportistas asignados a este equipo
    const { rows: jugadores } = await db.query(
      `SELECT j.id, j.nombre, j.posicion, j.edad, j.peso, j.altura, j.foto_url, j.disciplina_id,
              d.nombre AS disciplina_nombre
       FROM jugadores j
       LEFT JOIN disciplinas d ON j.disciplina_id = d.id
       WHERE j.equipo_id = $1
       ORDER BY j.nombre ASC`,
      [req.params.id]
    );

    equipo.jugadores = jugadores;
    equipo.total_jugadores = jugadores.length;

    res.json(equipo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/equipos
exports.create = async (req, res) => {
  await asegurarColumnasEquipos();
  const { nombre, categoria, descripcion, disciplina_id, logo_url } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre del equipo es obligatorio' });
  try {
    const { rows } = await db.query(
      `INSERT INTO equipos (nombre, categoria, descripcion, disciplina_id, logo_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [nombre.trim(), categoria || null, descripcion || null, disciplina_id || null, logo_url || null]
    );
    const nuevoId = rows[0].id;
    res.status(201).json({
      id: nuevoId,
      nombre,
      categoria,
      descripcion,
      disciplina_id,
      logo_url,
      message: 'Equipo creado exitosamente'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/equipos/:id
exports.update = async (req, res) => {
  await asegurarColumnasEquipos();
  const { nombre, categoria, descripcion, disciplina_id, logo_url } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre del equipo es obligatorio' });
  try {
    const { rowCount } = await db.query(
      `UPDATE equipos 
       SET nombre=$1, categoria=$2, descripcion=$3, disciplina_id=$4, logo_url=COALESCE($5, logo_url)
       WHERE id=$6`,
      [nombre.trim(), categoria || null, descripcion || null, disciplina_id || null, logo_url || null, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json({ message: 'Equipo actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/equipos/:id
exports.remove = async (req, res) => {
  try {
    // Desvincular jugadores antes de eliminar
    await db.query('UPDATE jugadores SET equipo_id = NULL WHERE equipo_id = $1', [req.params.id]);
    const { rowCount } = await db.query('DELETE FROM equipos WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json({ message: 'Equipo eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

