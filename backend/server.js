const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();

// ── Middlewares ──────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Servir estáticos con cabeceras CORS explícitas para evitar ERR_BLOCKED_BY_ORB
app.use('/uploads', (req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// ── Rutas ────────────────────────────────────────────────
app.use('/api/jugadores',     require('./routes/jugadores.routes'));
app.use('/api/entrenamientos',require('./routes/entrenamientos.routes'));
app.use('/api/asistencia',    require('./routes/asistencia.routes'));
app.use('/api/lesiones',      require('./routes/lesiones.routes'));
app.use('/api/evaluaciones',  require('./routes/evaluaciones.routes'));
app.use('/api/partidos',      require('./routes/partidos.routes'));
app.use('/api/estadisticas',  require('./routes/estadisticas.routes'));
app.use('/api/dashboard',     require('./routes/dashboard.routes'));
app.use('/api/settings',      require('./routes/settings.routes'));
app.use('/api/antropometria',  require('./routes/antropometria.routes'));

// ── Health check ─────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ── 404 ──────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── Arrancar servidor ────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀  Servidor corriendo en http://localhost:${PORT}`);
});
