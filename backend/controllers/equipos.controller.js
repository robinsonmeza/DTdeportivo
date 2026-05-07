const db = require('../config/db');

exports.getAll = async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM equipos ORDER BY nombre ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const { nombre, categoria, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    const { rows } = await db.query(
      'INSERT INTO equipos (nombre, categoria, descripcion) VALUES ($1,$2,$3) RETURNING id',
      [nombre, categoria || null, descripcion || null]
    );
    res.status(201).json({ id: rows[0].id, nombre, categoria, descripcion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  const { nombre, categoria, descripcion } = req.body;
  try {
    const { rowCount } = await db.query(
      'UPDATE equipos SET nombre=$1, categoria=$2, descripcion=$3 WHERE id=$4',
      [nombre, categoria || null, descripcion || null, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json({ message: 'Equipo actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM equipos WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json({ message: 'Equipo eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
