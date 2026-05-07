const crypto = require('crypto');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

function hashPassword(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

function generarTokens(usuario) {
  const payload = { id: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre };
  const access  = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
  const refresh = jwt.sign({ id: usuario.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { access, refresh };
}

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  try {
    const { rows } = await db.query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = true',
      [email.toLowerCase().trim()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });

    const usuario = rows[0];
    const hash = hashPassword(password, usuario.salt);
    if (hash !== usuario.password_hash) return res.status(401).json({ error: 'Credenciales inválidas' });

    const { access, refresh } = generarTokens(usuario);

    res.json({
      access_token:  access,
      refresh_token: refresh,
      usuario: {
        id:          usuario.id,
        nombre:      usuario.nombre,
        email:       usuario.email,
        rol:         usuario.rol,
        jugador_id:  usuario.jugador_id,
        primer_login: usuario.primer_login,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/refresh
exports.refresh = async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token requerido' });
  try {
    const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    const { rows } = await db.query('SELECT * FROM usuarios WHERE id = $1 AND activo = true', [decoded.id]);
    if (!rows.length) return res.status(401).json({ error: 'Usuario no encontrado' });
    const { access, refresh } = generarTokens(rows[0]);
    res.json({ access_token: access, refresh_token: refresh });
  } catch {
    res.status(401).json({ error: 'Refresh token inválido o expirado' });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, nombre, email, rol, jugador_id, primer_login, created_at FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/auth/cambiar-password
exports.cambiarPassword = async (req, res) => {
  const { password_actual, password_nuevo } = req.body;
  if (!password_actual || !password_nuevo) return res.status(400).json({ error: 'Ambas contraseñas son requeridas' });
  if (password_nuevo.length < 6) return res.status(400).json({ error: 'La contraseña nueva debe tener al menos 6 caracteres' });

  try {
    const { rows } = await db.query('SELECT * FROM usuarios WHERE id = $1', [req.usuario.id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const usuario = rows[0];
    if (hashPassword(password_actual, usuario.salt) !== usuario.password_hash) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    const salt    = crypto.randomBytes(16).toString('hex');
    const newHash = hashPassword(password_nuevo, salt);

    await db.query(
      'UPDATE usuarios SET password_hash=$1, salt=$2, primer_login=false WHERE id=$3',
      [newHash, salt, req.usuario.id]
    );
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
