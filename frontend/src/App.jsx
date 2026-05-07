import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Jugadores from './pages/Jugadores'
import Entrenamientos from './pages/Entrenamientos'
import Asistencia from './pages/Asistencia'
import Lesiones from './pages/Lesiones'
import Evaluaciones from './pages/Evaluaciones'
import Partidos from './pages/Partidos'
import EstadisticasJugador from './pages/EstadisticasJugador'
import Antropometria from './pages/Antropometria'
import Usuarios from './pages/Usuarios'

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout><Dashboard /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/jugadores" element={
          <ProtectedRoute>
            <AppLayout><Jugadores /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/entrenamientos" element={
          <ProtectedRoute roles={['administrador','entrenador','jugador']}>
            <AppLayout><Entrenamientos /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/asistencia" element={
          <ProtectedRoute roles={['administrador','entrenador']}>
            <AppLayout><Asistencia /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/lesiones" element={
          <ProtectedRoute roles={['administrador','personal_salud','jugador']}>
            <AppLayout><Lesiones /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/evaluaciones" element={
          <ProtectedRoute roles={['administrador','personal_salud','jugador']}>
            <AppLayout><Evaluaciones /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/partidos" element={
          <ProtectedRoute roles={['administrador','entrenador','jugador']}>
            <AppLayout><Partidos /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/estadisticas" element={
          <ProtectedRoute>
            <AppLayout><EstadisticasJugador /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/antropometria" element={
          <ProtectedRoute roles={['administrador','personal_salud','jugador']}>
            <AppLayout><Antropometria /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/usuarios" element={
          <ProtectedRoute roles={['administrador','entrenador']}>
            <AppLayout><Usuarios /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
