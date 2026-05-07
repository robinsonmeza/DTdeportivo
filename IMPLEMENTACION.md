# IMPLEMENTACION.md — Funcionalidades Pendientes DTdeportivo

Este archivo describe las funcionalidades pendientes aprobadas para implementar en próximas sesiones.

---

## Punto 2 — Rol Head Coach

### Descripción
Nuevo rol `head_coach` con perfil individual propio (página `/head-coach`). Puede ver datos de todos los equipos y entrenadores que tenga asociados. No recibe acceso modular individual sino una vista consolidada propia.

### Cambios en base de datos

```sql
-- Agregar head_coach_id a la tabla usuarios (FK hacia sí misma)
ALTER TABLE usuarios ADD COLUMN head_coach_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;

-- El head_coach_id se asigna en el perfil del entrenador (no es obligatorio)
```

### Cambios en backend

1. **`backend/middleware/auth.js`** — Agregar `'head_coach'` a las listas de roles válidos donde corresponda.
2. **`backend/controllers/usuarios.controller.js`**:
   - Permitir crear `head_coach` solo por `administrador`.
   - Al listar entrenadores, incluir el campo `head_coach_id` / `head_coach_nombre`.
3. **`backend/routes/usuarios.routes.js`** — Agregar `head_coach` a los roles permitidos en los endpoints de creación.
4. **Nuevo controlador `backend/controllers/headcoach.controller.js`**:
   - `GET /api/head-coach/resumen` → devuelve todos los equipos y entrenadores asociados al `head_coach` autenticado.
   - `GET /api/head-coach/entrenadores` → lista entrenadores cuyo `head_coach_id` coincide con el usuario autenticado.
   - `GET /api/head-coach/jugadores` → lista jugadores de los equipos de esos entrenadores.
5. **Nueva ruta `backend/routes/headcoach.routes.js`** — protegida con `autorizar('head_coach', 'administrador')`.
6. **`backend/server.js`** — registrar la nueva ruta `/api/head-coach`.

### Cambios en frontend

1. **`frontend/src/App.jsx`** — Agregar ruta `/head-coach` protegida con rol `head_coach`.
2. **`frontend/src/components/Navbar.jsx`** — Agregar ítem "Mi Panel" para `head_coach`, ocultar rutas de gestión individuales.
3. **Nueva página `frontend/src/pages/HeadCoach.jsx`**:
   - Sección: mis entrenadores (tabla con nombre, equipo asignado).
   - Sección: todos mis jugadores (tabla con equipo, entrenador, posición).
   - Sección: resumen estadístico (número de equipos, jugadores, próximos partidos).
4. **`frontend/src/context/AuthContext.jsx`** — Incluir `head_coach` en los flujos de `tienePermiso`.

### Tabla de permisos actualizada

| Módulo | Admin | Head Coach | Entrenador | Personal Salud | Jugador |
|---|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mi Panel HC | ❌ | ✅ | ❌ | ❌ | ❌ |
| Jugadores | ✅ | 👁️ sus equipos | 👁️ su equipo | 👁️ | 👁️ propio |
| Entrenamientos | ✅ | 👁️ | ✅ | ❌ | 👁️ |
| Lesiones | ✅ | 👁️ | 👁️ | ✅ | 👁️ propio |
| Usuarios | ✅ | ❌ | ✅ parcial | ❌ | ❌ |

---

## Punto 3 — Restricción de visibilidad del Entrenador

### Descripción
Un entrenador solo puede ver y gestionar jugadores y datos de **su propio equipo**. Opcionalmente puede tener un `head_coach` asignado (no obligatorio).

### Cambios en base de datos

```sql
-- Ya cubierto en Punto 2: head_coach_id en usuarios
-- No se requieren migraciones adicionales para este punto
```

### Cambios en backend

1. **`backend/controllers/jugadores.controller.js`**:
   - En `GET /api/jugadores`: si el rol es `entrenador`, filtrar por `entrenador_id = req.usuario.id` (ver Punto 4).
   - En `POST /api/jugadores`: asignar automáticamente `entrenador_id = req.usuario.id` si el creador es entrenador.
2. **`backend/controllers/entrenamientos.controller.js`** — Filtrar por entrenador cuando el rol sea `entrenador`.
3. **`backend/controllers/partidos.controller.js`** — Ídem.
4. **`backend/controllers/estadisticas.controller.js`** — Filtrar por equipo del entrenador.

---

## Punto 4 — Columna Entrenador en Jugadores

### Descripción
Agregar el campo `entrenador_id` en la tabla `jugadores` para asociar cada jugador a un entrenador específico. Esto también sirve de filtro cuando existe un `head_coach`.

### Cambios en base de datos

```sql
ALTER TABLE jugadores ADD COLUMN entrenador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
```

### Cambios en backend

1. **`backend/controllers/jugadores.controller.js`**:
   - Incluir `entrenador_id` / `entrenador_nombre` en SELECT (JOIN con `usuarios`).
   - Permitir asignar o cambiar `entrenador_id` en POST/PUT.
2. **`backend/controllers/headcoach.controller.js`** — Usar `entrenador_id` para las consultas agregadas del head_coach.

### Cambios en frontend

1. **`frontend/src/pages/Jugadores.jsx`**:
   - Agregar columna "Entrenador" en la tabla de jugadores.
   - En formulario de edición: selector de entrenador (solo visible para `administrador` y `head_coach`).
   - Mostrar `entrenador_nombre` en la tarjeta/fila del jugador.

---

## Punto 5 — Panel de Filtros en Jugadores

### Descripción
Sección colapsable de filtros en la página Jugadores para filtrar/ocultar por múltiples criterios.

### Filtros a implementar

| Filtro | Tipo | Descripción |
|---|---|---|
| Equipo / Disciplina | Select | Filtrar por equipo registrado o disciplina individual |
| Edad | Rango (min–max) | Calculada a partir de `fecha_nacimiento` |
| Posición | Select/texto | Campo `posicion` de la tabla jugadores |
| Entrenador | Select | Lista de entrenadores disponibles (según rol del usuario) |

### Cambios en frontend solamente

1. **`frontend/src/pages/Jugadores.jsx`**:
   - Agregar botón "Filtros" (toggle show/hide panel).
   - Componente de filtros con los 4 selectores descritos.
   - Filtrado en frontend (sobre el array de jugadores ya cargado) — no requiere cambios en la API por ahora.
   - Indicador de filtros activos (badge con número de filtros aplicados).
   - Botón "Limpiar filtros".

### Opcionalmente (si el volumen de datos es grande)

- Pasar filtros como query params al endpoint `GET /api/jugadores` y filtrar en el backend.
- Agregar índices en `equipo_id`, `entrenador_id`, `posicion` en la tabla `jugadores`.

---

## Orden de implementación sugerido

1. **Punto 4** primero → migración DB + columna entrenador_id
2. **Punto 3** después → lógica de restricción en backend
3. **Punto 2** después → rol head_coach completo
4. **Punto 5** al final → solo frontend, independiente

---

## Notas de implementación

- Al agregar `head_coach` como rol, actualizar también: `backend/config/seed.js` (agregar usuario de prueba), `README.md` (tabla de roles, credenciales de prueba).
- Las migraciones SQL (`ALTER TABLE`) se deben ejecutar en la consola SQL de Neon antes de desplegar el código nuevo.
- No usar bcrypt — mantener el hashing con `crypto` (SHA-256 HMAC + salt) ya implementado.
- El CSV de carga masiva deberá soportar el rol `head_coach` una vez implementado el Punto 2.
