const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json());

// Servir estáticos de uploads
app.use('/uploads', (req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '..', 'backend', 'uploads')));

// Rutas API
app.use('/api/auth',          require('../backend/routes/auth.routes'));
app.use('/api/usuarios',      require('../backend/routes/usuarios.routes'));
app.use('/api/equipos',       require('../backend/routes/equipos.routes'));
app.use('/api/disciplinas',   require('../backend/routes/disciplinas.routes'));
app.use('/api/jugadores',     require('../backend/routes/jugadores.routes'));
app.use('/api/entrenamientos',require('../backend/routes/entrenamientos.routes'));
app.use('/api/asistencia',    require('../backend/routes/asistencia.routes'));
app.use('/api/lesiones',      require('../backend/routes/lesiones.routes'));
app.use('/api/evaluaciones',  require('../backend/routes/evaluaciones.routes'));
app.use('/api/partidos',      require('../backend/routes/partidos.routes'));
app.use('/api/estadisticas',  require('../backend/routes/estadisticas.routes'));
app.use('/api/dashboard',     require('../backend/routes/dashboard.routes'));
app.use('/api/settings',      require('../backend/routes/settings.routes'));
app.use('/api/antropometria', require('../backend/routes/antropometria.routes'));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// 404 handler for API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Ruta API no encontrada' });
});

module.exports = app;
