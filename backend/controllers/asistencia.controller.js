const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const { entrenamiento_id } = req.query;
    let query = `
      SELECT ae.*, j.nombre AS jugador_nombre, e.tipo AS entrenamiento_tipo, e.fecha
      FROM asistencia_entrenamiento ae
      JOIN jugadores j ON ae.jugador_id = j.id
      JOIN entrenamientos e ON ae.entrenamiento_id = e.id
    `;
    const params = [];
    if (entrenamiento_id) {
      params.push(entrenamiento_id);
      query += ` WHERE ae.entrenamiento_id = $${params.length}`;
    }
    query += ' ORDER BY e.fecha DESC, j.nombre ASC';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const { jugador_id, entrenamiento_id, asistencia } = req.body;
  if (!jugador_id || !entrenamiento_id) return res.status(400).json({ error: 'jugador_id y entrenamiento_id son obligatorios' });
  try {
    const { rows } = await db.query(
      'INSERT INTO asistencia_entrenamiento (jugador_id, entrenamiento_id, asistencia) VALUES ($1,$2,$3) RETURNING id',
      [jugador_id, entrenamiento_id, asistencia ?? false]
    );
    res.status(201).json({ id: rows[0].id, jugador_id, entrenamiento_id, asistencia });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  const { asistencia } = req.body;
  try {
    const { rowCount } = await db.query(
      'UPDATE asistencia_entrenamiento SET asistencia=$1 WHERE id=$2',
      [asistencia, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json({ message: 'Asistencia actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await db.query('DELETE FROM asistencia_entrenamiento WHERE id = $1', [req.params.id]);
    res.json({ message: 'Registro eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
