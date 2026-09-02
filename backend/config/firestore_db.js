/**
 * Adapter Firestore Universal para DTdeportivo
 * Emula la interfaz de db.query() y db.connect() de Node Postgres,
 * traduciendo operaciones SQL a Firestore de Google Cloud.
 * Persistencia serverless robusta, tipado seguro y soporte completo CRUD.
 */

const { getFirebaseFirestore } = require('./firebase');
const { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, writeBatch, runTransaction
} = require('firebase/firestore');

// Helper para limpiar valores undefined para Firestore
function sanitizeData(obj) {
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    clean[key] = value === undefined ? null : value;
  }
  return clean;
}

// Convertidor seguro a número entero
function toInt(val, fallback = null) {
  if (val === null || val === undefined || val === '') return fallback;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? fallback : parsed;
}

// Convertidor seguro a número flotante
function toFloat(val, fallback = null) {
  if (val === null || val === undefined || val === '') return fallback;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
}

// Generador de IDs secuenciales por colección en Firestore
async function getNextId(db, collectionName) {
  const counterRef = doc(db, '_counters', collectionName);
  try {
    const res = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let current = 0;
      if (counterDoc.exists()) {
        current = counterDoc.data().current || 0;
      }
      const next = current + 1;
      transaction.set(counterRef, { current: next }, { merge: true });
      return next;
    });
    return res;
  } catch (e) {
    // Fallback calculando el id máximo existente
    const snap = await getDocs(collection(db, collectionName));
    let maxId = 0;
    snap.forEach(d => {
      const id = parseInt(d.id, 10);
      if (!isNaN(id) && id > maxId) maxId = id;
    });
    return maxId + 1;
  }
}

