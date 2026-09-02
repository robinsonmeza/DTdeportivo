/**
 * Adapter Firestore para DTdeportivo
 * Emula la interfaz de db.query() y db.connect() de Node Postgres,
 * traduciendo operaciones SQL a Firestore de Google Cloud.
 * Esto permite persistencia 100% serverless y cloud en Firebase/Firestore
 * sin requerir servidores PostgreSQL externos propensos a desconexión.
 */

const { getFirebaseFirestore } = require('./firebase');
const { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, writeBatch, runTransaction
} = require('firebase/firestore');

// Helper to sanitize undefined values for Firestore
function sanitizeData(obj) {
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    clean[key] = value === undefined ? null : value;
  }
  return clean;
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
    // Fallback con max ID
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
 * Motor SQL -> Firestore
 */
async function executeFirestoreQuery(text, params = []) {
  const db = getFirebaseFirestore();
  await ensureInitialized(db);

  const cleanText = text.replace(/\s+/g, ' ').trim();
  const lowerText = cleanText.toLowerCase();

  // Helper para leer colección completa en memoria para JOINs y agregaciones
  async function getAllDocs(colName) {
    const snap = await getDocs(collection(db, colName));
    const list = [];
    snap.forEach(d => {
      const data = d.data();
      list.push({ ...data, id: data.id !== undefined ? data.id : (isNaN(d.id) ? d.id : parseInt(d.id, 10)) });
    });
    return list;
  }

  // --- DDL IGNORED ---
  if (lowerText.startsWith('create table') || lowerText.startsWith('alter table') || lowerText.startsWith('do $$') || lowerText.startsWith('grant')) {
    return { rows: [], rowCount: 0 };
  }

  // --- 1. SELECT USUARIOS (Login & Auth) ---
  if (lowerText.includes('from usuarios')) {
    const allUsers = await getAllDocs('usuarios');

    // Filter by ID
    if (lowerText.includes('where id = $1') || lowerText.includes('where id=$1')) {
      const targetId = parseInt(params[0], 10);
      const rows = allUsers.filter(u => u.id === targetId);
      return { rows, rowCount: rows.length };
    }

    // Filter by Email exact
    if (lowerText.includes('where email = $1') || lowerText.includes('where lower(email) = $1')) {
      const email = String(params[0]).toLowerCase().trim();
      const rows = allUsers.filter(u => u.email && u.email.toLowerCase().trim() === email);
      return { rows, rowCount: rows.length };
    }

    // Multi-criteria login search
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

    // List all
    allUsers.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return { rows: allUsers, rowCount: allUsers.length };
  }

  // --- 2. INSERT USUARIOS ---
  if (lowerText.startsWith('insert into usuarios')) {
    const id = await getNextId(db, 'usuarios');
    // ($1,$2,$3,$4,$5,...)
    const nombre = params[0];
    const email = params[1];
    const password_hash = params[2];
    const salt = params[3];
    const rol = params[4];
    const jugador_id = params[5] ? parseInt(params[5], 10) : null;

    const newObj = {
      id,
      nombre,
      email: email ? email.toLowerCase().trim() : '',
      password_hash,
      salt,
      rol,
      jugador_id,
      activo: true,
      primer_login: true,
      created_at: new Date().toISOString()
    };
    await setDoc(doc(db, 'usuarios', String(id)), sanitizeData(newObj));
    return { rows: [{ id }], rowCount: 1 };
  }

  // --- 3. UPDATE USUARIOS ---
  if (lowerText.startsWith('update usuarios')) {
    const allUsers = await getAllDocs('usuarios');
    if (lowerText.includes('password_hash=$1')) {
      const hash = params[0];
      const salt = params[1];
      const targetId = parseInt(params[2], 10);
      const userRef = doc(db, 'usuarios', String(targetId));
      await updateDoc(userRef, { password_hash: hash, salt, primer_login: true });
      return { rows: [], rowCount: 1 };
    }
    if (lowerText.includes('activo=false')) {
      const targetId = parseInt(params[0], 10);
      const userRef = doc(db, 'usuarios', String(targetId));
      await updateDoc(userRef, { activo: false });
      return { rows: [], rowCount: 1 };
    }
    if (lowerText.includes('set nombre=$1, email=$2, rol=$3')) {
      const nombre = params[0];
      const email = params[1];
      const rol = params[2];
      const jugador_id = params[3] ? parseInt(params[3], 10) : null;
      const activo = params[4] ?? true;
      const targetId = parseInt(params[5], 10);
      const userRef = doc(db, 'usuarios', String(targetId));
      await updateDoc(userRef, sanitizeData({ nombre, email, rol, jugador_id, activo }));
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 1 };
  }

  // --- 4. DISCIPLINAS ---
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

  if (lowerText.startsWith('insert into disciplinas')) {
    const id = await getNextId(db, 'disciplinas');
    const nombre = params[0];
    await setDoc(doc(db, 'disciplinas', String(id)), {
      id,
      nombre,
      created_at: new Date().toISOString()
    });
    return { rows: [{ id }], rowCount: 1 };
  }

  // --- 5. EQUIPOS ---
  if (lowerText.includes('from equipos')) {
    const equipos = await getAllDocs('equipos');
    const disciplinas = await getAllDocs('disciplinas');
    const jugadores = await getAllDocs('jugadores');

    const mapped = equipos.map(e => {
      const disc = disciplinas.find(d => d.id === e.disciplina_id);
      const totalJug = jugadores.filter(j => j.equipo_id === e.id).length;
      return {
        ...e,
        disciplina_nombre: disc ? disc.nombre : null,
        total_jugadores: totalJug
      };
    });

    if (lowerText.includes('where e.id = $1') || lowerText.includes('where id = $1')) {
      const targetId = parseInt(params[0], 10);
      const rows = mapped.filter(e => e.id === targetId);
      return { rows, rowCount: rows.length };
    }
    if (lowerText.includes('where lower(nombre) = lower($1)')) {
      const name = String(params[0]).toLowerCase().trim();
      const rows = mapped.filter(e => (e.nombre || '').toLowerCase().trim() === name);
      return { rows, rowCount: rows.length };
    }
    if (lowerText.includes('where e.disciplina_id = $1')) {
      const discId = parseInt(params[0], 10);
      const rows = mapped.filter(e => e.disciplina_id === discId);
      rows.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      return { rows, rowCount: rows.length };
    }

    mapped.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    return { rows: mapped, rowCount: mapped.length };
  }

  if (lowerText.startsWith('insert into equipos')) {
    const id = await getNextId(db, 'equipos');
    const nombre = params[0];
    const categoria = params[1] || null;
    const descripcion = params[2] || null;
    const disciplina_id = params[3] ? parseInt(params[3], 10) : null;
    const logo_url = params[4] || null;

    const newTeam = { id, nombre, categoria, descripcion, disciplina_id, logo_url, created_at: new Date().toISOString() };
    await setDoc(doc(db, 'equipos', String(id)), sanitizeData(newTeam));
    return { rows: [{ id }], rowCount: 1 };
  }

  if (lowerText.startsWith('update equipos')) {
    if (lowerText.includes('logo_url = $1 where id = $2')) {
      const logo_url = params[0];
      const targetId = parseInt(params[1], 10);
      await updateDoc(doc(db, 'equipos', String(targetId)), { logo_url });
      return { rows: [], rowCount: 1 };
    }
    const nombre = params[0];
    const categoria = params[1] || null;
    const descripcion = params[2] || null;
    const disciplina_id = params[3] ? parseInt(params[3], 10) : null;
    const logo_url = params[4] || null;
    const targetId = parseInt(params[5], 10);

    const dataToUpdate = { nombre, categoria, descripcion, disciplina_id };
    if (logo_url) dataToUpdate.logo_url = logo_url;
    await updateDoc(doc(db, 'equipos', String(targetId)), sanitizeData(dataToUpdate));
    return { rows: [], rowCount: 1 };
  }

  if (lowerText.startsWith('delete from equipos')) {
    const targetId = parseInt(params[0], 10);
    await deleteDoc(doc(db, 'equipos', String(targetId)));
    return { rows: [], rowCount: 1 };
  }

  // --- 6. JUGADORES ---
  if (lowerText.includes('from jugadores')) {
    const jugadores = await getAllDocs('jugadores');
    const equipos = await getAllDocs('equipos');
    const disciplinas = await getAllDocs('disciplinas');

    const mapped = jugadores.map(j => {
      const eq = equipos.find(e => e.id === j.equipo_id);
      const disc = disciplinas.find(d => d.id === j.disciplina_id);
      return {
        ...j,
        equipo_nombre: eq ? eq.nombre : null,
        disciplina_nombre: disc ? disc.nombre : null
      };
    });

    if (lowerText.includes('select count(*)')) {
      let filtered = mapped;
      if (params.length > 0 && params[0]) {
        filtered = mapped.filter(j => j.disciplina_id === parseInt(params[0], 10));
      }
      return { rows: [{ total: filtered.length }], rowCount: 1 };
    }

    if (lowerText.includes('where j.id = $1') || lowerText.includes('where id = $1')) {
      const targetId = parseInt(params[0], 10);
      const rows = mapped.filter(j => j.id === targetId);
      return { rows, rowCount: rows.length };
    }

    if (lowerText.includes('where j.equipo_id = $1') || lowerText.includes('where equipo_id = $1')) {
      const targetId = parseInt(params[0], 10);
      const rows = mapped.filter(j => j.equipo_id === targetId);
      rows.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      return { rows, rowCount: rows.length };
    }

    if (lowerText.includes('where j.disciplina_id = $1') || lowerText.includes('where disciplina_id = $1')) {
      const discId = parseInt(params[0], 10);
      const rows = mapped.filter(j => j.disciplina_id === discId);
      rows.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      return { rows, rowCount: rows.length };
    }

    mapped.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    return { rows: mapped, rowCount: mapped.length };
  }

  if (lowerText.startsWith('insert into jugadores')) {
    const id = await getNextId(db, 'jugadores');
    const nombre = params[0];
    const edad = params[1] ? parseInt(params[1], 10) : null;
    const posicion = params[2] || null;
    const peso = params[3] ? parseFloat(params[3]) : null;
    const altura = params[4] ? parseFloat(params[4]) : null;
    const equipo_id = params[5] ? parseInt(params[5], 10) : null;
    const disciplina_id = params[6] ? parseInt(params[6], 10) : null;

    const newJug = {
      id, nombre, edad, posicion, peso, altura, equipo_id, disciplina_id, foto_url: null,
      created_at: new Date().toISOString()
    };
    await setDoc(doc(db, 'jugadores', String(id)), sanitizeData(newJug));
    return { rows: [{ id }], rowCount: 1 };
  }

  if (lowerText.startsWith('update jugadores')) {
    if (lowerText.includes('foto_url = $1 where id = $2')) {
      const foto_url = params[0];
      const targetId = parseInt(params[1], 10);
      await updateDoc(doc(db, 'jugadores', String(targetId)), { foto_url });
      return { rows: [], rowCount: 1 };
    }
    if (lowerText.includes('set equipo_id = null where equipo_id = $1')) {
      const targetId = parseInt(params[0], 10);
      const all = await getAllDocs('jugadores');
      for (const j of all) {
        if (j.equipo_id === targetId) {
          await updateDoc(doc(db, 'jugadores', String(j.id)), { equipo_id: null });
        }
      }
      return { rows: [], rowCount: 1 };
    }
    const nombre = params[0];
    const edad = params[1] ? parseInt(params[1], 10) : null;
    const posicion = params[2] || null;
    const peso = params[3] ? parseFloat(params[3]) : null;
    const altura = params[4] ? parseFloat(params[4]) : null;
    const equipo_id = params[5] ? parseInt(params[5], 10) : null;
    const disciplina_id = params[6] ? parseInt(params[6], 10) : null;
    const targetId = parseInt(params[7], 10);

    await updateDoc(doc(db, 'jugadores', String(targetId)), sanitizeData({
      nombre, edad, posicion, peso, altura, equipo_id, disciplina_id
    }));
    return { rows: [], rowCount: 1 };
  }

  if (lowerText.startsWith('delete from jugadores')) {
    const targetId = parseInt(params[0], 10);
    await deleteDoc(doc(db, 'jugadores', String(targetId)));
    return { rows: [], rowCount: 1 };
  }

  // --- 7. ENTRENAMIENTOS ---
  if (lowerText.includes('from entrenamientos')) {
    const list = await getAllDocs('entrenamientos');
    if (lowerText.includes('select count(*)')) {
      return { rows: [{ total: list.length }], rowCount: 1 };
    }
    if (lowerText.includes('where id = $1')) {
      const targetId = parseInt(params[0], 10);
      const rows = list.filter(e => e.id === targetId);
      return { rows, rowCount: rows.length };
    }
    list.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    if (lowerText.includes('limit 5')) {
      return { rows: list.slice(0, 5), rowCount: Math.min(5, list.length) };
    }
    return { rows: list, rowCount: list.length };
  }

  if (lowerText.startsWith('insert into entrenamientos')) {
    const id = await getNextId(db, 'entrenamientos');
    const fecha = params[0];
    const tipo = params[1];
    const descripcion = params[2] || null;
    const newTr = { id, fecha, tipo, descripcion, created_at: new Date().toISOString() };
    await setDoc(doc(db, 'entrenamientos', String(id)), sanitizeData(newTr));
    return { rows: [{ id, ...newTr }], rowCount: 1 };
  }

  if (lowerText.startsWith('update entrenamientos')) {
    const fecha = params[0];
    const tipo = params[1];
    const descripcion = params[2] || null;
    const targetId = parseInt(params[3], 10);
    await updateDoc(doc(db, 'entrenamientos', String(targetId)), sanitizeData({ fecha, tipo, descripcion }));
    return { rows: [], rowCount: 1 };
  }

  if (lowerText.startsWith('delete from entrenamientos')) {
    const targetId = parseInt(params[0], 10);
    await deleteDoc(doc(db, 'entrenamientos', String(targetId)));
    return { rows: [], rowCount: 1 };
  }

  // --- 8. ASISTENCIA ---
  if (lowerText.includes('from asistencia_entrenamiento')) {
    const asistencias = await getAllDocs('asistencia_entrenamiento');
    const jugadores = await getAllDocs('jugadores');

    const mapped = asistencias.map(a => {
      const jug = jugadores.find(j => j.id === a.jugador_id);
      return {
        ...a,
        jugador_nombre: jug ? jug.nombre : null,
        posicion: jug ? jug.posicion : null,
        foto_url: jug ? jug.foto_url : null
      };
    });

    if (lowerText.includes('where entrenamiento_id = $1') || lowerText.includes('where a.entrenamiento_id = $1')) {
      const targetId = parseInt(params[0], 10);
      const rows = mapped.filter(a => a.entrenamiento_id === targetId);
      return { rows, rowCount: rows.length };
    }
    return { rows: mapped, rowCount: mapped.length };
  }

  if (lowerText.startsWith('insert into asistencia_entrenamiento')) {
    const id = await getNextId(db, 'asistencia_entrenamiento');
    const jugador_id = parseInt(params[0], 10);
    const entrenamiento_id = parseInt(params[1], 10);
    const asistencia = Boolean(params[2]);
    const estado = params[3] || 'presente';

    const newObj = { id, jugador_id, entrenamiento_id, asistencia, estado, created_at: new Date().toISOString() };
    await setDoc(doc(db, 'asistencia_entrenamiento', String(id)), sanitizeData(newObj));
    return { rows: [{ id }], rowCount: 1 };
  }

  if (lowerText.startsWith('delete from asistencia_entrenamiento where entrenamiento_id = $1')) {
    const targetId = parseInt(params[0], 10);
    const list = await getAllDocs('asistencia_entrenamiento');
    for (const a of list) {
      if (a.entrenamiento_id === targetId) {
        await deleteDoc(doc(db, 'asistencia_entrenamiento', String(a.id)));
      }
    }
    return { rows: [], rowCount: 1 };
  }

  // --- 9. PARTIDOS ---
  if (lowerText.includes('from partidos')) {
    const list = await getAllDocs('partidos');
    if (lowerText.includes('select count(*)')) {
      return { rows: [{ total: list.length }], rowCount: 1 };
    }
    if (lowerText.includes('where id = $1')) {
      const targetId = parseInt(params[0], 10);
      const rows = list.filter(p => p.id === targetId);
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

  if (lowerText.startsWith('insert into partidos')) {
    const id = await getNextId(db, 'partidos');
    const fecha = params[0];
    const rival = params[1];
    const tipo = params[2];
    const resultado = params[3] || null;
    const newP = { id, fecha, rival, tipo, resultado, created_at: new Date().toISOString() };
    await setDoc(doc(db, 'partidos', String(id)), sanitizeData(newP));
    return { rows: [{ id, ...newP }], rowCount: 1 };
  }

  if (lowerText.startsWith('update partidos')) {
    const fecha = params[0];
    const rival = params[1];
    const tipo = params[2];
    const resultado = params[3] || null;
    const targetId = parseInt(params[4], 10);
    await updateDoc(doc(db, 'partidos', String(targetId)), sanitizeData({ fecha, rival, tipo, resultado }));
    return { rows: [], rowCount: 1 };
  }

  if (lowerText.startsWith('delete from partidos')) {
    const targetId = parseInt(params[0], 10);
    await deleteDoc(doc(db, 'partidos', String(targetId)));
    return { rows: [], rowCount: 1 };
  }

  // --- 10. ESTADISTICAS JUGADOR ---
  if (lowerText.includes('from estadisticas_jugador')) {
    const stats = await getAllDocs('estadisticas_jugador');
    const jugadores = await getAllDocs('jugadores');
    const partidos = await getAllDocs('partidos');
    const disciplinas = await getAllDocs('disciplinas');

    const mapped = stats.map(s => {
      const j = jugadores.find(jug => jug.id === s.jugador_id);
      const p = partidos.find(part => part.id === s.partido_id);
      const d = j ? disciplinas.find(disc => disc.id === j.disciplina_id) : null;
      return {
        ...s,
        nombre: j ? j.nombre : null,
        disciplina_id: j ? j.disciplina_id : null,
        disciplina_nombre: d ? d.nombre : null,
        rival: p ? p.rival : null,
        fecha: p ? p.fecha : null
      };
    });

    if (lowerText.includes('where jugador_id = $1') || lowerText.includes('where es.jugador_id = $1')) {
      const targetId = parseInt(params[0], 10);
      const rows = mapped.filter(s => s.jugador_id === targetId);
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
        rows = rows.filter(r => r.disciplina_id === parseInt(params[0], 10));
      }
      rows.sort((a, b) => b.total_anotaciones - a.total_anotaciones || b.total_asistencias - a.total_asistencias);
      return { rows: rows.slice(0, 5), rowCount: Math.min(5, rows.length) };
    }

    return { rows: mapped, rowCount: mapped.length };
  }

  if (lowerText.startsWith('insert into estadisticas_jugador')) {
    const id = await getNextId(db, 'estadisticas_jugador');
    const jugador_id = parseInt(params[0], 10);
    const partido_id = parseInt(params[1], 10);
    const goles = parseInt(params[2] || 0, 10);
    const asistencias = parseInt(params[3] || 0, 10);
    const minutos_jugados = parseInt(params[4] || 0, 10);

    const newObj = { id, jugador_id, partido_id, goles, asistencias, minutos_jugados, created_at: new Date().toISOString() };
    await setDoc(doc(db, 'estadisticas_jugador', String(id)), sanitizeData(newObj));
    return { rows: [{ id, ...newObj }], rowCount: 1 };
  }

  // --- 11. LESIONES ---
  if (lowerText.includes('from lesiones')) {
    const lesiones = await getAllDocs('lesiones');
    const jugadores = await getAllDocs('jugadores');

    const mapped = lesiones.map(l => {
      const j = jugadores.find(jug => jug.id === l.jugador_id);
      return {
        ...l,
        jugador_nombre: j ? j.nombre : null,
        disciplina_id: j ? j.disciplina_id : null
      };
    });

    if (lowerText.includes('select count(l.id)') || lowerText.includes('select count(*)')) {
      let active = mapped.filter(l => !l.fecha_fin);
      if (params.length > 0 && params[0]) {
        active = active.filter(l => l.disciplina_id === parseInt(params[0], 10));
      }
      return { rows: [{ total: active.length }], rowCount: 1 };
    }

    if (lowerText.includes('where l.jugador_id = $1') || lowerText.includes('where jugador_id = $1')) {
      const targetId = parseInt(params[0], 10);
      const rows = mapped.filter(l => l.jugador_id === targetId);
      return { rows, rowCount: rows.length };
    }

    mapped.sort((a, b) => (b.fecha_inicio || '').localeCompare(a.fecha_inicio || ''));
    return { rows: mapped, rowCount: mapped.length };
  }

  if (lowerText.startsWith('insert into lesiones')) {
    const id = await getNextId(db, 'lesiones');
    const jugador_id = parseInt(params[0], 10);
    const tipo = params[1];
    const descripcion = params[2] || null;
    const fecha_inicio = params[3];
    const fecha_fin = params[4] || null;

    const newL = { id, jugador_id, tipo, descripcion, fecha_inicio, fecha_fin, created_at: new Date().toISOString() };
    await setDoc(doc(db, 'lesiones', String(id)), sanitizeData(newL));
    return { rows: [{ id, ...newL }], rowCount: 1 };
  }

  if (lowerText.startsWith('update lesiones')) {
    const tipo = params[0];
    const descripcion = params[1] || null;
    const fecha_inicio = params[2];
    const fecha_fin = params[3] || null;
    const targetId = parseInt(params[4], 10);
    await updateDoc(doc(db, 'lesiones', String(targetId)), sanitizeData({ tipo, descripcion, fecha_inicio, fecha_fin }));
    return { rows: [], rowCount: 1 };
  }

  if (lowerText.startsWith('delete from lesiones')) {
    const targetId = parseInt(params[0], 10);
    await deleteDoc(doc(db, 'lesiones', String(targetId)));
    return { rows: [], rowCount: 1 };
  }

  // --- 12. EVALUACIONES FÍSICAS & RUGBY ---
  if (lowerText.includes('from evaluaciones_rugby') || lowerText.includes('from evaluaciones')) {
    const col = lowerText.includes('evaluaciones_rugby') ? 'evaluaciones_rugby' : 'evaluaciones';
    const list = await getAllDocs(col);
    if (lowerText.includes('where jugador_id = $1')) {
      const targetId = parseInt(params[0], 10);
      const rows = list.filter(e => e.jugador_id === targetId);
      rows.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
      if (lowerText.includes('limit 1')) return { rows: rows.slice(0, 1), rowCount: Math.min(1, rows.length) };
      return { rows, rowCount: rows.length };
    }
    list.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    return { rows: list, rowCount: list.length };
  }

  if (lowerText.startsWith('insert into evaluaciones_rugby') || lowerText.startsWith('insert into evaluaciones')) {
    const col = lowerText.includes('evaluaciones_rugby') ? 'evaluaciones_rugby' : 'evaluaciones';
    const id = await getNextId(db, col);
    const jugador_id = parseInt(params[0], 10);
    const fecha = params[1];
    const newDoc = { id, jugador_id, fecha, created_at: new Date().toISOString() };
    await setDoc(doc(db, col, String(id)), sanitizeData(newDoc));
    return { rows: [{ id }], rowCount: 1 };
  }

  // --- 13. ANTROPOMETRIA ---
  if (lowerText.includes('from antropometria')) {
    const list = await getAllDocs('antropometria');
    const jugadores = await getAllDocs('jugadores');

    const mapped = list.map(a => {
      const j = jugadores.find(jug => jug.id === a.jugador_id);
      return { ...a, jugador_nombre: j ? j.nombre : null };
    });

    if (lowerText.includes('where jugador_id = $1') || lowerText.includes('where a.jugador_id = $1')) {
      const targetId = parseInt(params[0], 10);
      const rows = mapped.filter(a => a.jugador_id === targetId);
      rows.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
      if (lowerText.includes('limit 1')) return { rows: rows.slice(0, 1), rowCount: Math.min(1, rows.length) };
      return { rows, rowCount: rows.length };
    }
    mapped.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    return { rows: mapped, rowCount: mapped.length };
  }

  if (lowerText.startsWith('insert into antropometria')) {
    const id = await getNextId(db, 'antropometria');
    // Save all fields dynamically
    const fields = [
      'jugador_id', 'fecha', 'peso', 'estatura', 'imc',
      'pliegue_biceps', 'pliegue_triceps', 'pliegue_subescapular', 'pliegue_suprailiaco', 'pliegue_supraespinal', 'pliegue_abdominal', 'pliegue_muslo_anterior', 'pliegue_pierna_medial',
      'perimetro_brazo_relajado', 'perimetro_brazo_contraido', 'perimetro_muslo_medio', 'perimetro_pierna',
      'diametro_humero', 'diametro_muneca', 'diametro_femur',
      'porcentaje_grasa', 'masa_muscular_esqueletica', 'masa_mineral_osea', 'sumatoria_pliegues',
      'posicion_rugby', 'categoria', 'grupo',
      'endomorfia', 'mesomorfia', 'ectomorfia', 'x_somatocarta', 'y_somatocarta'
    ];
    const newAntro = { id, created_at: new Date().toISOString() };
    for (let i = 0; i < params.length && i < fields.length; i++) {
      newAntro[fields[i]] = params[i];
    }
    await setDoc(doc(db, 'antropometria', String(id)), sanitizeData(newAntro));
    return { rows: [{ id, ...newAntro }], rowCount: 1 };
  }

  // Default fallback for any unhandled queries
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
