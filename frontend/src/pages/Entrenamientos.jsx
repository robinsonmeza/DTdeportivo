import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Dumbbell } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import api from '../services/api'

const EMPTY = { fecha: '', tipo: '', descripcion: '' }
const TIPOS  = ['Resistencia','Fuerza','Táctica','Velocidad','Técnica','Físico General','Recuperación']

export default function Entrenamientos() {
  const [entrenamientos, setEntrenamientos] = useState([])
  const [loading, setLoading]               = useState(true)
  const [modal, setModal]                   = useState(false)
  const [form, setForm]                     = useState(EMPTY)
  const [editId, setEditId]                 = useState(null)
  const [saving, setSaving]                 = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/entrenamientos')
      .then(r => setEntrenamientos(r.data))
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(EMPTY); setEditId(null); setModal(true) }
  const openEdit   = (e) => { setForm({ fecha: e.fecha?.slice(0,10), tipo: e.tipo, descripcion: e.descripcion || '' }); setEditId(e.id); setModal(true) }
  const closeModal = ()  => setModal(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.fecha || !form.tipo) return toast.error('Fecha y tipo son obligatorios')
    setSaving(true)
    try {
      if (editId) {
        await api.put(`/entrenamientos/${editId}`, form)
        toast.success('Entrenamiento actualizado')
      } else {
        await api.post('/entrenamientos', form)
        toast.success('Entrenamiento registrado')
      }
      closeModal(); load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este entrenamiento?')) return
    try {
      await api.delete(`/entrenamientos/${id}`)
      toast.success('Entrenamiento eliminado')
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Entrenamientos</h2>
        <p>Planificación y registro de sesiones</p>
      </div>

      <div className="page-toolbar">
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          <Dumbbell size={15} style={{ display: 'inline', marginRight: 6 }} />
          {entrenamientos.length} sesiones registradas
        </span>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Nuevo Entrenamiento
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? <LoadingSpinner /> : entrenamientos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏋️</div>
            <p>No hay entrenamientos registrados</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {entrenamientos.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>{new Date(e.fecha).toLocaleDateString('es', { day:'2-digit', month:'short', year:'numeric' })}</td>
                    <td><span className="badge badge-purple">{e.tipo}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{e.descripcion || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}>
                          <Pencil size={13} /> Editar
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(e.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal
          title={editId ? 'Editar Entrenamiento' : 'Nuevo Entrenamiento'}
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
            <div className="form-group">
              <label>Fecha *</label>
              <input name="fecha" type="date" value={form.fecha} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Tipo *</label>
              <select name="tipo" value={form.tipo} onChange={handleChange}>
                <option value="">Seleccionar…</option>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Descripción</label>
              <textarea name="descripcion" rows="3" value={form.descripcion} onChange={handleChange}
                placeholder="Describe el contenido del entrenamiento…" style={{ resize: 'vertical' }} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
