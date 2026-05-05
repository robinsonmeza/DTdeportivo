const db = require('../config/db');

exports.getAll = async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM partidos ORDER BY fecha DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM partidos WHERE id = ?', [req.params.id]);
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
    const [result] = await db.query(
      'INSERT INTO partidos (fecha, rival, tipo, resultado) VALUES (?,?,?,?)',
      [fecha, rival, tipo, resultado || null]
    );
    res.status(201).json({ id: result.insertId, fecha, rival, tipo, resultado });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  const { fecha, rival, tipo, resultado } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE partidos SET fecha=?, rival=?, tipo=?, resultado=? WHERE id=?',
      [fecha, rival, tipo, resultado || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Partido no encontrado' });
    res.json({ message: 'Partido actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM partidos WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Partido no encontrado' });
    res.json({ message: 'Partido eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
