import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, HeartPulse } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import api from '../services/api'

const EMPTY = { jugador_id: '', tipo: '', descripcion: '', fecha_inicio: '', fecha_fin: '' }

export default function Lesiones() {
  const [lesiones, setLesiones]   = useState([])
  const [jugadores, setJugadores] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [editId, setEditId]       = useState(null)
  const [saving, setSaving]       = useState(false)

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

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta lesión?')) return
    try { await api.delete(`/lesiones/${id}`); toast.success('Lesión eliminada'); load() }
    catch (e) { toast.error(e.message) }
  }

  const activas = lesiones.filter(l => !l.fecha_fin)

  return (
    <div>
      <div className="page-header">
        <h2>Lesiones</h2>
        <p>Control y seguimiento de lesiones del plantel</p>
      </div>

      <div className="page-toolbar">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            <HeartPulse size={15} style={{ display: 'inline', marginRight: 6 }} />
            {lesiones.length} registros · <span style={{ color: 'var(--danger)' }}>{activas.length} activas</span>
          </span>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Registrar Lesión
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? <LoadingSpinner /> : lesiones.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🩺</div>
            <p>No hay lesiones registradas</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Jugador</th><th>Tipo</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {lesiones.map(l => (
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
                {jugadores.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
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
    </div>
  )
}
