import { NavLink } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import {
  LayoutDashboard, Users, Dumbbell, HeartPulse,
  ClipboardList, Trophy, BarChart3, Activity, CalendarCheck2,
} from 'lucide-react'

const navItems = [
  { to: '/',               icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/jugadores',      icon: Users,            label: 'Jugadores' },
  { to: '/entrenamientos', icon: Dumbbell,         label: 'Entrenamientos' },
  { to: '/asistencia',     icon: CalendarCheck2,   label: 'Asistencia' },
  { to: '/lesiones',       icon: HeartPulse,       label: 'Lesiones' },
  { to: '/evaluaciones',   icon: ClipboardList,    label: 'Evaluaciones' },
  { to: '/partidos',       icon: Trophy,           label: 'Partidos' },
  { to: '/estadisticas',   icon: BarChart3,        label: 'Estadísticas' },
  { to: '/antropometria',  icon: Activity,         label: 'Antropometría' },
]

export default function Navbar() {
  const [logoUrl, setLogoUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    api.get('/settings/team').then(r => setLogoUrl(r.data.logoUrl)).catch(() => {})
  }, [])

  const handlePick = () => {
    if (fileRef.current) fileRef.current.click()
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('logo', file)
    setUploading(true)
    try {
      const r = await api.post('/settings/team/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setLogoUrl(r.data.logoUrl)
    } catch (_) {
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} />
        ) : (
          <div className="logo-icon">⚽</div>
        )}
        <h1>Legendarios</h1>
        <p>Gestión de Equipo</p>
        <div style={{ marginTop: 8 }}>
          <button onClick={handlePick} className="btn btn-ghost" disabled={uploading} style={{ fontSize: 12 }}>
            {uploading ? 'Cargando...' : 'Cambiar logo'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section-label">Menú Principal</span>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon className="nav-icon" size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p>⚡ v1.0.0 · {new Date().getFullYear()}</p>
      </div>
    </aside>
  )
}
