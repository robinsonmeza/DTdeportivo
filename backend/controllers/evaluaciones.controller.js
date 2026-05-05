const db = require('../config/db');

// GET /api/evaluaciones
exports.getAll = async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.*, j.nombre as jugador_nombre 
      FROM evaluaciones_rugby e 
      JOIN jugadores j ON e.jugador_id = j.id 
      ORDER BY e.fecha DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/evaluaciones
exports.create = async (req, res) => {
  const data = req.body;
  
  // Lógica de Normalización (0-100)
  // Valores de referencia (aproximados para Rugby)
  const refs = {
    sprint: { best: 3.8, worst: 5.5 }, // segundos
    salto: { best: 70, worst: 20 },    // cm
    yoyo: { best: 2200, worst: 400 },   // metros/distancia
    grasa: { best: 8, worst: 25 },     // %
    musculo: { best: 50, worst: 25 }   // kg
  };

  const norm = (val, best, worst) => {
    if (!val) return 0;
    const v = Number(val);
    let score = ((v - worst) / (best - worst)) * 100;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const score_velocidad = norm(data.sprint_30m, refs.sprint.best, refs.sprint.worst);
  const score_potencia = norm(data.salto_vertical, refs.salto.best, refs.salto.worst);
  const score_resistencia = norm(data.resistencia_yoyo, refs.yoyo.best, refs.yoyo.worst);
  const score_grasa = norm(data.porcentaje_grasa, refs.grasa.best, refs.grasa.worst);
  const score_musculo = norm(data.masa_muscular, refs.musculo.best, refs.musculo.worst);
  
  const score_general = Math.round((score_velocidad + score_potencia + score_resistencia + score_grasa + score_musculo) / 5);

  const fields = {
    ...data,
    score_velocidad, score_potencia, score_resistencia, score_grasa, score_musculo, score_general
  };

  // Limpiar vacíos
  for (let k in fields) if (fields[k] === '') fields[k] = null;

  try {
    const keys = Object.keys(fields);
    const placeholders = keys.map(() => '?').join(',');
    const [result] = await db.query(
      `INSERT INTO evaluaciones_rugby (${keys.join(',')}) VALUES (${placeholders})`,
      Object.values(fields)
    );
    res.status(201).json({ id: result.insertId, ...fields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/evaluaciones/:id
exports.remove = async (req, res) => {
  try {
    await db.query('DELETE FROM evaluaciones_rugby WHERE id = ?', [req.params.id]);
    res.json({ message: 'Evaluación eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
