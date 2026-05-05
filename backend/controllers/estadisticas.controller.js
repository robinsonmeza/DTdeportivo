const db = require('../config/db');

exports.getAll = async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT es.*, j.nombre AS jugador_nombre, p.rival, p.fecha AS partido_fecha
      FROM estadisticas_jugador es
      JOIN jugadores j ON es.jugador_id = j.id
      LEFT JOIN partidos p ON es.partido_id = p.id
      ORDER BY es.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getByJugador = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT es.*, p.rival, p.fecha AS partido_fecha, p.tipo AS partido_tipo
      FROM estadisticas_jugador es
      LEFT JOIN partidos p ON es.partido_id = p.id
      WHERE es.jugador_id = ?
      ORDER BY p.fecha DESC
    `, [req.params.jugador_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const { jugador_id, partido_id, goles, asistencias, minutos_jugados } = req.body;
  if (!jugador_id) return res.status(400).json({ error: 'jugador_id es obligatorio' });
  try {
    const [result] = await db.query(
      'INSERT INTO estadisticas_jugador (jugador_id, partido_id, goles, asistencias, minutos_jugados) VALUES (?,?,?,?,?)',
      [jugador_id, partido_id || null, goles || 0, asistencias || 0, minutos_jugados || 0]
    );
    res.status(201).json({ id: result.insertId, jugador_id, partido_id, goles, asistencias, minutos_jugados });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  const { jugador_id, partido_id, goles, asistencias, minutos_jugados } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE estadisticas_jugador SET jugador_id=?, partido_id=?, goles=?, asistencias=?, minutos_jugados=? WHERE id=?',
      [jugador_id, partido_id || null, goles || 0, asistencias || 0, minutos_jugados || 0, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json({ message: 'Estadística actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await db.query('DELETE FROM estadisticas_jugador WHERE id = ?', [req.params.id]);
    res.json({ message: 'Estadística eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
