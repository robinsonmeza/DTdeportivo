import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Jugadores from './pages/Jugadores'
import Entrenamientos from './pages/Entrenamientos'
import Asistencia from './pages/Asistencia'
import Lesiones from './pages/Lesiones'
import Evaluaciones from './pages/Evaluaciones'
import Partidos from './pages/Partidos'
import EstadisticasJugador from './pages/EstadisticasJugador'
import Antropometria from './pages/Antropometria'

export default function App() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/"               element={<Dashboard />} />
          <Route path="/jugadores"      element={<Jugadores />} />
          <Route path="/antropometria"  element={<Antropometria />} />
          <Route path="/entrenamientos" element={<Entrenamientos />} />
          <Route path="/asistencia"     element={<Asistencia />} />
          <Route path="/lesiones"       element={<Lesiones />} />
          <Route path="/evaluaciones"   element={<Evaluaciones />} />
          <Route path="/partidos"       element={<Partidos />} />
          <Route path="/estadisticas"   element={<EstadisticasJugador />} />
        </Routes>
      </main>
    </div>
  )
}
