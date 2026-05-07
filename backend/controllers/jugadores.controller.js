const db   = require('../config/db');
const path = require('path');
const fs   = require('fs');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'players');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `player-${req.params.id || Date.now()}${ext}`);
  },
});

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
    const baseUrl  = `${req.protocol}://${req.get('host')}`;
    const foto_url = `${baseUrl}/uploads/players/${req.file.filename}`;
    await db.query('UPDATE jugadores SET foto_url = $1 WHERE id = $2', [foto_url, id]);
    res.json({ foto_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/jugadores
exports.getAll = async (req, res) => {
  try {
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
    const { rows } = await db.query(
      `SELECT j.*, eq.nombre AS equipo_nombre, d.nombre AS disciplina_nombre
       FROM jugadores j
       LEFT JOIN equipos eq ON j.equipo_id = eq.id
       LEFT JOIN disciplinas d ON j.disciplina_id = d.id
       ORDER BY j.nombre ASC`
    );
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

  // Un jugador no puede tener equipo Y disciplina al mismo tiempo
  if (equipo_id && disciplina_id)
    return res.status(400).json({ error: 'Un jugador solo puede estar en un equipo O tener una disciplina, no ambos' });

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

// PUT /api/jugadores/:id
exports.update = async (req, res) => {
  const { nombre, edad, posicion, peso, altura, equipo_id, disciplina_id } = req.body;

  if (equipo_id && disciplina_id)
    return res.status(400).json({ error: 'Un jugador solo puede estar en un equipo O tener una disciplina, no ambos' });

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
