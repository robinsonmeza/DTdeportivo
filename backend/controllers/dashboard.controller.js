const db = require('../config/db');

// GET /api/dashboard — resumen general para el dashboard
exports.getSummary = async (_req, res) => {
  try {
    const [[{ total_jugadores }]]   = await db.query('SELECT COUNT(*) AS total_jugadores FROM jugadores');
    const [[{ lesiones_activas }]]  = await db.query('SELECT COUNT(*) AS lesiones_activas FROM lesiones WHERE fecha_fin IS NULL');
    const [[{ total_partidos }]]    = await db.query('SELECT COUNT(*) AS total_partidos FROM partidos');
    const [[{ total_entrenamientos }]] = await db.query('SELECT COUNT(*) AS total_entrenamientos FROM entrenamientos');

    const [ultimos_entrenamientos] = await db.query(
      'SELECT * FROM entrenamientos ORDER BY fecha DESC LIMIT 5'
    );
    const [proximos_partidos] = await db.query(
      "SELECT * FROM partidos WHERE fecha >= CURDATE() ORDER BY fecha ASC LIMIT 5"
    );
    const [top_anotadores] = await db.query(`
      SELECT j.nombre, SUM(es.goles) AS total_anotaciones, SUM(es.asistencias) AS total_asistencias
      FROM estadisticas_jugador es
      JOIN jugadores j ON es.jugador_id = j.id
      GROUP BY es.jugador_id, j.nombre
      ORDER BY total_anotaciones DESC, total_asistencias DESC   
      LIMIT 5
    `);

    res.json({
      total_jugadores,
      lesiones_activas,
      total_partidos,
      total_entrenamientos,
      ultimos_entrenamientos,
      proximos_partidos,
      top_anotadores, 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