// Inicialización de colecciones base y datos semilla si están vacíos
let isInitialized = false;
async function ensureInitialized(db) {
  if (isInitialized) return;

  try {
    const userSnap = await getDocs(collection(db, 'usuarios'));
    if (userSnap.empty) {
      console.log('🌱 Inicializando colecciones semilla en Firestore...');
      const crypto = require('crypto');
      function generateSalt() { return crypto.randomBytes(16).toString('hex'); }
      function hashPassword(pwd, salt) { return crypto.createHmac('sha256', salt).update(pwd).digest('hex'); }

      // 1. Disciplinas
      const sports = ['Rugby', 'Fútbol', 'Fútbol Sala', 'Baloncesto', 'Atletismo', 'Voleibol', 'Natación', 'Tenis', 'Hockey'];
      for (let i = 0; i < sports.length; i++) {
        await setDoc(doc(db, 'disciplinas', String(i + 1)), {
          id: i + 1,
          nombre: sports[i],
          created_at: new Date().toISOString()
        });
      }
      await setDoc(doc(db, '_counters', 'disciplinas'), { current: sports.length });

      // 2. Equipos
      const teams = [
        { id: 1, nombre: 'Los Cóndores', categoria: 'Primera División', descripcion: 'Equipo principal de Rugby', disciplina_id: 1, logo_url: null },
        { id: 2, nombre: 'Club Rugby Norte', categoria: 'Segunda División', descripcion: 'Equipo de desarrollo', disciplina_id: 1, logo_url: null }
      ];
      for (const t of teams) {
        await setDoc(doc(db, 'equipos', String(t.id)), { ...t, created_at: new Date().toISOString() });
      }
      await setDoc(doc(db, '_counters', 'equipos'), { current: teams.length });

      // 3. Jugadores
      const players = [
        { id: 1, nombre: 'Carlos Méndez', edad: 22, posicion: 'Penetrador', peso: 78.5, altura: 1.80, equipo_id: 1, disciplina_id: 1, foto_url: null },
        { id: 2, nombre: 'Luis García', edad: 25, posicion: 'Enlace', peso: 74.0, altura: 1.75, equipo_id: 1, disciplina_id: 1, foto_url: null },
        { id: 3, nombre: 'Pedro Ramírez', edad: 21, posicion: 'Wing', peso: 82.0, altura: 1.85, equipo_id: 1, disciplina_id: 1, foto_url: null },
        { id: 4, nombre: 'Andrés Torres', edad: 28, posicion: 'Trasportador', peso: 88.0, altura: 1.88, equipo_id: 1, disciplina_id: 1, foto_url: null },
        { id: 5, nombre: 'Miguel Flores', edad: 23, posicion: 'Forward', peso: 85.0, altura: 1.82, equipo_id: 1, disciplina_id: 1, foto_url: null }
      ];
      for (const p of players) {
        await setDoc(doc(db, 'jugadores', String(p.id)), { ...p, created_at: new Date().toISOString() });
      }
      await setDoc(doc(db, '_counters', 'jugadores'), { current: players.length });

      // 4. Usuarios
      const initialUsers = [
        { id: 1, nombre: 'Robinson Meza', email: 'robinson_meza@dtdeportivo.com', password: 'No4lkcqa..', rol: 'administrador', jugador_id: null },
        { id: 2, nombre: 'Cesar DT', email: 'cesar_dt@dtdeportivo.com', password: 'Cesar_2026..', rol: 'entrenador', jugador_id: null },
        { id: 3, nombre: 'Juan Moreno', email: 'juan_moreno@dtdeportivo.com', password: 'Tvsraider01.', rol: 'entrenador', jugador_id: null },
        { id: 4, nombre: 'Personal Salud', email: 'salud@dtdeportivo.com', password: 'Salud123!', rol: 'personal_salud', jugador_id: null },
        { id: 5, nombre: 'Jugador Demo', email: 'jugador@dtdeportivo.com', password: 'Jugador123!', rol: 'jugador', jugador_id: 1 }
      ];
      for (const u of initialUsers) {
        const salt = generateSalt();
        const hash = hashPassword(u.password, salt);
        await setDoc(doc(db, 'usuarios', String(u.id)), {
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          password_hash: hash,
          salt,
          rol: u.rol,
          jugador_id: u.jugador_id,
          activo: true,
          primer_login: false,
          created_at: new Date().toISOString()
        });
      }
      await setDoc(doc(db, '_counters', 'usuarios'), { current: initialUsers.length });

      // 5. Entrenamientos
      const trainings = [
        { id: 1, fecha: '2026-03-25', tipo: 'Resistencia', descripcion: 'Carrera continua 45 min + circuito' },
        { id: 2, fecha: '2026-03-27', tipo: 'Fuerza', descripcion: 'Pesas y ejercicios funcionales' },
        { id: 3, fecha: '2026-03-29', tipo: 'Táctica', descripcion: 'Prácticas de posicionamiento y pressing' }
      ];
      for (const tr of trainings) {
        await setDoc(doc(db, 'entrenamientos', String(tr.id)), { ...tr, created_at: new Date().toISOString() });
      }
      await setDoc(doc(db, '_counters', 'entrenamientos'), { current: trainings.length });

      // 6. Partidos
      const matches = [
        { id: 1, fecha: '2026-03-15', rival: 'Club Atlético Norte', tipo: 'liga', resultado: '2-1' },
        { id: 2, fecha: '2026-03-22', rival: 'Deportivo Sur', tipo: 'liga', resultado: '0-0' },
        { id: 3, fecha: '2026-04-05', rival: 'FC Estrella', tipo: 'amistoso', resultado: null }
      ];
      for (const m of matches) {
        await setDoc(doc(db, 'partidos', String(m.id)), { ...m, created_at: new Date().toISOString() });
      }
      await setDoc(doc(db, '_counters', 'partidos'), { current: matches.length });

      // 7. Antropometría
      const antros = [
        {
          id: 1, jugador_id: 1, fecha: '2026-01-15', peso: 80.0, estatura: 1.80, imc: 24.69,
          pliegue_biceps: 4.5, pliegue_triceps: 8.0, pliegue_subescapular: 9.5, pliegue_suprailiaco: 11.0, pliegue_supraespinal: 7.5, pliegue_abdominal: 12.0, pliegue_muslo_anterior: 10.5, pliegue_pierna_medial: 7.0,
          perimetro_brazo_relajado: 32.5, perimetro_brazo_contraido: 35.0, perimetro_muslo_medio: 56.0, perimetro_pierna: 37.5,
          diametro_humero: 6.8, diametro_muneca: 5.5, diametro_femur: 9.6,
          porcentaje_grasa: 12.8, masa_muscular_esqueletica: 38.5, masa_mineral_osea: 11.5, sumatoria_pliegues: 69.5,
          posicion_rugby: 'Penetrador', categoria: 'Primera', grupo: 'Delanteros',
          endomorfia: 2.8, mesomorfia: 5.2, ectomorfia: 2.1, x_somatocarta: -0.7, y_somatocarta: 5.5
        }
      ];
      for (const a of antros) {
        await setDoc(doc(db, 'antropometria', String(a.id)), { ...a, created_at: new Date().toISOString() });
      }
      await setDoc(doc(db, '_counters', 'antropometria'), { current: antros.length });

      console.log('✅ Base de datos Firestore inicializada y lista');
    }
    isInitialized = true;
  } catch (err) {
    console.error('Error during Firestore initialization:', err);
  }
}

