import { useEffect, useState, useRef } from 'react'
import { Plus, Pencil, Trash2, Users, Eye, Camera, Activity, Target } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const EMPTY = { nombre: '', edad: '', posicion: '', peso: '', altura: '', equipo_id: '', disciplina_id: '' }
const POSICIONES = ['Penetrador','Wing','Enlace','Trasportador','Forward','Back','Ala']

export default function Jugadores() {
  const { tienePermiso } = useAuth()
  const puedeEditar = tienePermiso(['administrador', 'entrenador'])

  const [jugadores, setJugadores]     = useState([])
  const [equipos, setEquipos]         = useState([])
  const [disciplinas, setDisciplinas] = useState([])
  const [nuevaDisciplina, setNuevaDisciplina] = useState('')
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(false)
  const [modalFicha, setModalFicha]   = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [form, setForm]               = useState(EMPTY)
  const [editId, setEditId]           = useState(null)
  const [saving, setSaving]           = useState(false)
  const [modoAsociacion, setModoAsociacion] = useState('equipo') // 'equipo' | 'disciplina'
  const fileInputRef = useRef(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/jugadores'),
      api.get('/equipos'),
      api.get('/disciplinas'),
    ]).then(([jRes, eRes, dRes]) => {
      setJugadores(jRes.data)
      setEquipos(eRes.data)
      setDisciplinas(dRes.data)
    }).catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setForm(EMPTY)
    setEditId(null)
    setModoAsociacion('equipo')
    setNuevaDisciplina('')
    setModal(true)
  }

  const openEdit = (j) => {
    setForm({
      nombre: j.nombre, edad: j.edad ?? '', posicion: j.posicion ?? '',
      peso: j.peso ?? '', altura: j.altura ?? '',
      equipo_id: j.equipo_id ?? '', disciplina_id: j.disciplina_id ?? '',
    })
    setModoAsociacion(j.disciplina_id ? 'disciplina' : 'equipo')
    setEditId(j.id)
    setModal(true)
  }

  const closeModal = () => { setModal(false); setModalFicha(false); setSelectedPlayer(null) }

  const openFicha = async (id) => {
    try {
      const res = await api.get(`/jugadores/${id}`)
      setSelectedPlayer(res.data)
      setModalFicha(true)
    } catch { toast.error('Error al cargar la ficha') }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('foto', file)
    try {
      const res = await api.post(`/jugadores/${selectedPlayer.id}/foto`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSelectedPlayer(prev => ({ ...prev, foto_url: res.data.foto_url }))
      toast.success('Foto actualizada')
      load()
    } catch { toast.error('Error al subir la foto') }
  }

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    setSaving(true)

    const payload = { ...form }
    // Limpiar la asociación no usada
    if (modoAsociacion === 'equipo') {
      payload.disciplina_id = null
      if (!payload.equipo_id) payload.equipo_id = null
    } else {
      payload.equipo_id = null
      // Si se escribe una disciplina nueva, crearla primero
      if (nuevaDisciplina.trim()) {
        try {
          const { data } = await api.post('/disciplinas', { nombre: nuevaDisciplina.trim() })
          payload.disciplina_id = data.id
          setDisciplinas(prev => [...prev.filter(d => d.id !== data.id), data])
        } catch (e) { toast.error('Error al crear disciplina: ' + e.message); setSaving(false); return }
      }
      if (!payload.disciplina_id) payload.disciplina_id = null
    }

    try {
      if (editId) {
        await api.put(`/jugadores/${editId}`, payload)
        toast.success('Jugador actualizado')
      } else {
        await api.post('/jugadores', payload)
        toast.success('Jugador creado')
      }
      closeModal(); load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return
    try {
      await api.delete(`/jugadores/${id}`)
      toast.success('Jugador eliminado')
      load()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Jugadores</h2>
        <p>Gestión completa del plantel</p>
      </div>

      <div className="page-toolbar">
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          <Users size={15} style={{ display: 'inline', marginRight: 6 }} />
          {jugadores.length} jugadores registrados
        </span>
        {puedeEditar && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Nuevo Jugador
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? <LoadingSpinner /> : jugadores.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <p>No hay jugadores registrados aún</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Nombre</th><th>Edad</th><th>Posición</th>
                  <th>Equipo / Disciplina</th><th>Peso (kg)</th><th>Altura (m)</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {jugadores.map((j, i) => (
                  <tr key={j.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {j.foto_url ? (
                          <img src={j.foto_url} alt={j.nombre} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👤</div>
                        )}
                        {j.nombre}
                      </div>
                    </td>
                    <td>{j.edad ?? '—'}</td>
                    <td>{j.posicion ? <span className="badge badge-purple">{j.posicion}</span> : '—'}</td>
                    <td>
                      {j.equipo_nombre
                        ? <span className="badge badge-blue">🏆 {j.equipo_nombre}</span>
                        : j.disciplina_nombre
                        ? <span className="badge badge-green">🎯 {j.disciplina_nombre}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>Sin asignar</span>
                      }
                    </td>
                    <td>{j.peso ?? '—'}</td>
                    <td>{j.altura ?? '—'}</td>
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

      {/* Modal ficha */}
      {modalFicha && selectedPlayer && (
        <Modal title={`Ficha Técnica: ${selectedPlayer.nombre}`} onClose={closeModal} width="800px">
          <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: 'var(--surface-hover)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                {selectedPlayer.foto_url ? (
                  <img src={selectedPlayer.foto_url} alt={selectedPlayer.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>👤</div>
                )}
                {puedeEditar && (
                  <button onClick={() => fileInputRef.current.click()} style={{ position: 'absolute', bottom: 12, right: 12, width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Camera size={20} />
                  </button>
                )}
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} style={{ display: 'none' }} accept="image/*" />
              </div>
              <div className="card" style={{ padding: 16 }}>
                <h3 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase' }}>Información</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 14 }}><strong>Edad:</strong> {selectedPlayer.edad} años</p>
                  <p style={{ fontSize: 14 }}><strong>Posición:</strong> <span className="badge badge-purple">{selectedPlayer.posicion || '—'}</span></p>
                  <p style={{ fontSize: 14 }}><strong>Peso:</strong> {selectedPlayer.peso} kg</p>
                  <p style={{ fontSize: 14 }}><strong>Altura:</strong> {selectedPlayer.altura} m</p>
                  <p style={{ fontSize: 14 }}><strong>Equipo:</strong> {selectedPlayer.equipo_nombre || '—'}</p>
                  <p style={{ fontSize: 14 }}><strong>Disciplina:</strong> {selectedPlayer.disciplina_nombre || '—'}</p>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <Activity size={18} color="var(--accent)" />
                  <h3 style={{ fontSize: 16 }}>Resumen Antropométrico (Último)</h3>
                </div>
                {selectedPlayer.ultima_antropometria ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: 'var(--surface-hover)', padding: 12, borderRadius: 8 }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Somatotipo</p>
                      <p style={{ fontSize: 16, fontWeight: 700 }}>{selectedPlayer.ultima_antropometria.endomorfia} - {selectedPlayer.ultima_antropometria.mesomorfia} - {selectedPlayer.ultima_antropometria.ectomorfia}</p>
                    </div>
                    <div style={{ background: 'var(--surface-hover)', padding: 12, borderRadius: 8 }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>% Grasa</p>
                      <p style={{ fontSize: 16, fontWeight: 700 }}>{selectedPlayer.ultima_antropometria.porcentaje_grasa}%</p>
                    </div>
                  </div>
                ) : <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No hay registros antropométricos.</p>}
              </div>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <Target size={18} color="var(--accent2)" />
                  <h3 style={{ fontSize: 16 }}>Última Evaluación Física</h3>
                </div>
                {selectedPlayer.ultima_evaluacion ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div style={{ background: 'var(--surface-hover)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Score General</p>
                      <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent2)' }}>{selectedPlayer.ultima_evaluacion.score_general}</p>
                    </div>
                    <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>Sprint:</span> {selectedPlayer.ultima_evaluacion.sprint_30m}s</div>
                      <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>Salto:</span> {selectedPlayer.ultima_evaluacion.salto_vertical}cm</div>
                    </div>
                  </div>
                ) : <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No hay evaluaciones físicas.</p>}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <Modal
          title={editId ? 'Editar Jugador' : 'Nuevo Jugador'}
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Guardando…' : editId ? 'Actualizar' : 'Crear'}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Nombre completo *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej. Carlos Méndez" />
            </div>
            <div className="form-group">
              <label>Edad</label>
              <input name="edad" type="number" min="14" max="50" value={form.edad} onChange={handleChange} placeholder="22" />
            </div>
            <div className="form-group">
              <label>Posición</label>
              <select name="posicion" value={form.posicion} onChange={handleChange}>
                <option value="">Seleccionar…</option>
                {POSICIONES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Peso (kg)</label>
              <input name="peso" type="number" step="0.1" value={form.peso} onChange={handleChange} placeholder="72.5" />
            </div>
            <div className="form-group">
              <label>Altura (m)</label>
              <input name="altura" type="number" step="0.01" value={form.altura} onChange={handleChange} placeholder="1.78" />
            </div>

            {/* Asociación: Equipo O Disciplina */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Asociación deportiva</label>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 'normal' }}>
                  <input type="radio" value="equipo" checked={modoAsociacion === 'equipo'} onChange={() => setModoAsociacion('equipo')} />
                  Pertenece a un equipo
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 'normal' }}>
                  <input type="radio" value="disciplina" checked={modoAsociacion === 'disciplina'} onChange={() => setModoAsociacion('disciplina')} />
                  Disciplina individual
                </label>
              </div>

              {modoAsociacion === 'equipo' ? (
                <select name="equipo_id" value={form.equipo_id} onChange={handleChange}>
                  <option value="">Sin equipo</option>
                  {equipos.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.categoria ? `(${e.categoria})` : ''}</option>)}
                </select>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select name="disciplina_id" value={form.disciplina_id} onChange={e => { handleChange(e); setNuevaDisciplina('') }} style={{ flex: 1 }}>
                    <option value="">Seleccionar disciplina…</option>
                    {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                  <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>o escribe:</span>
                  <input
                    style={{ flex: 1 }}
                    placeholder="Nueva disciplina…"
                    value={nuevaDisciplina}
                    onChange={e => { setNuevaDisciplina(e.target.value); setForm(f => ({ ...f, disciplina_id: '' })) }}
                  />
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
