const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(cors({
    origin: '*',
    credentials: true,
  }));
  app.use(express.json());

  // Servir estáticos de uploads con CORS
  app.use('/uploads', (req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  }, express.static(path.join(__dirname, 'backend', 'uploads')));

  // Rutas API
  app.use('/api/auth',          require('./backend/routes/auth.routes'));
  app.use('/api/usuarios',      require('./backend/routes/usuarios.routes'));
  app.use('/api/equipos',       require('./backend/routes/equipos.routes'));
  app.use('/api/disciplinas',   require('./backend/routes/disciplinas.routes'));
  app.use('/api/jugadores',     require('./backend/routes/jugadores.routes'));
  app.use('/api/entrenamientos',require('./backend/routes/entrenamientos.routes'));
  app.use('/api/asistencia',    require('./backend/routes/asistencia.routes'));
  app.use('/api/lesiones',      require('./backend/routes/lesiones.routes'));
  app.use('/api/evaluaciones',  require('./backend/routes/evaluaciones.routes'));
  app.use('/api/partidos',      require('./backend/routes/partidos.routes'));
  app.use('/api/estadisticas',  require('./backend/routes/estadisticas.routes'));
  app.use('/api/dashboard',     require('./backend/routes/dashboard.routes'));
  app.use('/api/settings',      require('./backend/routes/settings.routes'));
  app.use('/api/antropometria', require('./backend/routes/antropometria.routes'));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  // Frontend integration (Vite dev server or static build)
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = require('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: path.join(__dirname, 'frontend'),
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor DT Deportivo corriendo en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('❌ Error al iniciar el servidor:', err);
  process.exit(1);
});
