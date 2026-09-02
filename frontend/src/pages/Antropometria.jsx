import { useEffect, useState } from 'react'
import {
  Plus, Trash2, Pencil, Activity, Ruler, Target, Info, ChevronRight, ChevronDown,
  Save, Calendar, TrendingUp, Award, User, Flame, Dumbbell, BarChart3, Scale, Layers
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, Legend
} from 'recharts'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSpinner from '../components/LoadingSpinner'
import Somatocarta from '../components/Somatocarta'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useDeporte } from '../context/DeporteContext'
import { formatImageUrl } from '../utils/image'

const EMPTY_ANTRO = {
  jugador_id: '',
  fecha: new Date().toISOString().split('T')[0],
  peso: '', estatura: '', imc: '',
  pliegue_biceps: '', pliegue_triceps: '', pliegue_subescapular: '', pliegue_suprailiaco: '',
  pliegue_supraespinal: '', pliegue_abdominal: '', pliegue_muslo_anterior: '', pliegue_pierna_medial: '',
  perimetro_brazo_relajado: '', perimetro_brazo_contraido: '', perimetro_muslo_medio: '', perimetro_pierna: '',
  diametro_humero: '', diametro_muneca: '', diametro_femur: '',
  porcentaje_grasa: '', masa_muscular_esqueletica: '', masa_mineral_osea: '',
  posicion_rugby: '', categoria: '', grupo: ''
}

