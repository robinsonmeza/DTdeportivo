import { useEffect, useState, useRef } from 'react'
import { Plus, Pencil, Trash2, Users, Eye, Camera, Activity, Target, Upload, Trophy, Sparkles, Filter, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSpinner from '../components/LoadingSpinner'
import ImportCsvModal from '../components/ImportCsvModal'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useDeporte } from '../context/DeporteContext'
import { formatImageUrl } from '../utils/image'

const EMPTY = { nombre: '', edad: '', posicion: '', peso: '', altura: '', equipo_id: '', disciplina_id: '' }

// Sugerencias de posiciones comunes según el deporte
const POSICIONES_POR_DEPORTE = {
  'Rugby': ['Penetrador', 'Enlace', 'Trasportador', 'Wing', 'Forward', 'Back', 'Ala', 'Pilar', 'Hooker', 'Segunda Línea', 'Medio Melé', 'Apertura', 'Centro', 'Zaguero'],
  'Fútbol': ['Portero', 'Defensa Central', 'Lateral Derecho', 'Lateral Izquierdo', 'Mediocampista Defensivo', 'Mediocampista Ofensivo', 'Extremo Derecho', 'Extremo Izquierdo', 'Delantero Centro'],
  'Fútbol Sala': ['Portero', 'Cierre', 'Ala', 'Pívot', 'Universal'],
  'Baloncesto': ['Base (Point Guard)', 'Escolta (Shooting Guard)', 'Alero (Small Forward)', 'Ala-Pívot (Power Forward)', 'Pívot (Center)'],
  'Voleibol': ['Colocador / Armador', 'Opuesto', 'Receptor / Punta', 'Central', 'Líbero'],
  'Atletismo': ['Velocista (100m/200m)', 'Medio Fondo (800m/1500m)', 'Fondo (5k/10k/Maratón)', 'Saltador', 'Lanzador', 'Vallista'],
  'Natación': ['Estilo Libre / Crol', 'Espalda', 'Pecho / Braza', 'Mariposa', 'Combinado'],
  'Hockey': ['Arquero', 'Defensor', 'Volante', 'Delantero'],
}

