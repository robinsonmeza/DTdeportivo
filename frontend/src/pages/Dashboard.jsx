import { useEffect, useState } from 'react'
import { Users, Activity, Trophy, Dumbbell, Goal, Star } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import StatCard from '../components/StatCard'
import LoadingSpinner from '../components/LoadingSpinner'
import api from '../services/api'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const anotadores = data?.top_anotadores || []
  const radarData  = anotadores.slice(0, 5).map(a => ({
    name: a.nombre.split(' ')[0],
    Anotaciones: Number(a.total_anotaciones),
    Asistencias: Number(a.total_asistencias), 
  }))

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Resumen general del equipo en tiempo real</p>
      </div>

      {/* Tarjetas resumen */}
      <div className="stats-grid">
        <StatCard
          label="Total Jugadores"
          value={data?.total_jugadores}
          icon={<Users size={22} color="#6c63ff" />}
          color="var(--accent)"
        />
        <StatCard
          label="Lesiones Activas"
          value={data?.lesiones_activas}
          icon={<Activity size={22} color="#ff4757" />}
          color="var(--danger)"
        />
        <StatCard
          label="Partidos Jugados"
          value={data?.total_partidos}
          icon={<Trophy size={22} color="#00d4aa" />}
          color="var(--accent2)"
        />
        <StatCard
          label="Entrenamientos"
          value={data?.total_entrenamientos}
          icon={<Dumbbell size={22} color="#ffa94d" />}
          color="var(--warning)"
        />
      </div>

      <div className="dashboard-grid">
        {/* Top Anotadores */}
        <div className="card">
          <div className="card-title"><Goal size={18} color="var(--accent)" /> Top Anotadores</div>
          {anotadores.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Sin datos aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={anotadores} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>        
                <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickFormatter={v => v.split(' ')[0]} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-hover)', borderRadius: 8, color: 'var(--text-primary)' }}
                />
                <Bar dataKey="total_anotaciones" name="Anotaciones" fill="var(--accent)" radius={[6,6,0,0]} />
                <Bar dataKey="total_asistencias" name="Asistencias" fill="var(--accent2)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Radar rendimiento */}
        <div className="card">
          <div className="card-title"><Star size={18} color="var(--accent2)" /> Rendimiento (Anotaciones + Asistencias)</div> 
          {radarData.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Sin datos aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <PolarRadiusAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Radar name="Anotaciones" dataKey="Anotaciones" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.3} />      
                <Radar name="Asistencias" dataKey="Asistencias" stroke="var(--accent2)" fill="var(--accent2)" fillOpacity={0.2} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-hover)', borderRadius: 8, color: 'var(--text-primary)' }} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Últimos entrenamientos */}
        <div className="card">
          <div className="card-title"><Dumbbell size={18} color="var(--warning)" /> Últimos Entrenamientos</div>
          {!data?.ultimos_entrenamientos?.length ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Sin entrenamientos</p>
          ) : (
            <table>
              <thead>
                <tr><th>Fecha</th><th>Tipo</th><th>Descripción</th></tr>
              </thead>
              <tbody>
                {data.ultimos_entrenamientos.map(e => (
                  <tr key={e.id}>
                    <td>{new Date(e.fecha).toLocaleDateString('es')}</td>
                    <td><span className="badge badge-purple">{e.tipo}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.descripcion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Próximos partidos */}
        <div className="card">
          <div className="card-title"><Trophy size={18} color="var(--accent2)" /> Próximos Partidos</div>
          {!data?.proximos_partidos?.length ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No hay partidos programados</p>
          ) : (
            <table>
              <thead>
                <tr><th>Fecha</th><th>Rival</th><th>Tipo</th></tr>
              </thead>
              <tbody>
                {data.proximos_partidos.map(p => (
                  <tr key={p.id}>
                    <td>{new Date(p.fecha).toLocaleDateString('es')}</td>
                    <td style={{ fontWeight: 600 }}>{p.rival}</td>
                    <td>
                      <span className={`badge ${p.tipo === 'liga' ? 'badge-green' : 'badge-orange'}`}>
                        {p.tipo}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
