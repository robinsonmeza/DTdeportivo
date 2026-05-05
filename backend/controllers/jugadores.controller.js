const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configuración de multer para fotos de jugadores
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
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Formato no permitido'));
  }
});

exports.uploadMiddleware = upload.single('foto');

exports.uploadPhoto = async (req, res) => {
  const { id } = req.params;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No se recibió archivo' });

  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const foto_url = `${baseUrl}/uploads/players/${file.filename}`;
    
    await db.query('UPDATE jugadores SET foto_url = ? WHERE id = ?', [foto_url, id]);
    res.json({ foto_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/jugadores
exports.getAll = async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM jugadores ORDER BY nombre ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/jugadores/:id
exports.getOne = async (req, res) => {
  try {
    // Obtener datos básicos
    const [playerRows] = await db.query('SELECT * FROM jugadores WHERE id = ?', [req.params.id]);
    if (!playerRows.length) return res.status(404).json({ error: 'Jugador no encontrado' });
    
    const player = playerRows[0];

    // Obtener última antropometría
    const [antroRows] = await db.query(
      'SELECT * FROM antropometria WHERE jugador_id = ? ORDER BY fecha DESC LIMIT 1',
      [req.params.id]
    );
    player.ultima_antropometria = antroRows[0] || null;

    // Obtener última evaluación
    const [evalRows] = await db.query(
      'SELECT * FROM evaluaciones_rugby WHERE jugador_id = ? ORDER BY fecha DESC LIMIT 1',
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
  const { nombre, edad, posicion, peso, altura } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    const [result] = await db.query(
      'INSERT INTO jugadores (nombre, edad, posicion, peso, altura) VALUES (?,?,?,?,?)',
      [nombre, edad, posicion, peso, altura]
    );
    res.status(201).json({ id: result.insertId, nombre, edad, posicion, peso, altura });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/jugadores/:id
exports.update = async (req, res) => {
  const { nombre, edad, posicion, peso, altura } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE jugadores SET nombre=?, edad=?, posicion=?, peso=?, altura=? WHERE id=?',
      [nombre, edad, posicion, peso, altura, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Jugador no encontrado' });
    res.json({ message: 'Jugador actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/jugadores/:id
exports.remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM jugadores WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Jugador no encontrado' });
    res.json({ message: 'Jugador eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