export default function Jugadores() {
  const { tienePermiso, usuario } = useAuth()
  const puedeEditar = tienePermiso(['administrador', 'entrenador'])
  const {
    disciplinas,
    selectedSportId,
    selectedSport,
    setSelectedSportId,
    crearDisciplina,
    cargarDisciplinas,
  } = useDeporte()

  const [jugadores, setJugadores]         = useState([])
  const [equipos, setEquipos]             = useState([])
  
  // Nuevo deporte modal
  const [nuevoDeporteNombre, setNuevoDeporteNombre] = useState('')
  const [creandoDeporte, setCreandoDeporte] = useState(false)

  // Búsqueda y filtrado
  const [searchTerm, setSearchTerm]       = useState('')

  // Modales
  const [modal, setModal]                 = useState(false)
  const [modalFicha, setModalFicha]       = useState(false)
  const [modalCsv, setModalCsv]           = useState(false)
  const [modalNuevoDeporte, setModalNuevoDeporte] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [deleteModal, setDeleteModal]     = useState({ isOpen: false, id: null, nombre: '', loading: false })
  
  // Formulario de jugador
  const [form, setForm]                   = useState(EMPTY)
  const [editId, setEditId]               = useState(null)
  const [saving, setSaving]               = useState(false)
  const [modoAsociacion, setModoAsociacion] = useState('disciplina') // default to selected sport
  const fileInputRef = useRef(null)
  const [loading, setLoading]             = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [jRes, eRes] = await Promise.all([
        api.get('/jugadores'),
        api.get('/equipos'),
      ])
      setJugadores(jRes.data)
      setEquipos(eRes.data)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Deporte activo actualmente
  const currentSport = selectedSport

  // Jugadores filtrados por deporte y por término de búsqueda
  const filteredJugadores = jugadores.filter(j => {
    // Si hay un deporte seleccionado (y no es 'todos')
    if (selectedSportId && selectedSportId !== 'todos') {
      const matchDisciplina = String(j.disciplina_id) === String(selectedSportId)
      if (!matchDisciplina) return false
    }
    // Filtro de texto
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      const matchNombre = j.nombre?.toLowerCase().includes(term)
      const matchPos = j.posicion?.toLowerCase().includes(term)
      const matchEquipo = j.equipo_nombre?.toLowerCase().includes(term)
      return matchNombre || matchPos || matchEquipo
    }
    return true
  })

  // Obtener lista de posiciones sugeridas según el deporte seleccionado
  const currentPositions = (currentSport?.nombre && POSICIONES_POR_DEPORTE[currentSport.nombre]) 
    ? POSICIONES_POR_DEPORTE[currentSport.nombre] 
    : ['Penetrador', 'Wing', 'Enlace', 'Trasportador', 'Forward', 'Back', 'Ala', 'Delantero', 'Mediocampo', 'Defensa', 'Portero']

  // Crear nuevo deporte
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

  const openCreate = () => {
    setForm({
      ...EMPTY,
      disciplina_id: selectedSportId !== 'todos' ? selectedSportId : (disciplinas[0]?.id || '')
    })
    setEditId(null)
    setModoAsociacion('disciplina')
    setModal(true)
  }

  const openEdit = (j) => {
    setForm({
      nombre: j.nombre,
      edad: j.edad ?? '',
      posicion: j.posicion ?? '',
      peso: j.peso ?? '',
      altura: j.altura ?? '',
      equipo_id: j.equipo_id ?? '',
      disciplina_id: j.disciplina_id ?? (selectedSportId !== 'todos' ? selectedSportId : ''),
    })
    setModoAsociacion(j.disciplina_id ? 'disciplina' : (j.equipo_id ? 'equipo' : 'disciplina'))
    setEditId(j.id)
    setModal(true)
  }

  const closeModal = () => {
    setModal(false)
    setModalFicha(false)
    setSelectedPlayer(null)
  }

  const openFicha = async (id) => {
    try {
      const res = await api.get(`/jugadores/${id}`)
      setSelectedPlayer(res.data)
      setModalFicha(true)
    } catch {
      toast.error('Error al cargar la ficha del deportista')
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('foto', file)
    try {
      const res = await api.post(`/jugadores/${selectedPlayer.id}/foto`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSelectedPlayer(prev => ({ ...prev, foto_url: res.data.foto_url }))
      toast.success('Foto actualizada con éxito')
      loadData()
    } catch {
      toast.error('Error al subir la foto')
    }
  }

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    setSaving(true)

    const payload = { ...form }
    if (modoAsociacion === 'equipo') {
      if (!payload.equipo_id) payload.equipo_id = null
    } else {
      if (!payload.disciplina_id) payload.disciplina_id = selectedSportId !== 'todos' ? selectedSportId : null
    }

    try {
      if (editId) {
        await api.put(`/jugadores/${editId}`, payload)
        toast.success('Deportista actualizado')
      } else {
        await api.post('/jugadores', payload)
        toast.success('Deportista registrado con éxito')
      }
      closeModal()
      loadData()
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id, nombre) => {
    setDeleteModal({ isOpen: true, id, nombre, loading: false })
  }

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return
    setDeleteModal(prev => ({ ...prev, loading: true }))
    try {
      await api.delete(`/jugadores/${deleteModal.id}`)
      toast.success(`Deportista ${deleteModal.nombre || ''} eliminado correctamente`)
      setDeleteModal({ isOpen: false, id: null, nombre: '', loading: false })
      loadData()
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
      setDeleteModal(prev => ({ ...prev, loading: false }))
    }
  }

  return (
    <div>
      {/* Header con título y descripción */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h2>Gestión de Deportistas</h2>
        <p>Selecciona y administra los deportistas por deporte o disciplina</p>
      </div>

      {/* Selector de Deporte / Disciplina interactivo */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 24, background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Trophy size={20} />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent2)' }}>
                Deporte en Gestión
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                <select
                  value={selectedSportId}
                  onChange={e => setSelectedSportId(e.target.value)}
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-hover)',
                    cursor: 'pointer',
                    minWidth: 200
                  }}
                >
                  <option value="todos">🌐 Todos los deportes ({jugadores.length})</option>
                  {disciplinas.map(d => {
                    const count = jugadores.filter(j => String(j.disciplina_id) === String(d.id)).length
                    return (
                      <option key={d.id} value={d.id}>
                        🏅 {d.nombre} ({count} deportistas)
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Botones de acción: Crear deporte, Importar CSV, Nuevo Jugador */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            {puedeEditar && (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={() => setModalNuevoDeporte(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                  title="Crear un nuevo deporte o disciplina"
                >
                  <Trophy size={15} color="var(--accent2)" /> + Crear Deporte
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={() => setModalCsv(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                  title="Importación masiva desde archivo CSV"
                >
                  <Upload size={15} color="var(--accent)" /> Importar CSV
                </button>

                <button
                  className="btn btn-primary"
                  onClick={openCreate}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={16} /> Nuevo Deportista
                </button>
              </>
            )}
          </div>
        </div>

        {/* Chips de acceso rápido para deportes */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginRight: 4 }}>
            Deportes rápidos:
          </span>
          <button
            onClick={() => setSelectedSportId('todos')}
            style={{
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: selectedSportId === 'todos' ? 700 : 500,
              background: selectedSportId === 'todos' ? 'var(--accent)' : 'var(--surface-hover)',
              color: selectedSportId === 'todos' ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
          >
            Todos
          </button>
          {disciplinas.map(d => {
            const isSelected = String(d.id) === String(selectedSportId)
            return (
              <button
                key={d.id}
                onClick={() => setSelectedSportId(String(d.id))}
                style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? 'linear-gradient(135deg, var(--accent), var(--accent2))' : 'var(--surface-hover)',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                  border: isSelected ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                {d.nombre}
              </button>
            )
          })}
        </div>
      </div>

      {/* Barra de herramientas / buscador */}
      <div className="page-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          <Users size={15} style={{ display: 'inline', marginRight: 6 }} />
          Mostrando <strong>{filteredJugadores.length}</strong> deportistas{' '}
          {currentSport ? `en ${currentSport.nombre}` : 'en total'}
        </span>

        <div style={{ maxWidth: 300, width: '100%' }}>
          <input
            type="text"
            placeholder="Buscar por nombre o posición..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px',
              fontSize: 13,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)'
            }}
          />
        </div>
      </div>

      {/* Tabla de Jugadores */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <LoadingSpinner />
        ) : filteredJugadores.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div className="empty-state-icon" style={{ fontSize: 48, marginBottom: 12 }}>🏃‍♂️</div>
            <h3 style={{ fontSize: 16, marginBottom: 6 }}>
              {currentSport ? `No hay deportistas registrados en ${currentSport.nombre}` : 'No se encontraron deportistas'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
              {puedeEditar
                ? 'Puedes registrar un nuevo deportista manualmente o importar un lote con un archivo CSV.'
                : 'No hay registros disponibles con el filtro actual.'}
            </p>
            {puedeEditar && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={openCreate}>
                  <Plus size={16} /> Registrar Deportista
                </button>
                <button className="btn btn-secondary" onClick={() => setModalCsv(true)}>
                  <Upload size={16} /> Importar CSV
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Deportista</th>
                  <th>Edad</th>
                  <th>Posición</th>
                  <th>Deporte / Disciplina</th>
                  <th>Equipo</th>
                  <th>Peso (kg)</th>
                  <th>Altura (m)</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredJugadores.map((j, i) => (
                  <tr key={j.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {j.foto_url ? (
                          <img
                            src={formatImageUrl(j.foto_url)}
                            alt={j.nombre}
                            referrerPolicy="no-referrer"
                            style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background: 'var(--surface-hover)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 14
                            }}
                          >
                            👤
                          </div>
                        )}
                        <span>{j.nombre}</span>
                      </div>
                    </td>
                    <td>{j.edad ? `${j.edad} años` : '—'}</td>
                    <td>
                      {j.posicion ? (
                        <span className="badge badge-purple">{j.posicion}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {j.disciplina_nombre ? (
                        <span className="badge badge-green">🎯 {j.disciplina_nombre}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>General</span>
                      )}
                    </td>
                    <td>
                      {j.equipo_nombre ? (
                        <span className="badge badge-blue">🏆 {j.equipo_nombre}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>{j.peso ? `${j.peso} kg` : '—'}</td>
                    <td>{j.altura ? `${j.altura} m` : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openFicha(j.id)}>
                          <Eye size={13} /> Ficha
                        </button>
                        {puedeEditar && (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(j)}>
                              <Pencil size={13} />
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(j.id, j.nombre)}>
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
        )}
      </div>

      {/* Modal Crear Deporte */}
      {modalNuevoDeporte && (
        <Modal
          title="Crear Nuevo Deporte / Disciplina"
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
                {creandoDeporte ? 'Guardando...' : 'Crear Deporte'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Como Director Técnico o Entrenador, puedes agregar nuevas disciplinas deportivas (ej. Rugby, Fútbol Sala, Baloncesto, Atletismo, etc.) para luego organizar y filtrar a tus deportistas.
            </p>
            <div className="form-group">
              <label>Nombre del deporte o disciplina *</label>
              <input
                type="text"
                placeholder="Ej. Rugby, Fútbol Sala, Natación, Balonmano..."
                value={nuevoDeporteNombre}
                onChange={e => setNuevoDeporteNombre(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Importar CSV */}
      <ImportCsvModal
        isOpen={modalCsv}
        onClose={() => setModalCsv(false)}
        onSuccess={loadData}
        disciplinas={disciplinas}
        equipos={equipos}
      />

      {/* Modal Ficha Técnica */}
      {modalFicha && selectedPlayer && (
        <Modal title={`Ficha Deportiva: ${selectedPlayer.nombre}`} onClose={closeModal} width="800px">
          <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1/1',
                  background: 'var(--surface-hover)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  border: '1px solid var(--border)'
                }}
              >
                {selectedPlayer.foto_url ? (
                  <img
                    src={formatImageUrl(selectedPlayer.foto_url)}
                    alt={selectedPlayer.nombre}
                    referrerPolicy="no-referrer"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 64
                    }}
                  >
                    👤
                  </div>
                )}
                {puedeEditar && (
                  <button
                    onClick={() => fileInputRef.current.click()}
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      right: 12,
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      border: 'none',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                    title="Subir foto del deportista"
                  >
                    <Camera size={20} />
                  </button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                  accept="image/*"
                />
              </div>
              <div className="card" style={{ padding: 16 }}>
                <h3 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Datos Generales
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 14 }}><strong>Edad:</strong> {selectedPlayer.edad ? `${selectedPlayer.edad} años` : '—'}</p>
                  <p style={{ fontSize: 14 }}><strong>Posición:</strong> <span className="badge badge-purple">{selectedPlayer.posicion || '—'}</span></p>
                  <p style={{ fontSize: 14 }}><strong>Deporte:</strong> <span className="badge badge-green">{selectedPlayer.disciplina_nombre || 'General'}</span></p>
                  <p style={{ fontSize: 14 }}><strong>Equipo:</strong> {selectedPlayer.equipo_nombre || '—'}</p>
                  <p style={{ fontSize: 14 }}><strong>Peso:</strong> {selectedPlayer.peso ? `${selectedPlayer.peso} kg` : '—'}</p>
                  <p style={{ fontSize: 14 }}><strong>Altura:</strong> {selectedPlayer.altura ? `${selectedPlayer.altura} m` : '—'}</p>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <Activity size={18} color="var(--accent)" />
                  <h3 style={{ fontSize: 16 }}>Resumen Antropométrico</h3>
                </div>
                {selectedPlayer.ultima_antropometria ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: 'var(--surface-hover)', padding: 12, borderRadius: 8 }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Somatotipo</p>
                      <p style={{ fontSize: 16, fontWeight: 700 }}>
                        {selectedPlayer.ultima_antropometria.endomorfia} - {selectedPlayer.ultima_antropometria.mesomorfia} - {selectedPlayer.ultima_antropometria.ectomorfia}
                      </p>
                    </div>
                    <div style={{ background: 'var(--surface-hover)', padding: 12, borderRadius: 8 }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>% Grasa Corporal</p>
                      <p style={{ fontSize: 16, fontWeight: 700 }}>{selectedPlayer.ultima_antropometria.porcentaje_grasa}%</p>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
                    No hay registros antropométricos aún.
                  </p>
                )}
              </div>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <Target size={18} color="var(--accent2)" />
                  <h3 style={{ fontSize: 16 }}>Evaluación de Rendimiento</h3>
                </div>
                {selectedPlayer.ultima_evaluacion ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div style={{ background: 'var(--surface-hover)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Score</p>
                      <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent2)' }}>
                        {selectedPlayer.ultima_evaluacion.score_general}
                      </p>
                    </div>
                    <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>Sprint 30m:</span> {selectedPlayer.ultima_evaluacion.sprint_30m}s</div>
                      <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>Salto vertical:</span> {selectedPlayer.ultima_evaluacion.salto_vertical}cm</div>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
                    No hay evaluaciones físicas registradas.
                  </p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Crear / Editar Jugador */}
      {modal && (
        <Modal
          title={editId ? 'Editar Deportista' : 'Registrar Nuevo Deportista'}
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Guardando…' : editId ? 'Actualizar' : 'Guardar Deportista'}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Nombre completo *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej. Carlos Méndez" autoFocus />
            </div>

            <div className="form-group">
              <label>Deporte / Disciplina</label>
              <select name="disciplina_id" value={form.disciplina_id} onChange={handleChange}>
                <option value="">Seleccionar deporte…</option>
                {disciplinas.map(d => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Posición en el campo</label>
              <input
                list="posiciones-sugeridas"
                name="posicion"
                value={form.posicion}
                onChange={handleChange}
                placeholder="Selecciona o escribe la posición..."
              />
              <datalist id="posiciones-sugeridas">
                {currentPositions.map(p => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div className="form-group">
              <label>Edad (años)</label>
              <input name="edad" type="number" min="10" max="60" value={form.edad} onChange={handleChange} placeholder="22" />
            </div>

            <div className="form-group">
              <label>Equipo / Club (opcional)</label>
              <select name="equipo_id" value={form.equipo_id} onChange={handleChange}>
                <option value="">Sin equipo asignado</option>
                {equipos.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre} {e.categoria ? `(${e.categoria})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Peso corporal (kg)</label>
              <input name="peso" type="number" step="0.1" value={form.peso} onChange={handleChange} placeholder="75.5" />
            </div>

            <div className="form-group">
              <label>Estatura (m)</label>
              <input name="altura" type="number" step="0.01" value={form.altura} onChange={handleChange} placeholder="1.80" />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de confirmación para eliminar deportista */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="¿Eliminar deportista?"
        message={`¿Estás seguro de que deseas eliminar permanentemente a "${deleteModal.nombre}"? Sus evaluaciones, asistencias y datos asociados también se eliminarán.`}
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        confirmVariant="danger"
        loading={deleteModal.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, nombre: '', loading: false })}
      />
    </div>
  )
}
