import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import api from '../services/api'

const EMPTY = { jugador_id: '', partido_id: '', goles: 0, asistencias: 0, minutos_jugados: 0 }

export default function EstadisticasJugador() {
  const [stats, setStats]         = useState([])
  const [jugadores, setJugadores] = useState([])
  const [partidos, setPartidos]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [editId, setEditId]       = useState(null)
  const [saving, setSaving]       = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [sRes, jRes, pRes] = await Promise.all([
        api.get('/estadisticas'), api.get('/jugadores'), api.get('/partidos'),
      ])
      setStats(sRes.data); setJugadores(jRes.data); setPartidos(pRes.data)
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(EMPTY); setEditId(null); setModal(true) }
  const openEdit   = (s) => {
    setForm({
      jugador_id:      s.jugador_id,
      partido_id:      s.partido_id || '',
      goles:           s.goles,
      asistencias:     s.asistencias,
      minutos_jugados: s.minutos_jugados,
    })
    setEditId(s.id); setModal(true)
  }
  const closeModal   = () => setModal(false)
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.jugador_id) return toast.error('Jugador es obligatorio')
    setSaving(true)
    try {
      if (editId) {
        await api.put(`/estadisticas/${editId}`, form)
        toast.success('Estadística actualizada')
      } else {
        await api.post('/estadisticas', form)
        toast.success('Estadística registrada')
      }
      closeModal(); load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta estadística?')) return
    try { await api.delete(`/estadisticas/${id}`); toast.success('Eliminada'); load() }
    catch (e) { toast.error(e.message) }
  }

  // Agrupar para gráfica
  const chartData = jugadores.map(j => {
    const rows = stats.filter(s => s.jugador_id === j.id)
    return {
      nombre:    j.nombre.split(' ')[0],
      goles:     rows.reduce((a, s) => a + Number(s.goles), 0),
      asistencias: rows.reduce((a, s) => a + Number(s.asistencias), 0),
      minutos:   rows.reduce((a, s) => a + Number(s.minutos_jugados), 0),
    }
  }).filter(d => d.goles || d.asistencias || d.minutos)

  return (
    <div>
      <div className="page-header">
        <h2>Estadísticas de Jugadores</h2>
        <p>Rendimiento individual por partido y acumulado</p>
      </div>

      {/* Gráfica */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title"><BarChart3 size={18} color="var(--accent)" /> Goles y Asistencias por Jugador</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="nombre" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-hover)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              <Bar dataKey="goles"       name="Goles"       fill="var(--accent)"  radius={[6,6,0,0]} />
              <Bar dataKey="asistencias" name="Asistencias" fill="var(--accent2)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="page-toolbar">
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {stats.length} registros estadísticos
        </span>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Agregar Estadística
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? <LoadingSpinner /> : stats.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📈</div>
            <p>No hay estadísticas registradas</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Jugador</th><th>Partido</th><th>Rival</th>
                  <th>⚽ Goles</th><th>🎯 Asistencias</th><th>⏱ Minutos</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {stats.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.jugador_nombre}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}> {s.partido_fecha ? new Date(s.partido_fecha).toLocaleDateString('es') : '—'}</td>
                    <td>{s.rival || '—'}</td>
                    <td style={{ fontWeight: 700, color: s.goles > 0 ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                      {s.goles}
                    </td>
                    <td style={{ fontWeight: 700, color: s.asistencias > 0 ? 'var(--accent2)' : 'var(--text-muted)' }}>
                      {s.asistencias}
                    </td>
                    <td>{s.minutos_jugados}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>
                          <Pencil size={13} /> Editar
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>
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
          title={editId ? 'Editar Estadística' : 'Nueva Estadística'}
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
              <label>Jugador *</label>
              <select name="jugador_id" value={form.jugador_id} onChange={handleChange}>
                <option value="">Seleccionar…</option>
                {jugadores.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Partido</label>
              <select name="partido_id" value={form.partido_id} onChange={handleChange}>
                <option value="">Sin partido…</option>
                {partidos.map(p => (
                  <option key={p.id} value={p.id}>
                    {new Date(p.fecha).toLocaleDateString('es')} – {p.rival}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Goles</label>
              <input name="goles" type="number" min="0" value={form.goles} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Asistencias</label>
              <input name="asistencias" type="number" min="0" value={form.asistencias} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Minutos jugados</label>
              <input name="minutos_jugados" type="number" min="0" max="120" value={form.minutos_jugados} onChange={handleChange} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