export default function Antropometria() {
  const { tienePermiso } = useAuth()
  const { selectedSportId, selectedSport } = useDeporte()
  const puedeEditar = tienePermiso(['administrador', 'entrenador', 'personal_salud'])

  const [jugadores, setJugadores] = useState([])
  const [selectedJugador, setSelectedJugador] = useState('')
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_ANTRO)
  const [saving, setSaving] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, loading: false })
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'historial'
  const [expandedSections, setExpandedSections] = useState({
    basicas: true, pliegues: true, perimetros: false, diametros: false, clasificacion: false
  })
  const [filterPos, setFilterPos] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showAvg, setShowAvg] = useState(true)

  useEffect(() => {
    api.get('/jugadores').then(r => {
      setJugadores(r.data)
    })
  }, [])

  // Filtrar jugadores por deporte activo si aplica
  const jugadoresDisponibles = jugadores.filter(j => {
    if (selectedSportId && selectedSportId !== 'todos') {
      return String(j.disciplina_id) === String(selectedSportId)
    }
    return true
  })

  // Sincronizar jugador seleccionado cuando cambia la lista disponible
  useEffect(() => {
    if (jugadoresDisponibles.length > 0) {
      if (!selectedJugador || !jugadoresDisponibles.some(j => String(j.id) === String(selectedJugador))) {
        setSelectedJugador(String(jugadoresDisponibles[0].id))
      }
    } else {
      setSelectedJugador('')
    }
  }, [selectedSportId, jugadores])

  useEffect(() => {
    if (selectedJugador) {
      loadRegistros(selectedJugador)
    } else {
      setRegistros([])
    }
  }, [selectedJugador])

  const loadRegistros = async (id) => {
    setLoading(true)
    try {
      const r = await api.get(`/antropometria/jugador/${id}`)
      setRegistros(r.data)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const jugadorActivo = jugadores.find(j => String(j.id) === String(selectedJugador)) || null

  // Registro más reciente y registro inicial
  const ultimoRegistro = registros.length > 0 ? registros[0] : null
  const primerRegistro = registros.length > 1 ? registros[registros.length - 1] : null

  // Métricas calculadas para el dashboard individual
  const pesoActual = ultimoRegistro?.peso || jugadorActivo?.peso || null
  const estaturaActual = ultimoRegistro?.estatura || jugadorActivo?.altura || null
  const imcActual = ultimoRegistro?.imc || (pesoActual && estaturaActual ? (pesoActual / Math.pow(estaturaActual, 2)).toFixed(1) : null)
  const grasaActual = ultimoRegistro?.porcentaje_grasa || null
  const musculoActual = ultimoRegistro?.masa_muscular_esqueletica || null
  const sumPlieguesActual = ultimoRegistro?.sumatoria_pliegues || null

  // Clasificación del Somatotipo predominante
  const getSomatotypeClassification = (reg) => {
    if (!reg || reg.endomorfia === undefined) return 'Sin clasificar'
    const { endomorfia: endo, mesomorfia: meso, ectomorfia: ecto } = reg
    if (meso >= endo && meso >= ecto) {
      if (endo > ecto) return 'Meso-Endomorfo (Potencia & Masa)'
      if (ecto > endo) return 'Meso-Ectomorfo (Potencia & Agilidad)'
      return 'Mesomorfo Balanceado (Muscular y Atlético)'
    }
    if (endo >= meso && endo >= ecto) {
      if (meso > ecto) return 'Endo-Mesomorfo'
      return 'Endomorfo Predominante'
    }
    if (ecto >= meso && ecto >= endo) {
      if (meso > endo) return 'Ecto-Mesomorfo'
      return 'Ectomorfo Predominante (Longilíneo)'
    }
    return 'Somatotipo Central / Balanceado'
  }

  // Datos para gráfico de evolución temporal (invertir para orden cronológico)
  const evolutionData = [...registros].reverse().map(r => ({
    fecha: new Date(r.fecha).toLocaleDateString('es', { month: 'short', day: 'numeric' }),
    peso: Number(r.peso) || 0,
    grasa: Number(r.porcentaje_grasa) || 0,
    musculo: Number(r.masa_muscular_esqueletica) || 0,
    imc: Number(r.imc) || 0,
    sumPliegues: Number(r.sumatoria_pliegues) || 0,
    endo: Number(r.endomorfia) || 0,
    meso: Number(r.mesomorfia) || 0,
    ecto: Number(r.ectomorfia) || 0,
  }))

  // Datos para gráfico de radar de pliegues cutáneos (último registro)
  const plieguesRadarData = ultimoRegistro ? [
    { pliegue: 'Bíceps', valor: Number(ultimoRegistro.pliegue_biceps) || 0, max: 20 },
    { pliegue: 'Tríceps', valor: Number(ultimoRegistro.pliegue_triceps) || 0, max: 25 },
    { pliegue: 'Subescap.', valor: Number(ultimoRegistro.pliegue_subescapular) || 0, max: 25 },
    { pliegue: 'Suprailíaco', valor: Number(ultimoRegistro.pliegue_suprailiaco) || 0, max: 30 },
    { pliegue: 'Supraesp.', valor: Number(ultimoRegistro.pliegue_supraespinal) || 0, max: 25 },
    { pliegue: 'Abdominal', valor: Number(ultimoRegistro.pliegue_abdominal) || 0, max: 35 },
    { pliegue: 'Muslo Ant.', valor: Number(ultimoRegistro.pliegue_muslo_anterior) || 0, max: 30 },
    { pliegue: 'Pierna Med.', valor: Number(ultimoRegistro.pliegue_pierna_medial) || 0, max: 20 },
  ] : []

  // Datos para gráfico de barras de perímetros musculares
  const perimetrosData = ultimoRegistro ? [
    { nombre: 'Brazo Relajado', cm: Number(ultimoRegistro.perimetro_brazo_relajado) || 0 },
    { nombre: 'Brazo Contraído', cm: Number(ultimoRegistro.perimetro_brazo_contraido) || 0 },
    { nombre: 'Muslo Medio', cm: Number(ultimoRegistro.perimetro_muslo_medio) || 0 },
    { nombre: 'Pierna', cm: Number(ultimoRegistro.perimetro_pierna) || 0 },
  ] : []

  // Datos para Somatocarta
  const somatocartaData = registros
    .filter(r => !filterPos || r.posicion_rugby === filterPos)
    .filter(r => !filterCat || r.categoria === filterCat)
    .map(r => ({
      x: Number(r.x_somatocarta),
      y: Number(r.y_somatocarta),
      nombre: new Date(r.fecha).toLocaleDateString('es'),
      posicion: r.posicion_rugby || jugadorActivo?.posicion || 'Deportista',
      somatotipo: `${r.endomorfia} - ${r.mesomorfia} - ${r.ectomorfia}`
    }))

  const groupAverage = (showAvg && somatocartaData.length > 0) ? {
    x: Number((somatocartaData.reduce((a, b) => a + b.x, 0) / somatocartaData.length).toFixed(2)),
    y: Number((somatocartaData.reduce((a, b) => a + b.y, 0) / somatocartaData.length).toFixed(2)),
    nombre: 'Promedio Evaluaciones',
    posicion: 'General',
    somatotipo: 'Cálculo Promedio'
  } : null

  const toggleSection = (s) => setExpandedSections(prev => ({ ...prev, [s]: !prev[s] }))

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => {
      const updated = { ...f, [name]: value }
      if ((name === 'peso' || name === 'estatura') && updated.peso && updated.estatura) {
        const imc = (Number(updated.peso) / Math.pow(Number(updated.estatura), 2)).toFixed(2)
        updated.imc = imc
      }
      return updated
    })
  }

  const handleSubmit = async () => {
    if (!selectedJugador) return toast.error('Selecciona un jugador')
    setSaving(true)
    try {
      if (editId) {
        await api.put(`/antropometria/${editId}`, { ...form, jugador_id: selectedJugador })
        toast.success('Registro actualizado exitosamente')
      } else {
        await api.post('/antropometria', { ...form, jugador_id: selectedJugador })
        toast.success('Evaluación antropométrica guardada')
      }
      setModal(false)
      setEditId(null)
      loadRegistros(selectedJugador)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (reg) => {
    const formattedDate = reg.fecha ? new Date(reg.fecha).toISOString().split('T')[0] : ''
    setForm({
      ...reg,
      fecha: formattedDate,
      peso: reg.peso ?? '',
      estatura: reg.estatura ?? '',
      imc: reg.imc ?? '',
      pliegue_biceps: reg.pliegue_biceps ?? '',
      pliegue_triceps: reg.pliegue_triceps ?? '',
      pliegue_subescapular: reg.pliegue_subescapular ?? '',
      pliegue_suprailiaco: reg.pliegue_suprailiaco ?? '',
      pliegue_supraespinal: reg.pliegue_supraespinal ?? '',
      pliegue_abdominal: reg.pliegue_abdominal ?? '',
      pliegue_muslo_anterior: reg.pliegue_muslo_anterior ?? '',
      pliegue_pierna_medial: reg.pliegue_pierna_medial ?? '',
      perimetro_brazo_relajado: reg.perimetro_brazo_relajado ?? '',
      perimetro_brazo_contraido: reg.perimetro_brazo_contraido ?? '',
      perimetro_muslo_medio: reg.perimetro_muslo_medio ?? '',
      perimetro_pierna: reg.perimetro_pierna ?? '',
      diametro_humero: reg.diametro_humero ?? '',
      diametro_muneca: reg.diametro_muneca ?? '',
      diametro_femur: reg.diametro_femur ?? '',
      porcentaje_grasa: reg.porcentaje_grasa ?? '',
      masa_muscular_esqueletica: reg.masa_muscular_esqueletica ?? '',
      masa_mineral_osea: reg.masa_mineral_osea ?? '',
      posicion_rugby: reg.posicion_rugby ?? '',
      categoria: reg.categoria ?? '',
      grupo: reg.grupo ?? ''
    })
    setEditId(reg.id)
    setModal(true)
  }

  const handleDelete = (id) => {
    setDeleteModal({ isOpen: true, id, loading: false })
  }

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return
    setDeleteModal(prev => ({ ...prev, loading: true }))
    try {
      await api.delete(`/antropometria/${deleteModal.id}`)
      toast.success('Registro antropométrico eliminado')
      setDeleteModal({ isOpen: false, id: null, loading: false })
      loadRegistros(selectedJugador)
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
      setDeleteModal(prev => ({ ...prev, loading: false }))
    }
  }

  const SectionHeader = ({ id, icon: Icon, title, expanded }) => (
    <div
      onClick={() => toggleSection(id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        background: 'var(--surface-hover)',
        borderRadius: 8,
        cursor: 'pointer',
        marginBottom: 8
      }}
    >
      <Icon size={18} color="var(--accent)" />
      <span style={{ flex: 1, fontWeight: 600 }}>{title}</span>
      {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
    </div>
  )

  return (
    <div>
      {/* Encabezado del Módulo */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h2>Dashboard de Rendimiento Antropométrico</h2>
        <p>Análisis integral de composición corporal, somatotipo y evolución física individual</p>
      </div>

      {/* Barra superior de Selección de Jugador y Acciones */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 24, background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 280 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {jugadorActivo?.foto_url ? (
                <img
                  src={formatImageUrl(jugadorActivo.foto_url)}
                  alt=""
                  referrerPolicy="no-referrer"
                  style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : '👤'}
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)' }}>
                Deportista Seleccionado
              </span>
              <select
                value={selectedJugador}
                onChange={e => setSelectedJugador(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: 4,
                  padding: '7px 12px',
                  fontSize: 15,
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-hover)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="">Seleccionar Deportista...</option>
                {jugadoresDisponibles.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.nombre} {j.disciplina_nombre ? `(${j.disciplina_nombre})` : ''} - {j.posicion || 'Sin posición'}
                  </option>
                ))}
              </select>
              {selectedSportId && selectedSportId !== 'todos' && (
                <div style={{ fontSize: 11, color: 'var(--accent2)', marginTop: 4, fontWeight: 600 }}>
                  Filtrando por deporte: {selectedSport?.nombre} ({jugadoresDisponibles.length} deportistas)
                </div>
              )}
            </div>
          </div>

          {/* Selector de Pestañas y Botón Nuevo Registro */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
              <button
                onClick={() => setActiveTab('dashboard')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  background: activeTab === 'dashboard' ? 'var(--accent)' : 'transparent',
                  color: activeTab === 'dashboard' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <BarChart3 size={14} /> Dashboard Analítico
              </button>
              <button
                onClick={() => setActiveTab('historial')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  background: activeTab === 'historial' ? 'var(--accent)' : 'transparent',
                  color: activeTab === 'historial' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Calendar size={14} /> Historial ({registros.length})
              </button>
            </div>

            {puedeEditar && selectedJugador && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  const imc = (pesoActual && estaturaActual)
                    ? (Number(pesoActual) / Math.pow(Number(estaturaActual), 2)).toFixed(2)
                    : ''
                  setForm({
                    ...EMPTY_ANTRO,
                    jugador_id: selectedJugador,
                    peso: pesoActual || '',
                    estatura: estaturaActual || '',
                    imc: imc,
                    posicion_rugby: jugadorActivo?.posicion || ''
                  })
                  setEditId(null)
                  setModal(true)
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={16} /> Nueva Evaluación
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : !selectedJugador ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <User size={48} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <h3>Selecciona un deportista para ver su perfil antropométrico</h3>
        </div>
      ) : registros.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Activity size={48} color="var(--accent)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ marginBottom: 8 }}>Sin registros antropométricos para {jugadorActivo?.nombre}</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            Realiza la primera evaluación física y antropométrica para habilitar el dashboard individual y la somatocarta.
          </p>
          {puedeEditar && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setForm({
                  ...EMPTY_ANTRO,
                  jugador_id: selectedJugador,
                  peso: jugadorActivo?.peso || '',
                  estatura: jugadorActivo?.altura || '',
                  posicion_rugby: jugadorActivo?.posicion || ''
                })
                setModal(true)
              }}
            >
              <Plus size={16} /> Crear Primera Evaluación
            </button>
          )}
        </div>
      ) : activeTab === 'dashboard' ? (
        /* DASHBOARD PRINCIPAL MEJORADO */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Fila 1: Tarjetas de KPIs y Somatotipo Actual */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {/* KPI 1: Somatotipo */}
            <div className="card" style={{ padding: 18, background: 'linear-gradient(135deg, var(--surface), var(--surface-hover))', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Somatotipo Actual</span>
                <Award size={18} color="var(--accent)" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-light)' }}>
                {ultimoRegistro?.endomorfia ?? '—'} - {ultimoRegistro?.mesomorfia ?? '—'} - {ultimoRegistro?.ectomorfia ?? '—'}
              </div>
              <p style={{ fontSize: 12, color: 'var(--accent2)', marginTop: 4, fontWeight: 600 }}>
                {getSomatotypeClassification(ultimoRegistro)}
              </p>
            </div>

            {/* KPI 2: Grasa Corporal */}
            <div className="card" style={{ padding: 18, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>% Grasa Corporal</span>
                <Flame size={18} color="var(--warning)" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                {grasaActual ? `${grasaActual}%` : '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Sumatoria Pliegues: <strong style={{ color: 'var(--text-primary)' }}>{sumPlieguesActual ? `${sumPlieguesActual} mm` : '—'}</strong>
              </div>
            </div>

            {/* KPI 3: Masa Muscular */}
            <div className="card" style={{ padding: 18, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Masa Muscular</span>
                <Dumbbell size={18} color="var(--accent2)" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent2-light)' }}>
                {musculoActual ? `${musculoActual} kg` : '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {pesoActual && musculoActual ? `${((musculoActual / pesoActual) * 100).toFixed(1)}% del peso total` : 'Estimado masa esquelética'}
              </div>
            </div>

            {/* KPI 4: Peso & IMC */}
            <div className="card" style={{ padding: 18, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Peso & Estatura</span>
                <Scale size={18} color="var(--text-secondary)" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                {pesoActual ? `${pesoActual} kg` : '—'}{' '}
                <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-muted)' }}>/ {estaturaActual ? `${estaturaActual} m` : '—'}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                IMC: <strong style={{ color: 'var(--accent-light)' }}>{imcActual ?? '—'}</strong> ({Number(imcActual) < 25 ? 'Normal' : 'Sobrepeso/Masa'})
              </div>
            </div>
          </div>

          {/* Fila 2: Somatocarta Interactiva + Radar de Pliegues Cutáneos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 20 }}>
            {/* Somatocarta */}
            <div className="card" style={{ padding: 20 }}>
              <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Target size={20} color="var(--accent)" />
                  <span style={{ fontSize: 16, fontWeight: 700 }}>Somatocarta (Heath-Carter)</span>
                </div>
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={showAvg} onChange={e => setShowAvg(e.target.checked)} /> Mostrar Promedio
                </label>
              </div>
              <Somatocarta data={somatocartaData} average={groupAverage} />
            </div>

            {/* Radar de Pliegues Cutáneos (Perfil ISAK) */}
            <div className="card" style={{ padding: 20 }}>
              <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Activity size={20} color="var(--accent2)" />
                  <span style={{ fontSize: 16, fontWeight: 700 }}>Mapa de Pliegues Cutáneos (mm)</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Evaluación {ultimoRegistro ? new Date(ultimoRegistro.fecha).toLocaleDateString('es') : ''}
                </span>
              </div>

              {plieguesRadarData.length > 0 ? (
                <div style={{ width: '100%', height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={plieguesRadarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="pliegue" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <PolarRadiusAxis stroke="rgba(255,255,255,0.15)" />
                      <Radar name="Espesor (mm)" dataKey="valor" stroke="var(--accent2)" fill="var(--accent2)" fillOpacity={0.4} />
                      <Tooltip
                        contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff' }}
                        formatter={(value) => [`${value} mm`, 'Espesor']}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Sin datos de pliegues</p>
              )}
            </div>
          </div>

          {/* Fila 3: Gráfico de Evolución Temporal de Composición Corporal */}
          <div className="card" style={{ padding: 20 }}>
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TrendingUp size={20} color="var(--accent-light)" />
                <span style={{ fontSize: 16, fontWeight: 700 }}>Evolución Temporal de Composición Corporal</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {evolutionData.length} evaluaciones registradas
              </span>
            </div>

            {evolutionData.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMusculo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent2)" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="var(--accent2)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorGrasa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="var(--danger)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="fecha" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="peso" name="Peso Total (kg)" stroke="var(--accent)" fillOpacity={1} fill="url(#colorPeso)" />
                    <Area type="monotone" dataKey="musculo" name="Masa Muscular (kg)" stroke="var(--accent2)" fillOpacity={1} fill="url(#colorMusculo)" />
                    <Area type="monotone" dataKey="grasa" name="% Grasa Corporal" stroke="var(--danger)" fillOpacity={1} fill="url(#colorGrasa)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Sin datos evolutivos</p>
            )}
          </div>

          {/* Fila 4: Perímetros Musculares y Comparativa */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }}>
            {/* Perímetros */}
            <div className="card" style={{ padding: 20 }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Ruler size={20} color="var(--accent)" />
                <span style={{ fontSize: 16, fontWeight: 700 }}>Perímetros Musculares (cm)</span>
              </div>
              {perimetrosData.length > 0 ? (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perimetrosData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" stroke="var(--text-muted)" />
                      <YAxis type="category" dataKey="nombre" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                      <Bar dataKey="cm" fill="var(--accent)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Sin perímetros cargados</p>
              )}
            </div>

            {/* Ficha Rápida del Atleta */}
            <div className="card" style={{ padding: 20 }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Layers size={20} color="var(--accent2)" />
                <span style={{ fontSize: 16, fontWeight: 700 }}>Perfil y Diagnóstico Físico</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: 'var(--surface-hover)', padding: '12px 16px', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Posición / Rol:</span>
                  <p style={{ fontSize: 15, fontWeight: 700, margin: '2px 0 0', color: 'var(--accent-light)' }}>
                    {ultimoRegistro?.posicion_rugby || jugadorActivo?.posicion || 'Deportista General'}
                  </p>
                </div>
                <div style={{ background: 'var(--surface-hover)', padding: '12px 16px', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Diagnóstico Morfológico:</span>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: '2px 0 0', color: 'var(--text-primary)' }}>
                    {getSomatotypeClassification(ultimoRegistro)}
                  </p>
                </div>
                <div style={{ background: 'var(--surface-hover)', padding: '12px 16px', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sumatoria de 6 / 8 Pliegues:</span>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: '2px 0 0', color: 'var(--accent2)' }}>
                    {sumPlieguesActual ? `${sumPlieguesActual} mm (Nivel competitivo)` : 'No calculado'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* TAB HISTORIAL DE EVALUACIONES */
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Somatotipo (Endo-Meso-Ecto)</th>
                  <th>Peso (kg)</th>
                  <th>Estatura (m)</th>
                  <th>IMC</th>
                  <th>% Grasa</th>
                  <th>Masa Muscular (kg)</th>
                  <th>Sum. Pliegues (mm)</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {registros.map(r => (
                  <tr key={r.id}>
                    <td>{new Date(r.fecha).toLocaleDateString('es')}</td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-light)' }}>
                      {r.endomorfia} - {r.mesomorfia} - {r.ectomorfia}
                    </td>
                    <td>{r.peso ? `${r.peso} kg` : '—'}</td>
                    <td>{r.estatura ? `${r.estatura} m` : '—'}</td>
                    <td>{r.imc ?? '—'}</td>
                    <td>{r.porcentaje_grasa ? `${r.porcentaje_grasa}%` : '—'}</td>
                    <td>{r.masa_muscular_esqueletica ? `${r.masa_muscular_esqueletica} kg` : '—'}</td>
                    <td>{r.sumatoria_pliegues ? `${r.sumatoria_pliegues} mm` : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {puedeEditar && (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>
                              <Pencil size={13} />
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Registro Antropométrico */}
      {modal && (
        <Modal
          title={editId ? 'Editar Evaluación Antropométrica' : 'Nueva Evaluación Antropométrica'}
          onClose={() => { setModal(false); setEditId(null) }}
          width="850px"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setModal(false); setEditId(null) }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                <Save size={16} /> {saving ? 'Guardando...' : editId ? 'Actualizar Evaluación' : 'Guardar Evaluación'}
              </button>
            </>
          }
        >
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 10 }}>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Fecha de la toma de medidas *</label>
              <input type="date" name="fecha" value={form.fecha} onChange={handleChange} />
            </div>

            {/* A. Medidas Básicas */}
            <SectionHeader id="basicas" icon={Ruler} title="Medidas Básicas" expanded={expandedSections.basicas} />
            {expandedSections.basicas && (
              <div className="form-grid" style={{ marginBottom: 20 }}>
                <div className="form-group"><label>Estatura (m)</label><input type="number" step="0.01" name="estatura" value={form.estatura} onChange={handleChange} placeholder="1.80" /></div>
                <div className="form-group"><label>Peso (kg)</label><input type="number" step="0.1" name="peso" value={form.peso} onChange={handleChange} placeholder="78.5" /></div>
                <div className="form-group"><label>IMC Calculado</label><input type="number" name="imc" value={form.imc} readOnly style={{ background: 'var(--surface-hover)' }} /></div>
              </div>
            )}

            {/* B. Pliegues Cutáneos */}
            <SectionHeader id="pliegues" icon={Activity} title="Pliegues Cutáneos (mm) - Protocolo ISAK" expanded={expandedSections.pliegues} />
            {expandedSections.pliegues && (
              <div className="form-grid" style={{ marginBottom: 20 }}>
                <div className="form-group"><label>Bíceps</label><input type="number" step="0.1" name="pliegue_biceps" value={form.pliegue_biceps} onChange={handleChange} /></div>
                <div className="form-group"><label>Tríceps</label><input type="number" step="0.1" name="pliegue_triceps" value={form.pliegue_triceps} onChange={handleChange} /></div>
                <div className="form-group"><label>Subescapular</label><input type="number" step="0.1" name="pliegue_subescapular" value={form.pliegue_subescapular} onChange={handleChange} /></div>
                <div className="form-group"><label>Suprailíaco</label><input type="number" step="0.1" name="pliegue_suprailiaco" value={form.pliegue_suprailiaco} onChange={handleChange} /></div>
                <div className="form-group"><label>Supraespinal</label><input type="number" step="0.1" name="pliegue_supraespinal" value={form.pliegue_supraespinal} onChange={handleChange} /></div>
                <div className="form-group"><label>Abdominal</label><input type="number" step="0.1" name="pliegue_abdominal" value={form.pliegue_abdominal} onChange={handleChange} /></div>
                <div className="form-group"><label>Muslo Anterior</label><input type="number" step="0.1" name="pliegue_muslo_anterior" value={form.pliegue_muslo_anterior} onChange={handleChange} /></div>
                <div className="form-group"><label>Pierna Medial</label><input type="number" step="0.1" name="pliegue_pierna_medial" value={form.pliegue_pierna_medial} onChange={handleChange} /></div>
              </div>
            )}

            {/* C. Perímetros */}
            <SectionHeader id="perimetros" icon={Target} title="Perímetros Musculares (cm)" expanded={expandedSections.perimetros} />
            {expandedSections.perimetros && (
              <div className="form-grid" style={{ marginBottom: 20 }}>
                <div className="form-group"><label>Brazo Relajado</label><input type="number" step="0.1" name="perimetro_brazo_relajado" value={form.perimetro_brazo_relajado} onChange={handleChange} /></div>
                <div className="form-group"><label>Brazo Contraído</label><input type="number" step="0.1" name="perimetro_brazo_contraido" value={form.perimetro_brazo_contraido} onChange={handleChange} /></div>
                <div className="form-group"><label>Muslo Medio</label><input type="number" step="0.1" name="perimetro_muslo_medio" value={form.perimetro_muslo_medio} onChange={handleChange} /></div>
                <div className="form-group"><label>Pierna</label><input type="number" step="0.1" name="perimetro_pierna" value={form.perimetro_pierna} onChange={handleChange} /></div>
              </div>
            )}

            {/* D. Diámetros */}
            <SectionHeader id="diametros" icon={Info} title="Diámetros Óseos (cm)" expanded={expandedSections.diametros} />
            {expandedSections.diametros && (
              <div className="form-grid" style={{ marginBottom: 20 }}>
                <div className="form-group"><label>Húmero</label><input type="number" step="0.1" name="diametro_humero" value={form.diametro_humero} onChange={handleChange} /></div>
                <div className="form-group"><label>Muñeca</label><input type="number" step="0.1" name="diametro_muneca" value={form.diametro_muneca} onChange={handleChange} /></div>
                <div className="form-group"><label>Fémur</label><input type="number" step="0.1" name="diametro_femur" value={form.diametro_femur} onChange={handleChange} /></div>
              </div>
            )}

            {/* E. Clasificación & Categoría */}
            <SectionHeader id="clasificacion" icon={Info} title="Clasificación y Posición Deportiva" expanded={expandedSections.clasificacion} />
            {expandedSections.clasificacion && (
              <div className="form-grid">
                <div className="form-group">
                  <label>Posición Específica</label>
                  <input
                    type="text"
                    name="posicion_rugby"
                    value={form.posicion_rugby}
                    onChange={handleChange}
                    placeholder="Ej. Enlace, Delantero, Ala, Penetrador..."
                  />
                </div>
                <div className="form-group">
                  <label>Grupo / Línea</label>
                  <input
                    type="text"
                    name="grupo"
                    value={form.grupo}
                    onChange={handleChange}
                    placeholder="Ej. Delanteros, Tres cuartos, Ofensiva..."
                  />
                </div>
                <div className="form-group">
                  <label>Categoría</label>
                  <input
                    type="text"
                    name="categoria"
                    value={form.categoria}
                    onChange={handleChange}
                    placeholder="Ej: M19, Primera División, Sub-20..."
                  />
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal de confirmación para eliminar evaluación */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="¿Eliminar registro antropométrico?"
        message="¿Estás seguro de que deseas eliminar esta evaluación física y antropométrica? Esta acción no se puede deshacer."
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        confirmVariant="danger"
        loading={deleteModal.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, loading: false })}
      />
    </div>
  )
}
