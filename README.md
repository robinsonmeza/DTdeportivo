# 🏆 DeportivoApp — Sistema de Gestión Deportiva

Plataforma web full-stack para gestión completa de un equipo deportivo.  
**Stack:** React + Vite · Node.js + Express · MySQL

---

## 🗂 Estructura del Proyecto

```
deportivo/
├── backend/          → API REST (Puerto 3001)
│   ├── config/
│   │   ├── db.js         ← Pool de conexión MySQL
│   │   └── database.sql  ← Script SQL completo
│   ├── controllers/      ← Lógica CRUD (7 controladores)
│   ├── routes/           ← Endpoints REST (8 archivos)
│   ├── .env              ← Variables de entorno
│   └── server.js         ← Punto de entrada Express
└── frontend/         → React + Vite (Puerto 3000)
    └── src/
        ├── components/   ← Navbar, StatCard, Modal, etc.
        ├── pages/        ← Dashboard, Jugadores, Lesiones…
        └── services/     ← Cliente Axios
```

---

## ⚡ Instrucciones de Ejecución

### Paso 1 — Configurar la base de datos MySQL

```bash
# Abrir MySQL y ejecutar el script SQL:
mysql -u root -p < backend/config/database.sql
```

> Esto creará la BD `deportivo_db` con todas las tablas y datos de ejemplo.

### Paso 2 — Configurar variables de entorno

Editar `backend/.env` con tus credenciales MySQL:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=1234
DB_NAME=deportivo_db
PORT=3001
```

### Paso 3 — Iniciar el Backend

```bash
cd backend
npm run dev
# → Servidor en http://localhost:3001
```

### Paso 4 — Iniciar el Frontend

Abrir **otra terminal**:

```bash
cd frontend
npm run dev
# → App en http://localhost:3000
```

### Paso 5 — Abrir la aplicación

Ir a: **http://localhost:3000**

---

## 🌐 API Endpoints

| Método     | Ruta                            | Descripción                 |
| ---------- | ------------------------------- | --------------------------- |
| GET        | `/api/dashboard`                | Resumen general             |
| GET/POST   | `/api/jugadores`                | Listar / Crear jugadores    |
| PUT/DELETE | `/api/jugadores/:id`            | Editar / Eliminar           |
| GET/POST   | `/api/entrenamientos`           | Listar / Crear              |
| PUT/DELETE | `/api/entrenamientos/:id`       | Editar / Eliminar           |
| GET/POST   | `/api/lesiones`                 | Listar / Crear lesiones     |
| PUT/DELETE | `/api/lesiones/:id`             | Editar / Eliminar           |
| GET/POST   | `/api/evaluaciones`             | Listar / Crear evaluaciones |
| PUT/DELETE | `/api/evaluaciones/:id`         | Editar / Eliminar           |
| GET/POST   | `/api/partidos`                 | Listar / Crear partidos     |
| PUT/DELETE | `/api/partidos/:id`             | Editar / Eliminar           |
| GET/POST   | `/api/estadisticas`             | Listar / Crear estadísticas |
| GET        | `/api/estadisticas/jugador/:id` | Stats por jugador           |
| PUT/DELETE | `/api/estadisticas/:id`         | Editar / Eliminar           |
| GET        | `/api/health`                   | Estado del servidor         |

---

## 🔍 Ejemplo de consumo de API

```bash
# Listar jugadores
curl http://localhost:3001/api/jugadores

# Crear jugador
curl -X POST http://localhost:3001/api/jugadores \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Juan López","edad":23,"posicion":"Delantero","peso":71.5,"altura":1.79}'

# Registrar lesión
curl -X POST http://localhost:3001/api/lesiones \
  -H "Content-Type: application/json" \
  -d '{"jugador_id":1,"tipo":"Muscular","descripcion":"Desgarro","fecha_inicio":"2026-03-30"}'

# Dashboard completo
curl http://localhost:3001/api/dashboard
```

---

## 📦 Dependencias

### Backend

| Paquete | Versión | Uso                   |
| ------- | ------- | --------------------- |
| express | ^4.19   | Servidor HTTP         |
| mysql2  | ^3.9    | Conexión MySQL        |
| cors    | ^2.8    | Cabeceras CORS        |
| dotenv  | ^16.4   | Variables de entorno  |
| nodemon | ^3.1    | Hot reload desarrollo |

### Frontend

| Paquete           | Versión | Uso                   |
| ----------------- | ------- | --------------------- |
| react + react-dom | ^18.3   | UI framework          |
| react-router-dom  | ^6.24   | Navegación SPA        |
| axios             | ^1.7    | Cliente HTTP          |
| recharts          | ^2.12   | Gráficas interactivas |
| lucide-react      | ^0.396  | Iconos SVG            |
| react-hot-toast   | ^2.4    | Notificaciones        |
| vite              | ^5.3    | Bundler + Dev server  |

---

## 🐛 Solución de problemas comunes

**Error: Cannot connect to MySQL**

- Verificar que MySQL está corriendo: `net start mysql` (Windows)
- Revisar credenciales en `backend/.env`

**Error: Base de datos no existe**

- Ejecutar el script SQL: `mysql -u root -p < backend/config/database.sql`

**Puerto ya en uso**

- Backend: cambiar `PORT=3001` en `.env`
- Frontend: cambiar `port: 3000` en `vite.config.js`
