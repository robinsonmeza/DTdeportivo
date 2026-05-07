const pool = require('../config/db');

const calculateSomatotype = (data) => {
  const {
    peso, estatura,
    pliegue_biceps, pliegue_triceps, pliegue_subescapular, pliegue_suprailiaco,
    pliegue_supraespinal, pliegue_abdominal, pliegue_muslo_anterior, pliegue_pierna_medial,
    perimetro_brazo_contraido, perimetro_pierna,
    diametro_humero, diametro_femur,
  } = data;

  if (!peso || !estatura) return {
    endomorfia: 0, mesomorfia: 0, ectomorfia: 0,
    x_somatocarta: 0, y_somatocarta: 0, sumatoria_pliegues: 0,
  };

  const sum3 = Number(pliegue_triceps || 0) + Number(pliegue_subescapular || 0) + Number(pliegue_supraespinal || 0);
  const sum3Corrected = sum3 * (170.18 / (Number(estatura) * 100));
  const endo = -0.7182 + (0.1451 * sum3Corrected) - (0.00068 * sum3Corrected ** 2) + (0.0000014 * sum3Corrected ** 3);

  const brazoCorr  = Number(perimetro_brazo_contraido || 0) - (Number(pliegue_triceps || 0) / 10);
  const piernaCorr = Number(perimetro_pierna || 0) - (Number(pliegue_pierna_medial || 0) / 10);
  const meso = (0.858 * Number(diametro_humero || 0)) + (0.601 * Number(diametro_femur || 0))
    + (0.188 * brazoCorr) + (0.161 * piernaCorr) - (0.131 * (Number(estatura) * 100)) + 4.5;

  const HWR = (Number(estatura) * 100) / Math.pow(Number(peso), 1 / 3);
  const ecto = HWR >= 40.75 ? (0.732 * HWR) - 28.58
    : HWR > 38.25 ? (0.463 * HWR) - 17.63
    : 0.1;

  return {
    endomorfia:     Number(endo.toFixed(2)),
    mesomorfia:     Number(meso.toFixed(2)),
    ectomorfia:     Number(ecto.toFixed(2)),
    x_somatocarta:  Number((ecto - endo).toFixed(2)),
    y_somatocarta:  Number(((2 * meso) - (endo + ecto)).toFixed(2)),
    sumatoria_pliegues: Number((sum3 + Number(pliegue_biceps || 0) + Number(pliegue_suprailiaco || 0)
      + Number(pliegue_abdominal || 0) + Number(pliegue_muslo_anterior || 0) + Number(pliegue_pierna_medial || 0)).toFixed(1)),
  };
};

const getAntropometriaByJugador = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM antropometria WHERE jugador_id = $1 ORDER BY fecha DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createAntropometria = async (req, res) => {
  try {
    const data = { ...req.body };
    for (const key in data) if (data[key] === '') data[key] = null;

    const somato = calculateSomatotype(data);
    const fields = { ...data, ...somato };
    const keys   = Object.keys(fields);
    const vals   = Object.values(fields);
    const params = keys.map((_, i) => `$${i + 1}`).join(', ');

    const { rows } = await pool.query(
      `INSERT INTO antropometria (${keys.join(', ')}) VALUES (${params}) RETURNING id`,
      vals
    );
    res.status(201).json({ id: rows[0].id, ...fields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateAntropometria = async (req, res) => {
  try {
    const data = { ...req.body };
    for (const key in data) if (data[key] === '') data[key] = null;
    delete data.id;
    delete data.created_at;

    const somato = calculateSomatotype(data);
    const fields = { ...data, ...somato };
    const keys   = Object.keys(fields);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const vals = [...Object.values(fields), req.params.id];

    await pool.query(
      `UPDATE antropometria SET ${setClause} WHERE id = $${vals.length}`,
      vals
    );
    res.json({ message: 'Registro actualizado correctamente', ...fields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteAntropometria = async (req, res) => {
  try {
    await pool.query('DELETE FROM antropometria WHERE id = $1', [req.params.id]);
    res.json({ message: 'Registro eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAntropometriaByJugador, createAntropometria, updateAntropometria, deleteAntropometria };
