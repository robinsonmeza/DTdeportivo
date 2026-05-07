const db = require('../config/db');

exports.getAll = async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM disciplinas ORDER BY nombre ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    const { rows } = await db.query(
      'INSERT INTO disciplinas (nombre) VALUES ($1) ON CONFLICT (nombre) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id, nombre',
      [nombre.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM disciplinas WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Disciplina no encontrada' });
    res.json({ message: 'Disciplina eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
