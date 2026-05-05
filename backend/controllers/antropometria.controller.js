const pool = require('../config/db');

const calculateSomatotype = (data) => {
  const {
    peso, estatura,
    pliegue_biceps, pliegue_triceps, pliegue_subescapular, pliegue_suprailiaco, pliegue_supraespinal, pliegue_abdominal, pliegue_muslo_anterior, pliegue_pierna_medial,
    perimetro_brazo_contraido, perimetro_pierna,
    diametro_humero, diametro_femur
  } = data;

  // Validar datos mínimos para el cálculo
  if (!peso || !estatura) return {
    endomorfia: 0, mesomorfia: 0, ectomorfia: 0, x_somatocarta: 0, y_somatocarta: 0, sumatoria_pliegues: 0
  };

  // 1. ENDOMORFIA ( Heath-Carter )
  // Suma de 3 pliegues: triceps, subescapular, supraespinal
  const sum3 = Number(pliegue_triceps || 0) + Number(pliegue_subescapular || 0) + Number(pliegue_supraespinal || 0);
  const sum3Corrected = sum3 * (170.18 / (Number(estatura) * 100));
  const endo = -0.7182 + (0.1451 * sum3Corrected) - (0.00068 * Math.pow(sum3Corrected, 2)) + (0.0000014 * Math.pow(sum3Corrected, 3));

  // 2. MESOMORFIA
  // Brazo corregido = perimetro brazo - pliegue triceps/10 (en cm)
  const brazoCorr = Number(perimetro_brazo_contraido || 0) - (Number(pliegue_triceps || 0) / 10);
  const piernaCorr = Number(perimetro_pierna || 0) - (Number(pliegue_pierna_medial || 0) / 10);
  const meso = (0.858 * Number(diametro_humero || 0)) + (0.601 * Number(diametro_femur || 0)) + (0.188 * brazoCorr) + (0.161 * piernaCorr) - (0.131 * (Number(estatura) * 100)) + 4.5;

  // 3. ECTOMORFIA
  const HWR = (Number(estatura) * 100) / Math.pow(Number(peso), 1/3);
  let ecto;
  if (HWR >= 40.75) {
    ecto = (0.732 * HWR) - 28.58;
  } else if (HWR > 38.25) {
    ecto = (0.463 * HWR) - 17.63;
  } else {
    ecto = 0.1;
  }

  // Coordenadas Somatocarta
  const x = ecto - endo;
  const y = (2 * meso) - (endo + ecto);

  return {
    endomorfia: Number(endo.toFixed(2)),
    mesomorfia: Number(meso.toFixed(2)),
    ectomorfia: Number(ecto.toFixed(2)),
    x_somatocarta: Number(x.toFixed(2)),
    y_somatocarta: Number(y.toFixed(2)),
    sumatoria_pliegues: Number((sum3 + Number(pliegue_biceps || 0) + Number(pliegue_suprailiaco || 0) + Number(pliegue_abdominal || 0) + Number(pliegue_muslo_anterior || 0) + Number(pliegue_pierna_medial || 0)).toFixed(1))
  };
};

const getAntropometriaByJugador = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM antropometria WHERE jugador_id = ? ORDER BY fecha DESC',
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createAntropometria = async (req, res) => {
  try {
    const data = { ...req.body };
    
    // Limpiar strings vacíos para campos numéricos
    for (let key in data) {
      if (data[key] === '') {
        data[key] = null;
      }
    }

    const somato = calculateSomatotype(data);
    
    const fields = { ...data, ...somato };
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const placeholders = keys.map(() => '?').join(', ');

    const [result] = await pool.query(
      `INSERT INTO antropometria (${keys.join(', ')}) VALUES (${placeholders})`,
      values
    );

    res.status(201).json({ id: result.insertId, ...fields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteAntropometria = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM antropometria WHERE id = ?', [id]);
    res.json({ message: 'Registro eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateAntropometria = async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    
    // Limpiar strings vacíos para campos numéricos
    for (let key in data) {
      if (data[key] === '') {
        data[key] = null;
      }
    }

    const somato = calculateSomatotype(data);
    const fields = { ...data, ...somato };
    
    // Eliminar campos que no deben actualizarse o que vienen del body pero no están en la tabla
    delete fields.id;
    delete fields.created_at;

    const keys = Object.keys(fields);
    const values = [...Object.values(fields), id];
    const setClause = keys.map(key => `${key} = ?`).join(', ');

    await pool.query(
      `UPDATE antropometria SET ${setClause} WHERE id = ?`,
      values
    );

    res.json({ message: 'Registro actualizado correctamente', ...fields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAntropometriaByJugador,
  createAntropometria,
  updateAntropometria,
  deleteAntropometria
};
