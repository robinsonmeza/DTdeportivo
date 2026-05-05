import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, Activity, Ruler, Target, Info, ChevronRight, ChevronDown, Save, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import Somatocarta from '../components/Somatocarta'
import api from '../services/api'

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
  const [jugadores, setJugadores] = useState([])
  const [selectedJugador, setSelectedJugador] = useState('')
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_ANTRO)
  const [saving, setSaving] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    basicas: true, pliegues: false, perimetros: false, diametros: false, clasificacion: false
  })
  const [filterPos, setFilterPos] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showAvg, setShowAvg] = useState(true)

  useEffect(() => {
    api.get('/jugadores').then(r => setJugadores(r.data))
  }, [])

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
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  const toggleSection = (s) => setExpandedSections(prev => ({ ...prev, [s]: !prev[s] }))

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => {
      const updated = { ...f, [name]: value }
      // Auto-calc IMC if peso & estatura
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
        toast.success('Registro actualizado')
      } else {
        await api.post('/antropometria', { ...form, jugador_id: selectedJugador })
        toast.success('Registro guardado')
      }
      setModal(false)
      setEditId(null)
      loadRegistros(selectedJugador)
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const openEdit = (reg) => {
    const formattedDate = reg.fecha ? new Date(reg.fecha).toISOString().split('T')[0] : '';
    setForm({
      ...reg,
      fecha: formattedDate,
      // Asegurarse de que los valores nulos sean strings vacíos para los inputs
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

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return
    try {
      await api.delete(`/antropometria/${id}`)
      toast.success('Eliminado')
      loadRegistros(selectedJugador)
    } catch (e) { toast.error(e.message) }
  }

  const somatocartaData = registros
    .filter(r => !filterPos || r.posicion_rugby === filterPos)
    .filter(r => !filterCat || r.categoria === filterCat)
    .map(r => ({
      x: Number(r.x_somatocarta),
      y: Number(r.y_somatocarta),
      nombre: new Date(r.fecha).toLocaleDateString('es'),
      posicion: r.posicion_rugby,
      somatotipo: `${r.endomorfia} - ${r.mesomorfia} - ${r.ectomorfia}`
    }))

  const groupAverage = (showAvg && somatocartaData.length > 0) ? {
    x: Number((somatocartaData.reduce((a, b) => a + b.x, 0) / somatocartaData.length).toFixed(2)),
    y: Number((somatocartaData.reduce((a, b) => a + b.y, 0) / somatocartaData.length).toFixed(2)),
    nombre: 'Promedio del Grupo',
    posicion: 'General',
    somatotipo: 'Cálculo Promedio'
  } : null;

  const SectionHeader = ({ id, icon: Icon, title, expanded }) => (
    <div 
      onClick={() => toggleSection(id)}
      style={{ 
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', 
        background: 'var(--surface-hover)', borderRadius: 8, cursor: 'pointer', marginBottom: 8 
      }}
    >
      <Icon size={18} color="var(--accent)" />
      <span style={{ flex: 1, fontWeight: 600 }}>{title}</span>
      {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <h2>Seguimiento Antropométrico</h2>
        <p>Análisis de composición corporal y somatotipo (Rugby Performance)</p>
      </div>

      <div className="page-toolbar" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div className="form-group" style={{ flex: 1, maxWidth: 300 }}>
          <select value={selectedJugador} onChange={e => setSelectedJugador(e.target.value)}>
            <option value="">Seleccionar Jugador...</option>
            {jugadores.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
          </select>
        </div>
        {selectedJugador && (
          <button className="btn btn-primary" onClick={() => {
            const jugador = jugadores.find(j => j.id === Number(selectedJugador));
            const imc = (jugador?.peso && jugador?.altura) 
              ? (Number(jugador.peso) / Math.pow(Number(jugador.altura), 2)).toFixed(2) 
              : '';
              
            setForm({ 
              ...EMPTY_ANTRO, 
              jugador_id: selectedJugador,
              peso: jugador?.peso || '',
              estatura: jugador?.altura || '',
              imc: imc,
              posicion_rugby: jugador?.posicion || ''
            }); 
            setModal(true);
          }}>
            <Plus size={16} /> Nuevo Registro
          </button>
        )}
      </div>

      {selectedJugador && (
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 24 }}>
          {/* Somatocarta */}
          <div className="card">
            <div className="card-title" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Target size={18} color="var(--accent)" /> Somatocarta (Evolución)
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select 
                  style={{ fontSize: 11, padding: '4px 8px', width: 'auto' }}
                  value={filterPos} 
                  onChange={e => setFilterPos(e.target.value)}
                >
                  <option value="">Todas Pos.</option>
                  <option value="Enlace">Enlace</option>
                  <option value="Transportador">Transportador</option>
                  <option value="Penetrador">Penetrador</option>
                  <option value="Ala">Ala</option>
                  <option value="Forward">Forward</option>
                  <option value="Back">Back</option>
                </select>
                <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={showAvg} onChange={e => setShowAvg(e.target.checked)} /> Avg
                </label>
              </div>
            </div>
            {registros.length > 0 ? (
              <Somatocarta data={somatocartaData} average={groupAverage} />
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Sin datos para graficar</p>
            )}
          </div>

          {/* Historial */}
          <div className="card">
            <div className="card-title"><Calendar size={18} color="var(--accent2)" /> Últimos Registros</div>
            {loading ? <LoadingSpinner /> : registros.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No hay registros previos</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th><th>Somatotipo</th><th>% Grasa</th><th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map(r => (
                      <tr key={r.id}>
                        <td>{new Date(r.fecha).toLocaleDateString('es')}</td>
                        <td style={{ fontWeight: 600 }}>{r.endomorfia} - {r.mesomorfia} - {r.ectomorfia}</td>
                        <td>{r.porcentaje_grasa ? `${r.porcentaje_grasa}%` : '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>
                              <Pencil size={13} />
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>
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
        </div>
      )}

      {modal && (
        <Modal 
          title={editId ? "Editar Registro Antropométrico" : "Nuevo Registro Antropométrico"} 
          onClose={() => { setModal(false); setEditId(null); }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setModal(false); setEditId(null); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                <Save size={16} /> {saving ? 'Guardando...' : editId ? 'Actualizar Registro' : 'Guardar Registro'}
              </button>
            </>
          }
        >
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 10 }}>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Fecha del estudio</label>
              <input type="date" name="fecha" value={form.fecha} onChange={handleChange} />
            </div>

            {/* A. Medidas Básicas */}
            <SectionHeader id="basicas" icon={Ruler} title="Medidas Básicas" expanded={expandedSections.basicas} />
            {expandedSections.basicas && (
              <div className="form-grid" style={{ marginBottom: 20 }}>
                <div className="form-group"><label>Estatura (m)</label><input type="number" step="0.01" name="estatura" value={form.estatura} onChange={handleChange} /></div>
                <div className="form-group"><label>Peso (kg)</label><input type="number" step="0.1" name="peso" value={form.peso} onChange={handleChange} /></div>
                <div className="form-group"><label>IMC</label><input type="number" name="imc" value={form.imc} readOnly style={{ background: 'var(--surface-hover)' }} /></div>
              </div>
            )}

            {/* B. Pliegues Cutáneos */}
            <SectionHeader id="pliegues" icon={Activity} title="Pliegues Cutáneos (mm)" expanded={expandedSections.pliegues} />
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

            {/* F. Clasificación Rugby */}
            <SectionHeader id="clasificacion" icon={Info} title="Clasificación Rugby" expanded={expandedSections.clasificacion} />
            {expandedSections.clasificacion && (
              <div className="form-grid">
                <div className="form-group">
                  <label>Posición Específica</label>
                  <select name="posicion_rugby" value={form.posicion_rugby} onChange={handleChange}>
                    <option value="">Seleccionar...</option>
                    <option value="Enlace">Enlace</option>
                    <option value="Transportador">Transportador</option>
                    <option value="Penetrador">Penetrador</option>
                    <option value="Ala">Ala</option>
                    <option value="Forward">Forward</option>
                    <option value="Back">Back</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Grupo</label>
                  <select name="grupo" value={form.grupo} onChange={handleChange}>
                    <option value="">Seleccionar...</option>
                    <option value="Delanteros">Delanteros</option>
                    <option value="Tres cuartos">Tres cuartos</option>
                  </select>
                </div>
                <div className="form-group"><label>Categoría</label><input type="text" name="categoria" value={form.categoria} onChange={handleChange} placeholder="Ej: M19, Primera..." /></div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
