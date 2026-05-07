const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();

// ── Middlewares ──────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

// Servir estáticos con cabeceras CORS explícitas
app.use('/uploads', (req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// ── Rutas públicas ───────────────────────────────────────
app.use('/api/auth',          require('./routes/auth.routes'));

// ── Rutas protegidas ─────────────────────────────────────
app.use('/api/usuarios',      require('./routes/usuarios.routes'));
app.use('/api/equipos',       require('./routes/equipos.routes'));
app.use('/api/disciplinas',   require('./routes/disciplinas.routes'));
app.use('/api/jugadores',     require('./routes/jugadores.routes'));
app.use('/api/entrenamientos',require('./routes/entrenamientos.routes'));
app.use('/api/asistencia',    require('./routes/asistencia.routes'));
app.use('/api/lesiones',      require('./routes/lesiones.routes'));
app.use('/api/evaluaciones',  require('./routes/evaluaciones.routes'));
app.use('/api/partidos',      require('./routes/partidos.routes'));
app.use('/api/estadisticas',  require('./routes/estadisticas.routes'));
app.use('/api/dashboard',     require('./routes/dashboard.routes'));
app.use('/api/settings',      require('./routes/settings.routes'));
app.use('/api/antropometria', require('./routes/antropometria.routes'));

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

module.exports = app;
