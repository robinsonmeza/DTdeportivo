const db = require('../config/db');

exports.getAll = async (_req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT d.*, COUNT(j.id)::int AS total_jugadores
      FROM disciplinas d
      LEFT JOIN jugadores j ON j.disciplina_id = d.id
      GROUP BY d.id
      ORDER BY d.nombre ASC
    `);
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
    const id = req.params.id;
    // Disassociate athletes if assigned to this discipline
    await db.query('UPDATE jugadores SET disciplina_id = NULL WHERE disciplina_id = $1', [id]);
    const { rowCount } = await db.query('DELETE FROM disciplinas WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Disciplina no encontrada' });
    res.json({ message: 'Disciplina eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
