import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Activity, Trophy, Dumbbell, Goal, Star, Plus, Trash2,
  ChevronRight, ArrowRight, Sparkles, Filter, ShieldCheck, CheckCircle2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import StatCard from '../components/StatCard'
import LoadingSpinner from '../components/LoadingSpinner'
import Modal from '../components/Modal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useDeporte } from '../context/DeporteContext'
import toast from 'react-hot-toast'

const ROL_LABELS = {
  administrador: 'Administrador',
  entrenador: 'Entrenador',
  personal_salud: 'Personal Salud',
  jugador: 'Jugador',
}

export default function Dashboard() {
  const { usuario, tienePermiso } = useAuth()
  const {
    disciplinas,
    selectedSportId,
    selectedSport,
    setSelectedSportId,
    crearDisciplina,
    eliminarDisciplina,
    puedeGestionarDeportes
  } = useDeporte()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Modales de Gestión de Deporte
  const [modalNuevoDeporte, setModalNuevoDeporte] = useState(false)
  const [nuevoDeporteNombre, setNuevoDeporteNombre] = useState('')
  const [creandoDeporte, setCreandoDeporte] = useState(false)

  const [modalEliminarDeporte, setModalEliminarDeporte] = useState(false)
  const [deporteAEliminar, setDeporteAEliminar] = useState(null)
  const [eliminandoDeporte, setEliminandoDeporte] = useState(false)

  const fetchDashboardData = useCallback(async (sportId) => {
    setLoading(true)
    try {
      const q = sportId && sportId !== 'todos' ? `?disciplina_id=${sportId}` : ''
      const res = await api.get(`/dashboard${q}`)
      setData(res.data)
    } catch (err) {
      console.error('Error al cargar dashboard:', err)
      toast.error('Error al cargar datos del dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData(selectedSportId)
  }, [selectedSportId, fetchDashboardData])

  // Manejar creación de deporte
  const handleCrearDeporte = async (e) => {
    e?.preventDefault()
    if (!nuevoDeporteNombre.trim()) return toast.error('Ingresa el nombre del deporte')
    setCreandoDeporte(true)
    try {
      await crearDisciplina(nuevoDeporteNombre.trim())
      setNuevoDeporteNombre('')
      setModalNuevoDeporte(false)
    } catch (err) {
      // toast ya manejado en contexto
    } finally {
      setCreandoDeporte(false)
    }
  }

  // Manejar eliminación de deporte
  const handleConfirmarEliminar = async () => {
    if (!deporteAEliminar) return
    setEliminandoDeporte(true)
    try {
      await eliminarDisciplina(deporteAEliminar.id, deporteAEliminar.nombre)
      setModalEliminarDeporte(false)
      setDeporteAEliminar(null)
    } catch (err) {
      // toast ya manejado en contexto
    } finally {
      setEliminandoDeporte(false)
    }
  }

  const abrirModalEliminar = (d, e) => {
    e.stopPropagation()
    setDeporteAEliminar(d)
    setModalEliminarDeporte(true)
  }

  const anotadores = data?.top_anotadores || []
  const radarData  = anotadores.slice(0, 5).map(a => ({
    name: a.nombre.split(' ')[0],
    Anotaciones: Number(a.total_anotaciones),
    Asistencias: Number(a.total_asistencias), 
  }))

  const esTodos = !selectedSportId || selectedSportId === 'todos'

  return (
    <div>
      {/* Header Principal */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h2>Hola, {usuario?.nombre || 'Usuario'} - {ROL_LABELS[usuario?.rol] || usuario?.rol}</h2>
        <p>Centro de mando y gestión deportiva en tiempo real</p>
      </div>

      {/* SECCIÓN PRINCIPAL: Selector y Gestión Global de Deportes */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          padding: '20px 24px',
          background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg-secondary) 100%)',
          border: '1px solid var(--border-hover)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(108, 99, 255, 0.25)',
              }}
            >
              <Trophy size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent2)' }}>
                  Deporte en Gestión Activa
                </span>
                <span
                  style={{
                    fontSize: 11,
                    background: 'var(--accent2-glow)',
                    color: 'var(--accent2)',
                    padding: '1px 8px',
                    borderRadius: 12,
                    fontWeight: 600,
                  }}
                >
                  Filtro Global
                </span>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>
                {esTodos ? '🌐 Vista General (Todos los Deportes)' : `🏅 ${selectedSport?.nombre || 'Deporte Seleccionado'}`}
              </h3>
            </div>
          </div>

          {/* Botones de acción para Roles autorizados */}
          {puedeGestionarDeportes && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => setModalNuevoDeporte(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}
                title="Crear un nuevo deporte o disciplina para el club"
              >
                <Plus size={16} /> Crear Deporte
              </button>
            </div>
          )}
        </div>

        {/* Explicación de filtrado global */}
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
          Al seleccionar un deporte aquí, <strong>todos los módulos del sistema</strong> (Jugadores, Antropometría, Evaluaciones, Asistencia, Lesiones y Estadísticas) se adaptarán y filtrarán automáticamente para mostrar únicamente la información correspondiente a dicha disciplina.
        </p>

        {/* Tarjetas / Chips de Selección de Deportes */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'stretch' }}>
          {/* Opción Todos los deportes */}
          <div
            onClick={() => setSelectedSportId('todos')}
            style={{
              flex: '1 1 160px',
              maxWidth: 220,
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: esTodos ? '2px solid var(--accent)' : '1px solid var(--border)',
              background: esTodos ? 'rgba(108, 99, 255, 0.12)' : 'var(--surface)',
              cursor: 'pointer',
              transition: 'var(--transition)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>🌐</span>
              {esTodos && <CheckCircle2 size={16} color="var(--accent)" />}
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: esTodos ? 'var(--accent-light)' : 'var(--text-primary)' }}>
              Todos los deportes
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Vista consolidada
            </div>
          </div>

          {/* Listado de deportes registrados */}
          {disciplinas.map(d => {
            const isSelected = String(d.id) === String(selectedSportId)
            const count = d.total_jugadores || 0

            return (
              <div
                key={d.id}
                onClick={() => setSelectedSportId(String(d.id))}
                style={{
                  flex: '1 1 180px',
                  maxWidth: 240,
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '2px solid var(--accent2)' : '1px solid var(--border)',
                  background: isSelected ? 'rgba(0, 212, 170, 0.12)' : 'var(--surface)',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>🏅</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isSelected && <CheckCircle2 size={16} color="var(--accent2)" />}
                    {puedeGestionarDeportes && (
                      <button
                        onClick={(e) => abrirModalEliminar(d, e)}
                        title={`Eliminar disciplina "${d.nombre}"`}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          padding: 2,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: 4,
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ fontWeight: 700, fontSize: 14, color: isSelected ? 'var(--accent2)' : 'var(--text-primary)' }}>
                  {d.nombre}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {count} {count === 1 ? 'deportista' : 'deportistas'}
                  </span>
                  {isSelected && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent2)', textTransform: 'uppercase' }}>
                      Activo
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Indicador de estado y Métricas */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Tarjetas resumen con filtro aplicado */}
          <div className="stats-grid">
            <StatCard
              label={esTodos ? 'Total Jugadores' : `Jugadores (${selectedSport?.nombre})`}
              value={data?.total_jugadores}
              icon={<Users size={22} color="#6c63ff" />}
              color="var(--accent)"
            />
            <StatCard
              label={esTodos ? 'Lesiones Activas' : `Lesiones (${selectedSport?.nombre})`}
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

          {/* Accesos rápidos filtrados para el deporte actual */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            <Link
              to="/jugadores"
              className="card"
              style={{
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                transition: 'var(--transition)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Users size={18} color="var(--accent)" />
                <span style={{ fontWeight: 600, fontSize: 13 }}>Ver Plantel ({selectedSport?.nombre || 'Deporte'})</span>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </Link>

            <Link
              to="/antropometria"
              className="card"
              style={{
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                transition: 'var(--transition)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Activity size={18} color="var(--accent2)" />
                <span style={{ fontWeight: 600, fontSize: 13 }}>Antropometría & Somatotipo</span>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </Link>

            <Link
              to="/evaluaciones"
              className="card"
              style={{
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                transition: 'var(--transition)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Star size={18} color="var(--warning)" />
                <span style={{ fontWeight: 600, fontSize: 13 }}>Evaluaciones Físicas</span>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </Link>

            <Link
              to="/asistencia"
              className="card"
              style={{
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                transition: 'var(--transition)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Dumbbell size={18} color="var(--accent)" />
                <span style={{ fontWeight: 600, fontSize: 13 }}>Control de Asistencia</span>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </Link>
          </div>

          {/* Gráficos y Tablas del Dashboard */}
          <div className="dashboard-grid">
            {/* Top Anotadores */}
            <div className="card">
              <div className="card-title">
                <Goal size={18} color="var(--accent)" /> Top Anotadores {esTodos ? '' : `(${selectedSport?.nombre})`}
              </div>
              {anotadores.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px 0' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    Sin registros de anotaciones {esTodos ? '' : `en ${selectedSport?.nombre}`}
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={anotadores} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>        
                    <XAxis
                      dataKey="nombre"
                      tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                      tickFormatter={v => v.split(' ')[0]}
                    />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border-hover)',
                        borderRadius: 8,
                        color: 'var(--text-primary)'
                      }}
                    />
                    <Bar dataKey="total_anotaciones" name="Anotaciones" fill="var(--accent)" radius={[6,6,0,0]} />
                    <Bar dataKey="total_asistencias" name="Asistencias" fill="var(--accent2)" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Radar Rendimiento */}
            <div className="card">
              <div className="card-title">
                <Star size={18} color="var(--accent2)" /> Rendimiento (Anotaciones + Asistencias)
              </div> 
              {radarData.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px 0' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    Sin datos de rendimiento {esTodos ? '' : `en ${selectedSport?.nombre}`}
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <PolarRadiusAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Radar name="Anotaciones" dataKey="Anotaciones" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.3} />      
                    <Radar name="Asistencias" dataKey="Asistencias" stroke="var(--accent2)" fill="var(--accent2)" fillOpacity={0.2} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border-hover)',
                        borderRadius: 8,
                        color: 'var(--text-primary)'
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Últimos entrenamientos */}
            <div className="card">
              <div className="card-title">
                <Dumbbell size={18} color="var(--warning)" /> Últimos Entrenamientos
              </div>
              {!data?.ultimos_entrenamientos?.length ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Sin entrenamientos registrados</p>
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
              <div className="card-title">
                <Trophy size={18} color="var(--accent2)" /> Próximos Partidos
              </div>
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
        </>
      )}

      {/* MODAL: Crear Nuevo Deporte */}
      {modalNuevoDeporte && (
        <Modal
          title="Crear Nuevo Deporte o Disciplina"
          onClose={() => setModalNuevoDeporte(false)}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, width: '100%' }}>
              <button className="btn btn-ghost" onClick={() => setModalNuevoDeporte(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCrearDeporte}
                disabled={creandoDeporte || !nuevoDeporteNombre.trim()}
              >
                {creandoDeporte ? 'Creando...' : 'Crear y Gestionar'}
              </button>
            </div>
          }
        >
          <form onSubmit={handleCrearDeporte} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Como Director Técnico (Administrador) o Entrenador, ingresa el nombre de la nueva disciplina deportiva que deseas gestionar (ej. Rugby, Fútbol Sala, Baloncesto, Atletismo, etc.).
            </p>
            <div className="form-group">
              <label>Nombre de la Disciplina *</label>
              <input
                type="text"
                placeholder="Ej. Rugby, Baloncesto, Fútbol Sala, Natación..."
                value={nuevoDeporteNombre}
                onChange={e => setNuevoDeporteNombre(e.target.value)}
                autoFocus
              />
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Confirmar Eliminación de Deporte */}
      {modalEliminarDeporte && deporteAEliminar && (
        <Modal
          title={`Eliminar Deporte: ${deporteAEliminar.nombre}`}
          onClose={() => { setModalEliminarDeporte(false); setDeporteAEliminar(null) }}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, width: '100%' }}>
              <button
                className="btn btn-ghost"
                onClick={() => { setModalEliminarDeporte(false); setDeporteAEliminar(null) }}
                disabled={eliminandoDeporte}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmarEliminar}
                disabled={eliminandoDeporte}
              >
                {eliminandoDeporte ? 'Eliminando...' : 'Sí, Eliminar Deporte'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>
              ¿Estás seguro de que deseas eliminar la disciplina deportiva <strong>{deporteAEliminar.nombre}</strong>?
            </p>
            <div
              style={{
                background: 'rgba(231, 76, 60, 0.1)',
                border: '1px solid rgba(231, 76, 60, 0.3)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                color: 'var(--danger)',
              }}
            >
              ⚠️ Los deportistas asociados a este deporte no serán eliminados de la plataforma, pero quedarán sin disciplina asignada hasta que los reasignes.
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
