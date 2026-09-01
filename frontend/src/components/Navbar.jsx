import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useDeporte } from '../context/DeporteContext'
import {
  LayoutDashboard, Users, Dumbbell, HeartPulse, UserCog,
  ClipboardList, Trophy, BarChart3, Activity, CalendarCheck2, LogOut,
  ChevronDown
} from 'lucide-react'

const TODOS_LOS_ITEMS = [
  { to: '/',               icon: LayoutDashboard, label: 'Dashboard',      roles: ['administrador','entrenador','personal_salud','jugador'] },
  { to: '/jugadores',      icon: Users,            label: 'Jugadores',      roles: ['administrador','entrenador','personal_salud','jugador'] },
  { to: '/entrenamientos', icon: Dumbbell,         label: 'Entrenamientos', roles: ['administrador','entrenador','personal_salud','jugador'] },
  { to: '/asistencia',     icon: CalendarCheck2,   label: 'Asistencia',     roles: ['administrador','entrenador','personal_salud','jugador'] },
  { to: '/lesiones',       icon: HeartPulse,       label: 'Lesiones',       roles: ['administrador','entrenador','personal_salud','jugador'] },
  { to: '/evaluaciones',   icon: ClipboardList,    label: 'Evaluaciones',   roles: ['administrador','entrenador','personal_salud','jugador'] },
  { to: '/partidos',       icon: Trophy,           label: 'Partidos',       roles: ['administrador','entrenador','personal_salud','jugador'] },
  { to: '/estadisticas',   icon: BarChart3,        label: 'Estadísticas',   roles: ['administrador','entrenador','personal_salud','jugador'] },
  { to: '/antropometria',  icon: Activity,         label: 'Antropometría',  roles: ['administrador','entrenador','personal_salud','jugador'] },
  { to: '/usuarios',       icon: UserCog,          label: 'Usuarios',       roles: ['administrador'] },
]

const ROL_BADGE = {
  administrador: { label: 'Administrador', color: '#e74c3c' },
  entrenador:    { label: 'Entrenador', color: '#2ecc71' },
  personal_salud:{ label: 'Personal Salud', color: '#3498db' },
  jugador:       { label: 'Jugador', color: '#f39c12' },
}

export default function Navbar() {
  const { usuario, logout } = useAuth()
  const { disciplinas, selectedSportId, selectedSport, setSelectedSportId } = useDeporte()
  const navigate = useNavigate()
  const [logoUrl, setLogoUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    api.get('/settings/team').then(r => setLogoUrl(r.data.logoUrl)).catch(() => {})
  }, [])

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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = TODOS_LOS_ITEMS.filter(item =>
    !usuario || item.roles.includes(usuario.rol)
  )

  const badge = usuario ? ROL_BADGE[usuario.rol] : null

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} />
        ) : (
          <div className="logo-icon">⚽</div>
        )}
        {usuario ? (
          <div style={{ marginTop: 6, textAlign: 'center' }}>
            <h1 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', wordBreak: 'break-word', lineHeight: 1.25 }}>
              Hola, {usuario.nombre}
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--accent2)', fontWeight: 600 }}>
              {ROL_BADGE[usuario.rol]?.label || usuario.rol}
            </p>
          </div>
        ) : (
          <>
            <h1>DTdeportivo</h1>
            <p>Gestión Deportiva</p>
          </>
        )}
        {usuario?.rol === 'administrador' && (
          <div style={{ marginTop: 8 }}>
            <button onClick={() => fileRef.current?.click()} className="btn btn-ghost" disabled={uploading} style={{ fontSize: 11, padding: '3px 8px' }}>
              {uploading ? 'Cargando...' : 'Cambiar logo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          </div>
        )}
      </div>

      {/* Selector Rápido de Deporte Activo */}
      <div style={{ padding: '0 16px', marginBottom: 12 }}>
        <div
          style={{
            background: 'var(--surface-hover)',
            border: '1px solid var(--border-hover)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent2)', fontWeight: 700 }}>
              Deporte Activo
            </span>
            <Trophy size={13} color="var(--accent2)" />
          </div>
          <select
            value={selectedSportId || 'todos'}
            onChange={e => setSelectedSportId(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 6px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="todos">🌐 Todos los deportes</option>
            {disciplinas.map(d => (
              <option key={d.id} value={d.id}>
                🏅 {d.nombre}
              </option>
            ))}
          </select>
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

      {usuario && (
        <div className="sidebar-footer">
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{usuario.nombre}</div>
            <span style={{
              background: badge.color + '22',
              color: badge.color,
              padding: '0.1rem 0.5rem',
              borderRadius: '10px',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}>
              {badge.label}
            </span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', fontSize: '0.85rem', padding: '0.3rem 0',
            }}
          >
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      )}
    </aside>
  )
}
