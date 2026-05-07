const crypto = require('crypto');
const db     = require('../config/db');

function generateSalt()           { return crypto.randomBytes(16).toString('hex'); }
function hashPassword(pwd, salt)  { return crypto.createHmac('sha256', salt).update(pwd).digest('hex'); }

// GET /api/usuarios
exports.getAll = async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, nombre, email, rol, jugador_id, activo, primer_login, created_at
       FROM usuarios ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/usuarios
exports.create = async (req, res) => {
  const { nombre, email, password, rol, jugador_id } = req.body;
  if (!nombre || !email || !password || !rol)
    return res.status(400).json({ error: 'nombre, email, password y rol son obligatorios' });

  const rolesPermitidos = ['administrador', 'entrenador', 'personal_salud', 'jugador'];
  if (!rolesPermitidos.includes(rol))
    return res.status(400).json({ error: 'Rol inválido' });

  // Entrenador solo puede crear jugador y personal_salud
  if (req.usuario.rol === 'entrenador' && !['jugador', 'personal_salud'].includes(rol))
    return res.status(403).json({ error: 'El entrenador solo puede crear usuarios de tipo jugador o personal_salud' });

  try {
    const salt = generateSalt();
    const hash = hashPassword(password, salt);
    const { rows } = await db.query(
      `INSERT INTO usuarios (nombre, email, password_hash, salt, rol, jugador_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [nombre, email.toLowerCase().trim(), hash, salt, rol, jugador_id || null]
    );
    res.status(201).json({ id: rows[0].id, nombre, email, rol, activo: true, primer_login: true });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El email ya está registrado' });
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/usuarios/:id
exports.update = async (req, res) => {
  const { nombre, email, rol, jugador_id, activo } = req.body;
  try {
    const { rowCount } = await db.query(
      `UPDATE usuarios SET nombre=$1, email=$2, rol=$3, jugador_id=$4, activo=$5 WHERE id=$6`,
      [nombre, email?.toLowerCase().trim(), rol, jugador_id || null, activo ?? true, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/usuarios/:id/reset-password
exports.resetPassword = async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Nueva contraseña requerida' });
  try {
    const salt = generateSalt();
    const hash = hashPassword(password, salt);
    const { rowCount } = await db.query(
      'UPDATE usuarios SET password_hash=$1, salt=$2, primer_login=true WHERE id=$3',
      [hash, salt, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Contraseña restablecida. El usuario deberá cambiarla en su próximo ingreso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/usuarios/:id  (desactivar, no borrar)
exports.remove = async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'UPDATE usuarios SET activo=false WHERE id=$1',
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Usuario desactivado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/usuarios/csv  — carga masiva
exports.createFromCSV = async (req, res) => {
  const { parse } = require('csv-parse/sync');
  if (!req.file) return res.status(400).json({ error: 'Archivo CSV requerido' });

  try {
    const records = parse(req.file.buffer.toString('utf8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const rolesValidos = ['administrador', 'entrenador', 'personal_salud', 'jugador'];
    const resultados = { creados: 0, errores: [] };

    for (const [i, row] of records.entries()) {
      const { nombre, email, password, rol } = row;
      if (!nombre || !email || !password || !rol) {
        resultados.errores.push({ fila: i + 2, error: 'Faltan campos obligatorios (nombre, email, password, rol)' });
        continue;
      }
      if (!rolesValidos.includes(rol)) {
        resultados.errores.push({ fila: i + 2, error: `Rol inválido: ${rol}` });
        continue;
      }
      if (req.usuario.rol === 'entrenador' && !['jugador', 'personal_salud'].includes(rol)) {
        resultados.errores.push({ fila: i + 2, error: 'Entrenador no puede crear este rol' });
        continue;
      }
      try {
        const salt = generateSalt();
        const hash = hashPassword(password, salt);
        await db.query(
          `INSERT INTO usuarios (nombre, email, password_hash, salt, rol)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (email) DO NOTHING`,
          [nombre, email.toLowerCase().trim(), hash, salt, rol]
        );
        resultados.creados++;
      } catch (err) {
        resultados.errores.push({ fila: i + 2, error: err.message });
      }
    }
    res.json(resultados);
  } catch (err) {
    res.status(500).json({ error: 'Error al procesar CSV: ' + err.message });
  }
};
