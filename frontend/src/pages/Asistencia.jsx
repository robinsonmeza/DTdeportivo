import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, ClipboardList, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import api from '../services/api'

export default function Asistencia() {
  const [entrenamientos, setEntrenamientos] = useState([])
  const [jugadores, setJugadores]           = useState([])
  const [asistencia, setAsistencia]         = useState([])
  const [selectedId, setSelectedId]         = useState('')
  const [loading, setLoading]               = useState(true)
  const [loadingAsist, setLoadingAsist]     = useState(false)
  const [saving, setSaving]                 = useState(null) // id guardando

  // Cargar datos iniciales
  useEffect(() => {
    const fetchBase = async () => {
      setLoading(true)
      try {
        const [eRes, jRes] = await Promise.all([
          api.get('/entrenamientos'),
          api.get('/jugadores'),
        ])
        setEntrenamientos(eRes.data)
        setJugadores(jRes.data)
        if (eRes.data.length > 0) setSelectedId(String(eRes.data[0].id))
      } catch (e) {
        toast.error(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchBase()
  }, [])

  // Cargar asistencia del entrenamiento seleccionado
  const loadAsistencia = useCallback(async (id) => {
    if (!id) return
    setLoadingAsist(true)
    try {
      const res = await api.get(`/asistencia?entrenamiento_id=${id}`)
      setAsistencia(res.data)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoadingAsist(false)
    }
  }, [])

  useEffect(() => {
    loadAsistencia(selectedId)
  }, [selectedId, loadAsistencia])

  const getRegistro = (jugadorId) =>
    asistencia.find(a => Number(a.jugador_id) === Number(jugadorId))

  const handleToggle = async (jugador) => {
    const registro = getRegistro(jugador.id)
    setSaving(jugador.id)

    try {
      if (registro) {
        // Actualizar existente
        const nuevoValor = registro.asistencia ? 0 : 1
        await api.put(`/asistencia/${registro.id}`, { asistencia: nuevoValor })
      } else {
        // Crear nuevo registro (ausente → presente)
        await api.post('/asistencia', {
          jugador_id:       jugador.id,
          entrenamiento_id: selectedId,
          asistencia:       1,
        })
      }
      await loadAsistencia(selectedId)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(null)
    }
  }

  // Marcar todos presentes
  const marcarTodos = async (valor) => {
    setSaving('all')
    try {
      await Promise.all(
        jugadores.map(async (j) => {
          const reg = getRegistro(j.id)
          if (reg) {
            await api.put(`/asistencia/${reg.id}`, { asistencia: valor })
          } else if (valor === 1) {
            await api.post('/asistencia', {
              jugador_id:       j.id,
              entrenamiento_id: selectedId,
              asistencia:       1,
            })
          }
        })
      )
      await loadAsistencia(selectedId)
      toast.success(valor === 1 ? 'Todos marcados presentes' : 'Todos marcados ausentes')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(null)
    }
  }

  const entrenSelected = entrenamientos.find(e => String(e.id) === selectedId)
  const presentes  = jugadores.filter(j => getRegistro(j.id)?.asistencia === 1).length
  const ausentes   = jugadores.length - presentes
  const pct        = jugadores.length ? Math.round((presentes / jugadores.length) * 100) : 0

  return (
    <div>
      <div className="page-header">
        <h2>Asistencia</h2>
        <p>Control de presencia en sesiones de entrenamiento</p>
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {/* Selector de entrenamiento */}
          <div className="card" style={{ marginBottom: 20, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                <ClipboardList size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
                <select
                  id="select-entrenamiento"
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '9px 14px',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    flex: 1,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {entrenamientos.length === 0
                    ? <option value="">Sin entrenamientos registrados</option>
                    : entrenamientos.map(e => (
                      <option key={e.id} value={e.id}>
                        {new Date(e.fecha).toLocaleDateString('es', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} — {e.tipo}
                      </option>
                    ))
                  }
                </select>
              </div>

              {selectedId && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => marcarTodos(1)}
                    disabled={saving === 'all'}
                  >
                    <CheckCircle2 size={14} /> Todos presentes
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => marcarTodos(0)}
                    disabled={saving === 'all'}
                  >
                    <XCircle size={14} /> Todos ausentes
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Resumen */}
          {selectedId && jugadores.length > 0 && (
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', marginBottom: 20 }}>
              <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent2)' }}>{presentes}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 4 }}>Presentes</div>
              </div>
              <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--danger)' }}>{ausentes}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 4 }}>Ausentes</div>
              </div>
              <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: pct >= 70 ? 'var(--success)' : 'var(--warning)' }}>{pct}%</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 4 }}>Asistencia</div>
              </div>
              <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)' }}>{jugadores.length}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 4 }}>
                  <Users size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Total plantel
                </div>
              </div>
            </div>
          )}

          {/* Barra de progreso */}
          {selectedId && jugadores.length > 0 && (
            <div className="card" style={{ marginBottom: 20, padding: '16px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span>Progreso de asistencia</span>
                <span style={{ fontWeight: 700, color: pct >= 70 ? 'var(--success)' : 'var(--warning)' }}>{pct}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--surface-hover)', borderRadius: 100, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: pct >= 70
                    ? 'linear-gradient(90deg, var(--accent2), var(--success))'
                    : 'linear-gradient(90deg, var(--warning), var(--danger))',
                  borderRadius: 100,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          )}

          {/* Lista de jugadores */}
          {!selectedId ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <p>No hay entrenamientos disponibles aún.<br />Crea uno en la sección Entrenamientos.</p>
              </div>
            </div>
          ) : loadingAsist ? <LoadingSpinner /> : (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Jugador</th>
                      <th>Posición</th>
                      <th style={{ textAlign: 'center' }}>Estado</th>
                      <th style={{ textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jugadores.map((j, i) => {
                      const reg     = getRegistro(j.id)
                      const presente = reg?.asistencia === 1
                      const isSaving = saving === j.id || saving === 'all'

                      return (
                        <tr key={j.id} style={{ opacity: isSaving ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                          <td style={{ color: 'var(--text-muted)', width: 40 }}>{i + 1}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {j.foto_url ? (
                                <img
                                  src={j.foto_url}
                                  alt={j.nombre}
                                  style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                                />
                              ) : (
                                <div style={{
                                  width: 32, height: 32, borderRadius: '50%',
                                  background: 'var(--surface-hover)',
                                  display: 'flex', alignItems: 'center',
                                  justifyContent: 'center', fontSize: 14
                                }}>👤</div>
                              )}
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{j.nombre}</span>
                            </div>
                          </td>
                          <td>
                            {j.posicion
                              ? <span className="badge badge-purple">{j.posicion}</span>
                              : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {presente ? (
                              <span className="badge badge-green" style={{ gap: 5 }}>
                                <CheckCircle2 size={12} /> Presente
                              </span>
                            ) : (
                              <span className="badge badge-red" style={{ gap: 5 }}>
                                <XCircle size={12} /> Ausente
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              id={`toggle-asist-${j.id}`}
                              onClick={() => handleToggle(j)}
                              disabled={isSaving}
                              style={{
                                background: presente ? 'var(--danger-glow)' : 'var(--accent2-glow)',
                                color: presente ? 'var(--danger)' : 'var(--accent2)',
                                border: `1px solid ${presente ? 'var(--danger)' : 'var(--accent2)'}`,
                                borderRadius: 'var(--radius-sm)',
                                padding: '5px 14px',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                transition: 'var(--transition)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              {isSaving
                                ? '...'
                                : presente
                                  ? <><XCircle size={13} /> Marcar ausente</>
                                  : <><CheckCircle2 size={13} /> Marcar presente</>
                              }
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
