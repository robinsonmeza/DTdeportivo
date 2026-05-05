import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import api from '../services/api'

const EMPTY = { fecha: '', rival: '', tipo: 'liga', resultado: '' }

export default function Partidos() {
  const [partidos, setPartidos] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [editId, setEditId]     = useState(null)
  const [saving, setSaving]     = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/partidos')
      .then(r => setPartidos(r.data))
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(EMPTY); setEditId(null); setModal(true) }
  const openEdit   = (p) => {
    setForm({ fecha: p.fecha?.slice(0,10) || '', rival: p.rival, tipo: p.tipo, resultado: p.resultado || '' })
    setEditId(p.id); setModal(true)
  }
  const closeModal   = () => setModal(false)
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.fecha || !form.rival || !form.tipo) return toast.error('Fecha, rival y tipo son obligatorios')
    setSaving(true)
    try {
      if (editId) {
        await api.put(`/partidos/${editId}`, form)
        toast.success('Partido actualizado')
      } else {
        await api.post('/partidos', form)
        toast.success('Partido registrado')
      }
      closeModal(); load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este partido?')) return
    try { await api.delete(`/partidos/${id}`); toast.success('Eliminado'); load() }
    catch (e) { toast.error(e.message) }
  }

  const resultadoColor = (res) => {
    if (!res) return 'var(--text-muted)'
    const [g, r] = res.split('-').map(Number)
    if (g > r) return 'var(--success)'
    if (g < r) return 'var(--danger)'
    return 'var(--warning)'
  }

  return (
    <div>
      <div className="page-header">
        <h2>Partidos</h2>
        <p>Historial de liga y amistosos</p>
      </div>

      <div className="page-toolbar">
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          <Trophy size={15} style={{ display: 'inline', marginRight: 6 }} />
          {partidos.length} partidos · {partidos.filter(p => p.tipo === 'liga').length} de liga
        </span>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Registrar Partido
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? <LoadingSpinner /> : partidos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚽</div>
            <p>No hay partidos registrados</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Rival</th><th>Tipo</th><th>Resultado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {partidos.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{new Date(p.fecha).toLocaleDateString('es', { day:'2-digit', month:'short', year:'numeric' })}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.rival}</td>
                    <td>
                      <span className={`badge ${p.tipo === 'liga' ? 'badge-green' : 'badge-orange'}`}>{p.tipo}</span>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: 16, color: resultadoColor(p.resultado) }}>
                      {p.resultado || <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 400 }}>Pendiente</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>
                          <Pencil size={13} /> Editar
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>
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
          title={editId ? 'Editar Partido' : 'Registrar Partido'}
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
            <div className="form-group">
              <label>Fecha *</label>
              <input name="fecha" type="date" value={form.fecha} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Tipo *</label>
              <select name="tipo" value={form.tipo} onChange={handleChange}>
                <option value="liga">Liga</option>
                <option value="amistoso">Amistoso</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Rival *</label>
              <input name="rival" value={form.rival} onChange={handleChange} placeholder="Nombre del equipo rival" />
            </div>
            <div className="form-group">
              <label>Resultado (ej: 2-1)</label>
              <input name="resultado" value={form.resultado} onChange={handleChange} placeholder="Dejar vacío si aún no se jugó" />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
