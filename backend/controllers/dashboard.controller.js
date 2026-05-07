const db = require('../config/db');

exports.getSummary = async (_req, res) => {
  try {
    const { rows: [r1] } = await db.query('SELECT COUNT(*) AS total FROM jugadores');
    const { rows: [r2] } = await db.query('SELECT COUNT(*) AS total FROM lesiones WHERE fecha_fin IS NULL');
    const { rows: [r3] } = await db.query('SELECT COUNT(*) AS total FROM partidos');
    const { rows: [r4] } = await db.query('SELECT COUNT(*) AS total FROM entrenamientos');

    const { rows: ultimos_entrenamientos } = await db.query(
      'SELECT * FROM entrenamientos ORDER BY fecha DESC LIMIT 5'
    );
    const { rows: proximos_partidos } = await db.query(
      "SELECT * FROM partidos WHERE fecha >= CURRENT_DATE ORDER BY fecha ASC LIMIT 5"
    );
    const { rows: top_anotadores } = await db.query(`
      SELECT j.nombre, SUM(es.goles) AS total_anotaciones, SUM(es.asistencias) AS total_asistencias
      FROM estadisticas_jugador es
      JOIN jugadores j ON es.jugador_id = j.id
      GROUP BY es.jugador_id, j.nombre
      ORDER BY total_anotaciones DESC, total_asistencias DESC
      LIMIT 5
    `);

    res.json({
      total_jugadores:      Number(r1.total),
      lesiones_activas:     Number(r2.total),
      total_partidos:       Number(r3.total),
      total_entrenamientos: Number(r4.total),
      ultimos_entrenamientos,
      proximos_partidos,
      top_anotadores,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
