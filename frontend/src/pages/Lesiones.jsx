import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, HeartPulse } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSpinner from '../components/LoadingSpinner'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useDeporte } from '../context/DeporteContext'

const EMPTY = { jugador_id: '', tipo: '', descripcion: '', fecha_inicio: '', fecha_fin: '' }

export default function Lesiones() {
  const { tienePermiso } = useAuth()
  const puedeEditar = tienePermiso(['administrador', 'entrenador', 'personal_salud'])
  const { selectedSportId, selectedSport } = useDeporte()

  const [lesiones, setLesiones]   = useState([])
  const [jugadores, setJugadores] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [editId, setEditId]       = useState(null)
  const [saving, setSaving]       = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, loading: false })

  const load = async () => {
    setLoading(true)
    try {
      const [lRes, jRes] = await Promise.all([api.get('/lesiones'), api.get('/jugadores')])
      setLesiones(lRes.data)
      setJugadores(jRes.data)
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Filtrar jugadores y lesiones por el deporte activo
  const jugadoresFiltrados = jugadores.filter(j => {
    if (selectedSportId && selectedSportId !== 'todos') {
      return String(j.disciplina_id) === String(selectedSportId)
    }
    return true
  })

  const lesionesFiltradas = lesiones.filter(l => {
    if (selectedSportId && selectedSportId !== 'todos') {
      const j = jugadores.find(jug => jug.id === l.jugador_id)
      return j ? String(j.disciplina_id) === String(selectedSportId) : true
    }
    return true
  })

  const openCreate = () => { setForm(EMPTY); setEditId(null); setModal(true) }
  const openEdit   = (l) => {
    setForm({
      jugador_id:   l.jugador_id,
      tipo:         l.tipo || '',
      descripcion:  l.descripcion || '',
      fecha_inicio: l.fecha_inicio?.slice(0,10) || '',
      fecha_fin:    l.fecha_fin?.slice(0,10) || '',
    })
    setEditId(l.id); setModal(true)
  }
  const closeModal = () => setModal(false)
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.jugador_id || !form.fecha_inicio) return toast.error('Jugador y fecha inicio son obligatorios')
    setSaving(true)
    try {
      if (editId) {
        await api.put(`/lesiones/${editId}`, form)
        toast.success('Lesión actualizada')
      } else {
        await api.post('/lesiones', form)
        toast.success('Lesión registrada')
      }
      closeModal(); load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = (id) => {
    setDeleteModal({ isOpen: true, id, loading: false })
  }

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return
    setDeleteModal(prev => ({ ...prev, loading: true }))
    try {
      await api.delete(`/lesiones/${deleteModal.id}`)
      toast.success('Lesión eliminada')
      setDeleteModal({ isOpen: false, id: null, loading: false })
      load()
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
      setDeleteModal(prev => ({ ...prev, loading: false }))
    }
  }

  const activas = lesionesFiltradas.filter(l => !l.fecha_fin)

  return (
    <div>
      <div className="page-header">
        <h2>Lesiones</h2>
        <p>
          Control y seguimiento de lesiones del plantel
          {selectedSportId && selectedSportId !== 'todos' ? ` — Deporte: ${selectedSport?.nombre}` : ''}
        </p>
      </div>

      <div className="page-toolbar">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            <HeartPulse size={15} style={{ display: 'inline', marginRight: 6 }} />
            {lesionesFiltradas.length} registros · <span style={{ color: 'var(--danger)' }}>{activas.length} activas</span>
          </span>
        </div>
        {puedeEditar && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Registrar Lesión
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? <LoadingSpinner /> : lesionesFiltradas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🩺</div>
            <p>No hay lesiones registradas</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Jugador</th><th>Tipo</th><th>Inicio</th><th>Fin</th><th>Estado</th>
                  {puedeEditar && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {lesionesFiltradas.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{l.jugador_nombre}</td>
                    <td>{l.tipo || '—'}</td>
                    <td>{l.fecha_inicio ? new Date(l.fecha_inicio).toLocaleDateString('es') : '—'}</td>
                    <td>{l.fecha_fin    ? new Date(l.fecha_fin).toLocaleDateString('es')    : '—'}</td>
                    <td>
                      <span className={`badge ${l.fecha_fin ? 'badge-green' : 'badge-red'}`}>
                        {l.fecha_fin ? 'Recuperado' : 'Activa'}
                      </span>
                    </td>
                    {puedeEditar && (
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(l)}>
                            <Pencil size={13} /> Editar
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(l.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal
          title={editId ? 'Editar Lesión' : 'Registrar Lesión'}
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Guardando…' : editId ? 'Actualizar' : 'Registrar'}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Jugador *</label>
              <select name="jugador_id" value={form.jugador_id} onChange={handleChange}>
                <option value="">Seleccionar jugador…</option>
                {jugadoresFiltrados.map(j => <option key={j.id} value={j.id}>{j.nombre} {j.disciplina_nombre ? `(${j.disciplina_nombre})` : ''}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Tipo de lesión</label>
              <input name="tipo" value={form.tipo} onChange={handleChange} placeholder="Ej. Muscular, Articular…" />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <input name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Detalles breves" />
            </div>
            <div className="form-group">
              <label>Fecha inicio *</label>
              <input name="fecha_inicio" type="date" value={form.fecha_inicio} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Fecha fin (si aplica)</label>
              <input name="fecha_fin" type="date" value={form.fecha_fin} onChange={handleChange} />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de confirmación para eliminar lesión */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="¿Eliminar registro de lesión?"
        message="¿Estás seguro de que deseas eliminar este registro médico de lesión? Esta acción es irreversible."
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