/**
 * Normaliza nombres de colecciones en Firestore
 */
function normalizeCollectionName(name) {
  const n = (name || '').toLowerCase().trim();
  if (n === 'evaluaciones') return 'evaluaciones_rugby';
  return n;
}

/**
 * Motor SQL -> Firestore
 */
async function executeFirestoreQuery(text, params = []) {
  const db = getFirebaseFirestore();
  await ensureInitialized(db);

  const cleanText = text.replace(/\s+/g, ' ').trim();
  const lowerText = cleanText.toLowerCase();

  // Helper para leer colección completa en memoria
  async function getAllDocs(colName) {
    const snap = await getDocs(collection(db, normalizeCollectionName(colName)));
    const list = [];
    snap.forEach(d => {
      const data = d.data();
      const rawId = data.id !== undefined ? data.id : d.id;
      const numId = parseInt(rawId, 10);
      list.push({ ...data, id: isNaN(numId) ? rawId : numId });
    });
    return list;
  }

  // --- DDL Y TRANSACCIONES ---
  if (
    lowerText.startsWith('create table') || 
    lowerText.startsWith('alter table') || 
    lowerText.startsWith('do $$') || 
    lowerText.startsWith('grant') ||
    lowerText === 'begin' ||
    lowerText === 'commit' ||
    lowerText === 'rollback'
  ) {
    return { rows: [], rowCount: 0 };
  }

  // ==========================================
  // --- 1. GENERIC INSERT HANDLER ---
  // ==========================================
  const insertMatch = cleanText.match(/insert\s+into\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*values/i);
  if (insertMatch) {
    const tableName = normalizeCollectionName(insertMatch[1]);
    const columns = insertMatch[2].split(',').map(c => c.trim().toLowerCase());
    const id = await getNextId(db, tableName);
    
    const newDoc = { id, created_at: new Date().toISOString() };
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      let val = params[i] !== undefined ? params[i] : null;
      
      // Normalización de tipos numéricos comunes
      if (['jugador_id', 'equipo_id', 'disciplina_id', 'partido_id', 'entrenamiento_id', 'edad'].includes(col)) {
        val = toInt(val, null);
      } else if (['peso', 'altura', 'estatura', 'imc', 'porcentaje_grasa', 'masa_muscular_esqueletica', 'masa_mineral_osea', 'sumatoria_pliegues', 'endomorfia', 'mesomorfia', 'ectomorfia', 'x_somatocarta', 'y_somatocarta', 'goles', 'asistencias', 'minutos_jugados', 'sprint_30m', 'salto_vertical', 'resistencia_yoyo', 'score_velocidad', 'score_potencia', 'score_resistencia', 'score_grasa', 'score_musculo', 'score_general'].includes(col) || col.startsWith('pliegue_') || col.startsWith('perimetro_') || col.startsWith('diametro_')) {
        val = toFloat(val, null);
      } else if (col === 'asistencia') {
        val = Boolean(val);
      }
      
      newDoc[col] = val;
    }

    await setDoc(doc(db, tableName, String(id)), sanitizeData(newDoc));
    return { rows: [{ id, ...newDoc }], rowCount: 1 };
  }

  // ==========================================
  // --- 2. GENERIC UPDATE HANDLER ---
  // ==========================================
  if (lowerText.startsWith('update ')) {
    // Casos especiales de usuarios
    if (lowerText.includes('update usuarios')) {
      if (lowerText.includes('password_hash=$1') || lowerText.includes('password_hash = $1')) {
        const hash = params[0];
        const salt = params[1];
        const targetId = toInt(params[2]);
        const userRef = doc(db, 'usuarios', String(targetId));
        await updateDoc(userRef, { password_hash: hash, salt, primer_login: true });
        return { rows: [], rowCount: 1 };
      }
      if (lowerText.includes('activo=false') || lowerText.includes('activo = false')) {
        const targetId = toInt(params[0]);
        const userRef = doc(db, 'usuarios', String(targetId));
        await updateDoc(userRef, { activo: false });
        return { rows: [], rowCount: 1 };
      }
    }

    // Caso especial de desvincular jugadores de un equipo
    if (lowerText.includes('set equipo_id = null where equipo_id = $1') || lowerText.includes('set equipo_id=null where equipo_id=$1')) {
      const targetId = toInt(params[0]);
      const allPlayers = await getAllDocs('jugadores');
      for (const p of allPlayers) {
        if (toInt(p.equipo_id) === targetId) {
          await updateDoc(doc(db, 'jugadores', String(p.id)), { equipo_id: null });
        }
      }
      return { rows: [], rowCount: 1 };
    }

    // Actualizaciones directas por ID
    const updateTableMatch = cleanText.match(/update\s+([a-zA-Z0-9_]+)\s+set\s+(.+)\s+where\s+(.+)/i);
    if (updateTableMatch) {
      const tableName = normalizeCollectionName(updateTableMatch[1]);
      const setClause = updateTableMatch[2];
      const whereClause = updateTableMatch[3].toLowerCase();

      // Buscar si el WHERE filtra por ID
      if (whereClause.includes('id = $') || whereClause.includes('id=$')) {
        const targetId = toInt(params[params.length - 1]);
        if (targetId) {
          const assignments = setClause.split(',').map(s => s.trim());
          const updateData = {};
          
          assignments.forEach(assign => {
            const parts = assign.split('=').map(p => p.trim());
            if (parts.length === 2) {
              const colName = parts[0].toLowerCase();
              const paramIndexMatch = parts[1].match(/\$(\d+)/);
              if (paramIndexMatch) {
                const paramIdx = parseInt(paramIndexMatch[1], 10) - 1;
                let val = params[paramIdx] !== undefined ? params[paramIdx] : null;
                
                // Normalización de tipos
                if (['jugador_id', 'equipo_id', 'disciplina_id', 'partido_id', 'entrenamiento_id', 'edad'].includes(colName)) {
                  val = toInt(val, null);
                } else if (['peso', 'altura', 'estatura', 'imc', 'porcentaje_grasa', 'masa_muscular_esqueletica', 'masa_mineral_osea', 'sumatoria_pliegues', 'endomorfia', 'mesomorfia', 'ectomorfia', 'x_somatocarta', 'y_somatocarta', 'goles', 'asistencias', 'minutos_jugados'].includes(colName) || colName.startsWith('pliegue_') || colName.startsWith('perimetro_') || colName.startsWith('diametro_')) {
                  val = toFloat(val, null);
                } else if (colName === 'asistencia' || colName === 'activo') {
                  val = Boolean(val);
                }

                // Evitar sobrescribir con null si la query era COALESCE($X, col)
                if (parts[1].toLowerCase().includes('coalesce') && (val === null || val === undefined)) {
                  // do nothing
                } else {
                  updateData[colName] = val;
                }
              }
            }
          });

          const docRef = doc(db, tableName, String(targetId));
          await setDoc(docRef, sanitizeData(updateData), { merge: true });
          return { rows: [], rowCount: 1 };
        }
      }
    }

    return { rows: [], rowCount: 1 };
  }

  // ==========================================
  // --- 3. GENERIC DELETE HANDLER ---
  // ==========================================
  if (lowerText.startsWith('delete from')) {
    const deleteMatch = cleanText.match(/delete\s+from\s+([a-zA-Z0-9_]+)\s+where\s+(.+)/i);
    if (deleteMatch) {
      const tableName = normalizeCollectionName(deleteMatch[1]);
      const whereClause = deleteMatch[2].toLowerCase();

      // Borrado por ID: DELETE FROM <table> WHERE id = $1
      if (whereClause.includes('id = $1') || whereClause.includes('id=$1')) {
        const targetId = toInt(params[0]);
        if (targetId) {
          await deleteDoc(doc(db, tableName, String(targetId)));

          // Cascadas lógicas para integridad referencial
          if (tableName === 'jugadores') {
            // Borrar antropometría, evaluaciones, asistencias, lesiones, estadísticas del jugador
            const childTables = ['antropometria', 'evaluaciones_rugby', 'asistencia_entrenamiento', 'estadisticas_jugador', 'lesiones'];
            for (const ct of childTables) {
              const childDocs = await getAllDocs(ct);
              for (const cd of childDocs) {
                if (toInt(cd.jugador_id) === targetId) {
                  await deleteDoc(doc(db, ct, String(cd.id)));
                }
              }
            }
            // Desvincular usuario si estaba asignado a este jugador
            const users = await getAllDocs('usuarios');
            for (const u of users) {
              if (toInt(u.jugador_id) === targetId) {
                await updateDoc(doc(db, 'usuarios', String(u.id)), { jugador_id: null });
              }
            }
          }

          if (tableName === 'equipos') {
            // Desvincular jugadores asignados al equipo
            const players = await getAllDocs('jugadores');
            for (const p of players) {
              if (toInt(p.equipo_id) === targetId) {
                await updateDoc(doc(db, 'jugadores', String(p.id)), { equipo_id: null });
              }
            }
          }

          if (tableName === 'entrenamientos') {
            // Borrar asistencias del entrenamiento
            const asistencias = await getAllDocs('asistencia_entrenamiento');
            for (const a of asistencias) {
              if (toInt(a.entrenamiento_id) === targetId) {
                await deleteDoc(doc(db, 'asistencia_entrenamiento', String(a.id)));
              }
            }
          }

          if (tableName === 'partidos') {
            // Borrar estadísticas del partido
            const stats = await getAllDocs('estadisticas_jugador');
            for (const s of stats) {
              if (toInt(s.partido_id) === targetId) {
                await deleteDoc(doc(db, 'estadisticas_jugador', String(s.id)));
              }
            }
          }

          return { rows: [], rowCount: 1 };
        }
      }

      // Borrado por clave foránea (ej. WHERE entrenamiento_id = $1)
      if (whereClause.includes('entrenamiento_id = $1') || whereClause.includes('entrenamiento_id=$1')) {
        const targetId = toInt(params[0]);
        const list = await getAllDocs(tableName);
        for (const item of list) {
          if (toInt(item.entrenamiento_id) === targetId) {
            await deleteDoc(doc(db, tableName, String(item.id)));
          }
        }
        return { rows: [], rowCount: 1 };
      }
    }

    return { rows: [], rowCount: 1 };
  }

  // ==========================================
  // --- 4. SELECT / READ QUERIES ---
  // ==========================================

  // --- 4.1 USUARIOS ---
  if (lowerText.includes('from usuarios')) {
    const allUsers = await getAllDocs('usuarios');

    if (lowerText.includes('where id = $1') || lowerText.includes('where id=$1')) {
      const targetId = toInt(params[0]);
      const rows = allUsers.filter(u => toInt(u.id) === targetId);
      return { rows, rowCount: rows.length };
    }

    if (lowerText.includes('where email = $1') || lowerText.includes('where lower(email) = $1')) {
      const email = String(params[0]).toLowerCase().trim();
      const rows = allUsers.filter(u => u.email && u.email.toLowerCase().trim() === email);
      return { rows, rowCount: rows.length };
    }

    if (lowerText.includes('lower(email) = $1') || lowerText.includes('regexp_replace')) {
      const term1 = params[0] ? String(params[0]).toLowerCase().trim() : '';
      const term2 = params[1] ? String(params[1]).toLowerCase().trim() : '';
      const termClean = params[2] ? String(params[2]).toLowerCase().replace(/[\s_.-]+/g, '') : term1.replace(/[\s_.-]+/g, '');

      const rows = allUsers.filter(u => {
        if (u.activo === false) return false;
        const uEmail = (u.email || '').toLowerCase().trim();
        const uNombre = (u.nombre || '').toLowerCase().trim();
        const uEmailClean = uEmail.replace(/[\s_.-]+/g, '');
        const uNombreClean = uNombre.replace(/[\s_.-]+/g, '');

        return (
          uEmail === term1 ||
          uEmail === term2 ||
          uNombre === term1 ||
          uEmailClean === termClean ||
          uNombreClean === termClean
        );
      });
      return { rows, rowCount: rows.length };
    }

    allUsers.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return { rows: allUsers, rowCount: allUsers.length };
  }

  // --- 4.2 DISCIPLINAS ---
  if (lowerText.includes('from disciplinas')) {
    const list = await getAllDocs('disciplinas');
    if (lowerText.includes('where lower(nombre) = lower($1)')) {
      const name = String(params[0]).toLowerCase().trim();
      const rows = list.filter(d => (d.nombre || '').toLowerCase().trim() === name);
      return { rows, rowCount: rows.length };
    }
    list.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    return { rows: list, rowCount: list.length };
  }

  // --- 4.3 EQUIPOS ---
  if (lowerText.includes('from equipos')) {
    const equipos = await getAllDocs('equipos');
    const disciplinas = await getAllDocs('disciplinas');
    const jugadores = await getAllDocs('jugadores');

    const mapped = equipos.map(e => {
      const disc = disciplinas.find(d => toInt(d.id) === toInt(e.disciplina_id));
      const totalJug = jugadores.filter(j => toInt(j.equipo_id) === toInt(e.id)).length;
      return {
        ...e,
        disciplina_nombre: disc ? disc.nombre : null,
        total_jugadores: totalJug
      };
    });

    if (lowerText.includes('where e.id = $1') || lowerText.includes('where id = $1') || lowerText.includes('where id=$1')) {
      const targetId = toInt(params[0]);
      const rows = mapped.filter(e => toInt(e.id) === targetId);
      return { rows, rowCount: rows.length };
    }
    if (lowerText.includes('where lower(nombre) = lower($1)')) {
      const name = String(params[0]).toLowerCase().trim();
      const rows = mapped.filter(e => (e.nombre || '').toLowerCase().trim() === name);
      return { rows, rowCount: rows.length };
    }
    if (lowerText.includes('where e.disciplina_id = $1') || lowerText.includes('where disciplina_id = $1')) {
      const discId = toInt(params[0]);
      const rows = mapped.filter(e => toInt(e.disciplina_id) === discId);
      rows.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      return { rows, rowCount: rows.length };
    }

    mapped.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    return { rows: mapped, rowCount: mapped.length };
  }

  // --- 4.4 JUGADORES ---
  if (lowerText.includes('from jugadores')) {
    const jugadores = await getAllDocs('jugadores');
    const equipos = await getAllDocs('equipos');
    const disciplinas = await getAllDocs('disciplinas');

    const mapped = jugadores.map(j => {
      const eq = equipos.find(e => toInt(e.id) === toInt(j.equipo_id));
      const disc = disciplinas.find(d => toInt(d.id) === toInt(j.disciplina_id));
      return {
        ...j,
        equipo_nombre: eq ? eq.nombre : null,
        disciplina_nombre: disc ? disc.nombre : null
      };
    });

    if (lowerText.includes('select count(*)')) {
      let filtered = mapped;
      if (params.length > 0 && params[0]) {
        filtered = mapped.filter(j => toInt(j.disciplina_id) === toInt(params[0]));
      }
      return { rows: [{ total: filtered.length }], rowCount: 1 };
    }

    if (lowerText.includes('where j.id = $1') || lowerText.includes('where id = $1') || lowerText.includes('where id=$1')) {
      const targetId = toInt(params[0]);
      const rows = mapped.filter(j => toInt(j.id) === targetId);
      return { rows, rowCount: rows.length };
    }

    if (lowerText.includes('where j.equipo_id = $1') || lowerText.includes('where equipo_id = $1')) {
      const targetId = toInt(params[0]);
      const rows = mapped.filter(j => toInt(j.equipo_id) === targetId);
      rows.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      return { rows, rowCount: rows.length };
    }

    if (lowerText.includes('where j.disciplina_id = $1') || lowerText.includes('where disciplina_id = $1')) {
      const discId = toInt(params[0]);
      const rows = mapped.filter(j => toInt(j.disciplina_id) === discId);
      rows.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      return { rows, rowCount: rows.length };
    }

    mapped.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    return { rows: mapped, rowCount: mapped.length };
  }

  // --- 4.5 ENTRENAMIENTOS ---
  if (lowerText.includes('from entrenamientos')) {
    const list = await getAllDocs('entrenamientos');
    if (lowerText.includes('select count(*)')) {
      return { rows: [{ total: list.length }], rowCount: 1 };
    }
    if (lowerText.includes('where id = $1') || lowerText.includes('where id=$1')) {
      const targetId = toInt(params[0]);
      const rows = list.filter(e => toInt(e.id) === targetId);
      return { rows, rowCount: rows.length };
    }
    list.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    if (lowerText.includes('limit 5')) {
      return { rows: list.slice(0, 5), rowCount: Math.min(5, list.length) };
    }
    return { rows: list, rowCount: list.length };
  }

  // --- 4.6 ASISTENCIA ---
  if (lowerText.includes('from asistencia_entrenamiento')) {
    const asistencias = await getAllDocs('asistencia_entrenamiento');
    const jugadores = await getAllDocs('jugadores');
    const entrenamientos = await getAllDocs('entrenamientos');

    const mapped = asistencias.map(a => {
      const jug = jugadores.find(j => toInt(j.id) === toInt(a.jugador_id));
      const ent = entrenamientos.find(e => toInt(e.id) === toInt(a.entrenamiento_id));
      return {
        ...a,
        jugador_nombre: jug ? jug.nombre : null,
        posicion: jug ? jug.posicion : null,
        foto_url: jug ? jug.foto_url : null,
        entrenamiento_tipo: ent ? ent.tipo : null,
        fecha: ent ? ent.fecha : null
      };
    });

    if (lowerText.includes('where ae.entrenamiento_id = $1') || lowerText.includes('where entrenamiento_id = $1') || lowerText.includes('where a.entrenamiento_id = $1')) {
      const targetId = toInt(params[0]);
      const rows = mapped.filter(a => toInt(a.entrenamiento_id) === targetId);
      return { rows, rowCount: rows.length };
    }
    return { rows: mapped, rowCount: mapped.length };
  }

  // --- 4.7 PARTIDOS ---
  if (lowerText.includes('from partidos')) {
    const list = await getAllDocs('partidos');
    if (lowerText.includes('select count(*)')) {
      return { rows: [{ total: list.length }], rowCount: 1 };
    }
    if (lowerText.includes('where id = $1') || lowerText.includes('where id=$1')) {
      const targetId = toInt(params[0]);
      const rows = list.filter(p => toInt(p.id) === targetId);
      return { rows, rowCount: rows.length };
    }
    if (lowerText.includes('where fecha >=')) {
      const today = new Date().toISOString().split('T')[0];
      const rows = list.filter(p => p.fecha >= today);
      rows.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
      return { rows: rows.slice(0, 5), rowCount: Math.min(5, rows.length) };
    }
    list.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    return { rows: list, rowCount: list.length };
  }

  // --- 4.8 ESTADISTICAS JUGADOR ---
  if (lowerText.includes('from estadisticas_jugador')) {
    const stats = await getAllDocs('estadisticas_jugador');
    const jugadores = await getAllDocs('jugadores');
    const partidos = await getAllDocs('partidos');
    const disciplinas = await getAllDocs('disciplinas');

    const mapped = stats.map(s => {
      const j = jugadores.find(jug => toInt(jug.id) === toInt(s.jugador_id));
      const p = partidos.find(part => toInt(part.id) === toInt(s.partido_id));
      const d = j ? disciplinas.find(disc => toInt(disc.id) === toInt(j.disciplina_id)) : null;
      return {
        ...s,
        jugador_nombre: j ? j.nombre : null,
        nombre: j ? j.nombre : null,
        disciplina_id: j ? j.disciplina_id : null,
        disciplina_nombre: d ? d.nombre : null,
        rival: p ? p.rival : null,
        partido_fecha: p ? p.fecha : null,
        partido_tipo: p ? p.tipo : null,
        fecha: p ? p.fecha : null
      };
    });

    if (lowerText.includes('where es.jugador_id = $1') || lowerText.includes('where jugador_id = $1')) {
      const targetId = toInt(params[0]);
      const rows = mapped.filter(s => toInt(s.jugador_id) === targetId);
      return { rows, rowCount: rows.length };
    }

    if (lowerText.includes('group by') || lowerText.includes('top_anotadores')) {
      const grouped = {};
      mapped.forEach(s => {
        const jId = s.jugador_id;
        if (!grouped[jId]) {
          grouped[jId] = {
            jugador_id: jId,
            nombre: s.nombre,
            disciplina_id: s.disciplina_id,
            disciplina_nombre: s.disciplina_nombre,
            total_anotaciones: 0,
            total_asistencias: 0
          };
        }
        grouped[jId].total_anotaciones += (s.goles || 0);
        grouped[jId].total_asistencias += (s.asistencias || 0);
      });
      let rows = Object.values(grouped);
      if (params.length > 0 && params[0]) {
        rows = rows.filter(r => toInt(r.disciplina_id) === toInt(params[0]));
      }
      rows.sort((a, b) => b.total_anotaciones - a.total_anotaciones || b.total_asistencias - a.total_asistencias);
      return { rows: rows.slice(0, 5), rowCount: Math.min(5, rows.length) };
    }

    return { rows: mapped, rowCount: mapped.length };
  }

  // --- 4.9 LESIONES ---
  if (lowerText.includes('from lesiones')) {
    const lesiones = await getAllDocs('lesiones');
    const jugadores = await getAllDocs('jugadores');

    const mapped = lesiones.map(l => {
      const j = jugadores.find(jug => toInt(jug.id) === toInt(l.jugador_id));
      return {
        ...l,
        jugador_nombre: j ? j.nombre : null,
        disciplina_id: j ? j.disciplina_id : null
      };
    });

    if (lowerText.includes('select count(l.id)') || lowerText.includes('select count(*)')) {
      let active = mapped.filter(l => !l.fecha_fin);
      if (params.length > 0 && params[0]) {
        active = active.filter(l => toInt(l.disciplina_id) === toInt(params[0]));
      }
      return { rows: [{ total: active.length }], rowCount: 1 };
    }

    if (lowerText.includes('where l.jugador_id = $1') || lowerText.includes('where jugador_id = $1')) {
      const targetId = toInt(params[0]);
      const rows = mapped.filter(l => toInt(l.jugador_id) === targetId);
      return { rows, rowCount: rows.length };
    }

    mapped.sort((a, b) => (b.fecha_inicio || '').localeCompare(a.fecha_inicio || ''));
    return { rows: mapped, rowCount: mapped.length };
  }

  // --- 4.10 EVALUACIONES FÍSICAS & RUGBY ---
  if (lowerText.includes('from evaluaciones_rugby') || lowerText.includes('from evaluaciones')) {
    const list = await getAllDocs('evaluaciones_rugby');
    const jugadores = await getAllDocs('jugadores');
    const mapped = list.map(e => {
      const j = jugadores.find(jug => toInt(jug.id) === toInt(e.jugador_id));
      return { ...e, jugador_nombre: j ? j.nombre : null };
    });

    if (lowerText.includes('where e.jugador_id = $1') || lowerText.includes('where jugador_id = $1')) {
      const targetId = toInt(params[0]);
      const rows = mapped.filter(e => toInt(e.jugador_id) === targetId);
      rows.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
      if (lowerText.includes('limit 1')) return { rows: rows.slice(0, 1), rowCount: Math.min(1, rows.length) };
      return { rows, rowCount: rows.length };
    }
    mapped.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    return { rows: mapped, rowCount: mapped.length };
  }

  // --- 4.11 ANTROPOMETRIA ---
  if (lowerText.includes('from antropometria')) {
    const list = await getAllDocs('antropometria');
    const jugadores = await getAllDocs('jugadores');

    const mapped = list.map(a => {
      const j = jugadores.find(jug => toInt(jug.id) === toInt(a.jugador_id));
      return { ...a, jugador_nombre: j ? j.nombre : null };
    });

    if (lowerText.includes('where jugador_id = $1') || lowerText.includes('where a.jugador_id = $1')) {
      const targetId = toInt(params[0]);
      const rows = mapped.filter(a => toInt(a.jugador_id) === targetId);
      rows.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
      if (lowerText.includes('limit 1')) return { rows: rows.slice(0, 1), rowCount: Math.min(1, rows.length) };
      return { rows, rowCount: rows.length };
    }
    mapped.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    return { rows: mapped, rowCount: mapped.length };
  }

  // Fallback por defecto para consultas no interceptadas
  return { rows: [], rowCount: 0 };
}

// Interfaz compatible con Pool de Postgres
const dbAdapter = {
  query: async (text, params = []) => {
    return executeFirestoreQuery(text, params);
  },
  connect: async () => {
    return {
      query: async (text, params = []) => executeFirestoreQuery(text, params),
      release: () => {}
    };
  }
};

module.exports = dbAdapter;
