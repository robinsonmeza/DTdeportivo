# DTdeportivo — Sistema de Gestión Deportiva Integral

Plataforma web full-stack para la gestión integral, médica, física, técnica y táctica de clubes, equipos y deportistas multidisciplinarios.

**Stack Tecnológico:**
- **Frontend:** React 18, Vite, React Router 6, Recharts, Lucide Icons, React Hot Toast
- **Backend:** Node.js, Express, JWT (Access + Refresh tokens), Multer
- **Base de Datos:** PostgreSQL (Cloud SQL / Neon)
- **Persistencia de Archivos:** Carga de imágenes para escudos de equipos y fotos de deportistas

---

## Estructura del Proyecto

```
DTdeportivo/
├── backend/                       → API REST (Node.js + Express)
│   ├── config/
│   │   ├── db.js                  ← Conexión PostgreSQL (Cloud SQL / Neon)
│   │   ├── database.sql           ← Schema DDL completo
│   │   ├── seed.js                ← Semilla de prueba y credenciales base
│   │   └── seed_cloudsql.js       ← Inicializador para Cloud SQL
│   ├── controllers/               ← Controladores de la API (13 controladores)
│   │   ├── antropometria.controller.js
│   │   ├── asistencia.controller.js
│   │   ├── auth.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── disciplinas.controller.js
│   │   ├── entrenamientos.controller.js
│   │   ├── equipos.controller.js
│   │   ├── estadisticas.controller.js
│   │   ├── evaluaciones.controller.js
│   │   ├── jugadores.controller.js
│   │   ├── lesiones.controller.js
│   │   ├── partidos.controller.js
│   │   ├── settings.controller.js
│   │   └── usuarios.controller.js
│   ├── middleware/
│   │   └── auth.js                ← Validación JWT + RBAC (Roles)
│   ├── routes/                    ← Rutas y endpoints REST
│   ├── uploads/                   ← Archivos estáticos subidos
│   │   ├── players/               ← Fotos de perfil de deportistas
│   │   └── teams/                 ← Escudos e insignias de equipos
│   ├── .env.example               ← Variables de entorno requeridas
│   └── server.js                  ← Servidor backend Express
├── frontend/                      → SPA (React + Vite)
│   └── src/
│       ├── components/            ← Navbar, Modales, Somatocarta, StatCards, Spinners
│       ├── context/
│       │   ├── AuthContext.jsx    ← Autenticación, tokens y permisos RBAC
│       │   └── DeporteContext.jsx ← Selector global de disciplina deportiva
│       ├── pages/                 ← Vistas y módulos de la aplicación
│       │   ├── Antropometria.jsx  ← Protocolo ISAK-1 y Somatocarta Heath-Carter
│       │   ├── Asistencia.jsx     ← Registro de asistencia por sesión
│       │   ├── Dashboard.jsx      ← Métricas globales y accesos rápidos
│       │   ├── Entrenamientos.jsx ← Planificación y sesiones de entreno
│       │   ├── Equipos.jsx        ← Gestión de clubes, escudos y nómina de atletas
│       │   ├── EstadisticasJugador.jsx ← Goles, asistencias, minutos y puntos
│       │   ├── Evaluaciones.jsx   ← Evaluaciones físicas, antropométricas y de Rugby
│       │   ├── Jugadores.jsx      ← Fichas de deportistas y perfiles técnicos
│       │   ├── Lesiones.jsx       ← Historial médico y seguimiento de bajas
│       │   ├── Login.jsx          ← Inicio de sesión seguro
│       │   ├── Partidos.jsx       ← Calendario y resultados de encuentros
│       │   └── Usuarios.jsx       ← Gestión de usuarios y cuentas (Solo Admin)
│       ├── services/
│       │   └── api.js             ← Cliente Axios con interceptor de tokens
│       └── utils/
│           └── image.js           ← Normalizador de URLs de imágenes
├── metadata.json                  ← Metadatos del applet
└── IMPLEMENTACION.md              ← Hoja de ruta de funcionalidades futuras
```

---

## Módulos del Sistema

1. **Dashboard:** Métricas generales consolidadas, distribución de deportistas por disciplina, estado de bajas por lesión, próximos partidos y accesos rápidos.
2. **Equipos:** Creación y administración de equipos, soporte para escudos/logos personalizados, visualización de nómina y asignación rápida de atletas.
3. **Jugadores / Deportistas:** Fichas técnicas individuales con foto de perfil, datos biométricos, posición deportiva, disciplina y club asociado.
4. **Entrenamientos:** Planificación de sesiones de entrenamiento con ubicación, intensidad, objetivos y fecha.
5. **Asistencia:** Toma de asistencia rápida por sesión de entrenamiento con estados (Presente, Ausente, Justificado, Lesionado).
6. **Partidos:** Registro de calendario, rivales, marcadores, localía y estado del encuentro.
7. **Estadísticas de Rendimiento:** Registro de goles, puntos, asistencias y minutos disputados por partido.
8. **Lesiones y Salud:** Bitácora médica con tipo de lesión, diagnóstico, fecha de inicio y alta médica.
9. **Evaluaciones Físicas y Rugby:** Tests físicos generales y batería específica de Rugby (velocidad, resistencia, salto, fuerza máxima y agilidad).
10. **Antropometría ISAK-1:** Cálculo automatizado de composición corporal de 5 componentes, cálculo de somatotipo (Endomorfia, Mesomorfia, Ectomorfia) y renderizado interactivo en la **Somatocarta de Heath-Carter**.
11. **Gestión de Usuarios (RBAC):** Creación individual y masiva mediante archivo CSV, asignación de roles y restablecimiento de claves.

