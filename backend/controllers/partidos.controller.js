const db = require('../config/db');

exports.getAll = async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM partidos ORDER BY fecha DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM partidos WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Partido no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const { fecha, rival, tipo, resultado } = req.body;
  if (!fecha || !rival || !tipo) return res.status(400).json({ error: 'Fecha, rival y tipo son obligatorios' });
  try {
    const { rows } = await db.query(
      'INSERT INTO partidos (fecha, rival, tipo, resultado) VALUES ($1,$2,$3,$4) RETURNING id',
      [fecha, rival, tipo, resultado || null]
    );
    res.status(201).json({ id: rows[0].id, fecha, rival, tipo, resultado });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  const { fecha, rival, tipo, resultado } = req.body;
  try {
    const { rowCount } = await db.query(
      'UPDATE partidos SET fecha=$1, rival=$2, tipo=$3, resultado=$4 WHERE id=$5',
      [fecha, rival, tipo, resultado || null, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Partido no encontrado' });
    res.json({ message: 'Partido actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM partidos WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Partido no encontrado' });
    res.json({ message: 'Partido eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
