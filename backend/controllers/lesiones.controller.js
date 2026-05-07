const db = require('../config/db');

exports.getAll = async (_req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT l.*, j.nombre AS jugador_nombre
      FROM lesiones l
      JOIN jugadores j ON l.jugador_id = j.id
      ORDER BY l.fecha_inicio DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM lesiones WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Lesión no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const { jugador_id, tipo, descripcion, fecha_inicio, fecha_fin } = req.body;
  if (!jugador_id || !fecha_inicio) return res.status(400).json({ error: 'jugador_id y fecha_inicio son obligatorios' });
  try {
    const { rows } = await db.query(
      'INSERT INTO lesiones (jugador_id, tipo, descripcion, fecha_inicio, fecha_fin) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [jugador_id, tipo, descripcion, fecha_inicio, fecha_fin || null]
    );
    res.status(201).json({ id: rows[0].id, jugador_id, tipo, descripcion, fecha_inicio, fecha_fin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  const { jugador_id, tipo, descripcion, fecha_inicio, fecha_fin } = req.body;
  try {
    const { rowCount } = await db.query(
      'UPDATE lesiones SET jugador_id=$1, tipo=$2, descripcion=$3, fecha_inicio=$4, fecha_fin=$5 WHERE id=$6',
      [jugador_id, tipo, descripcion, fecha_inicio, fecha_fin || null, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Lesión no encontrada' });
    res.json({ message: 'Lesión actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM lesiones WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Lesión no encontrada' });
    res.json({ message: 'Lesión eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