---

## Matriz de Roles y Permisos (RBAC)

| Módulo | Administrador | Entrenador | Personal de Salud | Jugador |
|---|:---:|:---:|:---:|:---:|
| **Dashboard** | ✅ Completo | ✅ Completo | ✅ Completo | ✅ Vista Atleta |
| **Equipos** | ✅ Gestión | ✅ Gestión | 👁️ Consulta | ❌ |
| **Jugadores** | ✅ Gestión | ✅ Gestión | 👁️ Consulta | 👁️ Perfil propio |
| **Entrenamientos** | ✅ Gestión | ✅ Gestión | 👁️ Consulta | 👁️ Consulta |
| **Asistencia** | ✅ Gestión | ✅ Gestión | 👁️ Consulta | 👁️ Consulta |
| **Partidos** | ✅ Gestión | ✅ Gestión | 👁️ Consulta | 👁️ Consulta |
| **Estadísticas** | ✅ Gestión | ✅ Gestión | 👁️ Consulta | 👁️ Rendimiento propio |
| **Lesiones** | ✅ Gestión | 👁️ Consulta | ✅ Gestión | 👁️ Historial propio |
| **Evaluaciones** | ✅ Gestión | ✅ Gestión | ✅ Gestión | 👁️ Ficha propia |
| **Antropometría** | ✅ Gestión | 👁️ Consulta | ✅ Gestión | 👁️ Mediciones propias |
| **Usuarios** | ✅ Exclusivo | ❌ | ❌ | ❌ |

---

## Credenciales de Prueba

| Rol | Correo Electrónico | Contraseña |
|---|---|---|
| **Administrador** | `admin@dtdeportivo.com` | `Admin123!` |
| **Entrenador** | `entrenador@dtdeportivo.com` | `Coach123!` |
| **Personal de Salud** | `salud@dtdeportivo.com` | `Salud123!` |
| **Jugador** | `jugador@dtdeportivo.com` | `Jugador123!` |

---

## Puesta en Marcha y Ejecución Local

### Requisitos previos
- Node.js 18+ o superior
- Base de datos PostgreSQL activa

### Configuración del Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed     # Inicializa las tablas y los usuarios de prueba
npm run dev      # Inicia el servidor API en el puerto configurado
```

### Configuración del Frontend

```bash
cd frontend
npm install
npm run dev      # Inicia el servidor Vite en http://localhost:3000
```

### Variables de Entorno Requeridas (`.env`)

```env
DATABASE_URL=postgresql://usuario:password@host:5432/dtdeportivo?sslmode=require
JWT_SECRET=tu_clave_secreta_jwt
JWT_REFRESH_SECRET=tu_clave_secreta_refresh_jwt
PORT=3000
NODE_ENV=development
```

---

## API — Endpoints Principales

| Método | Endpoint | Descripción | Acceso |
|---|---|---|---|
| `POST` | `/api/auth/login` | Inicio de sesión y obtención de tokens JWT | Público |
| `POST` | `/api/auth/refresh` | Renovación de token de acceso | Autenticado |
| `GET` | `/api/auth/me` | Datos del perfil de usuario en sesión | Autenticado |
| `GET` / `POST` | `/api/equipos` | Listado y registro de equipos con escudo | Admin, Entrenador |
| `POST` | `/api/equipos/:id/logo` | Carga de escudo del equipo (multipart/form-data) | Admin, Entrenador |
| `GET` / `POST` | `/api/jugadores` | Listado y creación de fichas de atletas | Admin, Entrenador |
| `POST` | `/api/jugadores/:id/foto` | Carga de foto de perfil del deportista | Admin, Entrenador |
| `GET` / `POST` | `/api/antropometria` | Registros antropométricos y somatotipo ISAK | Admin, Salud |
| `GET` / `POST` | `/api/lesiones` | Historial médico y seguimiento de lesiones | Admin, Salud |
| `GET` / `POST` | `/api/evaluaciones` | Evaluaciones de condición física y Rugby | Admin, Entrenador, Salud |
| `GET` / `POST` | `/api/asistencia` | Marcación de asistencia por entrenamiento | Admin, Entrenador |
| `GET` / `POST` | `/api/entrenamientos`| Cronograma de sesiones deportivas | Admin, Entrenador |
| `GET` / `POST` | `/api/partidos` | Calendario y marcadores de encuentros | Admin, Entrenador |
| `GET` / `POST` | `/api/usuarios` | Administración de cuentas de usuario | Solo Administrador |
| `POST` | `/api/usuarios/csv` | Carga masiva de usuarios vía CSV | Solo Administrador |

---

## Formato CSV para Carga Masiva de Usuarios

Cabeceras obligatorias: `nombre, email, password, rol`

```csv
nombre,email,password,rol
Carlos Alarcón,carlos@club.com,Clave123!,entrenador
Dra. Mariana Ortiz,mariana@club.com,Clave123!,personal_salud
Felipe Gómez,felipe@club.com,Clave123!,jugador
```

*Roles aceptados:* `administrador`, `entrenador`, `personal_salud`, `jugador`
