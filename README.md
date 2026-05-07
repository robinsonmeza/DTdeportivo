# DTdeportivo — Sistema de Gestión Deportiva

Plataforma web full-stack para gestión integral de equipos y jugadores deportivos.  
**Stack:** React 18 + Vite · Node.js + Express · PostgreSQL (Neon) · Vercel

---

## Estructura del proyecto

```
DTdeportivo/
├── backend/                       → API REST (Puerto 3001)
│   ├── config/
│   │   ├── db.js                  ← Conexión PostgreSQL (Neon)
│   │   ├── database.sql           ← Schema completo PostgreSQL
│   │   └── seed.js                ← Credenciales de prueba
│   ├── controllers/               ← Lógica de negocio (12 controladores)
│   ├── middleware/
│   │   └── auth.js                ← JWT + control de roles
│   ├── routes/                    ← Endpoints REST (12 archivos)
│   ├── uploads/players/           ← Fotos de jugadores
│   ├── .env.example               ← Plantilla de variables
│   └── server.js                  ← Entrada Express
├── frontend/                      → React + Vite (Puerto 3000)
│   └── src/
│       ├── context/
│       │   └── AuthContext.jsx    ← Estado global de autenticación
│       ├── components/
│       │   ├── Navbar.jsx         ← Menú filtrado por rol
│       │   ├── ProtectedRoute.jsx ← Rutas protegidas
│       │   ├── Modal.jsx
│       │   ├── StatCard.jsx
│       │   ├── LoadingSpinner.jsx
│       │   └── Somatocarta.jsx
│       ├── pages/                 ← 10 páginas
│       └── services/
│           └── api.js             ← Axios + JWT + refresh automático
├── vercel.json                    ← Configuración despliegue
└── IMPLEMENTACION.md              ← Próximas funcionalidades pendientes
```

---

## Roles y permisos

| Módulo | Admin | Entrenador | Personal Salud | Jugador |
|---|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Jugadores (CRUD) | ✅ | ✅ | 👁️ | 👁️ propio |
| Entrenamientos | ✅ | ✅ | ❌ | 👁️ |
| Asistencia | ✅ | ✅ | ❌ | 👁️ |
| Lesiones | ✅ | 👁️ | ✅ | 👁️ propio |
| Evaluaciones | ✅ | 👁️ | ✅ | 👁️ propio |
| Partidos | ✅ | ✅ | ❌ | 👁️ |
| Estadísticas | ✅ | ✅ | 👁️ | 👁️ propio |
| Antropometría | ✅ | 👁️ | ✅ | 👁️ propio |
| Usuarios | ✅ | ✅ parcial | ❌ | ❌ |

**Reglas de creación de usuarios:**
- Administrador puede crear cualquier rol
- Entrenador solo puede crear `jugador` y `personal_salud`
- Ambos pueden hacer carga masiva por CSV

---

## Asociación de jugadores

Un jugador puede estar asociado a **una sola** de estas opciones:
- **Equipo** → pertenece a un club/equipo registrado
- **Disciplina deportiva** → practica una disciplina individual (puede escribirse manualmente)

---

## Credenciales de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@dtdeportivo.com | Admin123! |
| Entrenador | entrenador@dtdeportivo.com | Coach123! |
| Personal Salud | salud@dtdeportivo.com | Salud123! |
| Jugador | jugador@dtdeportivo.com | Jugador123! |

---

## Ejecución local

**Requisitos:** Node.js 18+, cuenta Neon (PostgreSQL)

```bash
# Backend
cd backend
cp .env.example .env      # Completar DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
npm install
npm run seed              # Crea tablas y usuarios de prueba
npm run dev               # Puerto 3001

# Frontend (otra terminal)
cd frontend
npm install
npm run dev               # Puerto 3000 → http://localhost:3000
```

### Variables de entorno (`backend/.env`)

```
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
JWT_SECRET=secreto_seguro
JWT_REFRESH_SECRET=secreto_refresh_diferente
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

---

## Despliegue (Vercel + Neon)

El proyecto usa `vercel.json` con `experimentalServices`:
- **Frontend** → Vite, ruta `/`
- **Backend** → Express, ruta `/_/backend`

Variables de entorno requeridas en Vercel:
```
VITE_API_URL=/_/backend/api
DATABASE_URL=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
NODE_ENV=production
```

---

## API — Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/refresh` | Renovar token |
| GET | `/api/auth/me` | Usuario actual |
| PUT | `/api/auth/cambiar-password` | Cambiar contraseña |
| GET/POST | `/api/jugadores` | Listar / crear jugadores |
| GET/POST | `/api/usuarios` | Listar / crear usuarios |
| POST | `/api/usuarios/csv` | Carga masiva CSV |
| GET/POST | `/api/equipos` | Equipos |
| GET/POST | `/api/disciplinas` | Disciplinas deportivas |
| GET | `/api/dashboard` | Resumen general |

---

## Formato CSV — Carga masiva de usuarios

El archivo debe tener las columnas: `nombre, email, password, rol`

```csv
nombre,email,password,rol
Juan Pérez,juan@club.com,Pass123!,jugador
Ana López,ana@club.com,Pass123!,personal_salud
```

Roles válidos: `administrador`, `entrenador`, `personal_salud`, `jugador`
