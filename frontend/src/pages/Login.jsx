import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [cargando, setCargando] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) return toast.error('Completa todos los campos')
    setCargando(true)
    try {
      const usuario = await login(form.email, form.password)
      toast.success(`Bienvenido, ${usuario.nombre}`)
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Credenciales inválidas')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">⚽</div>
          <h1>DTdeportivo</h1>
          <p>Sistema de Gestión Deportiva</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              placeholder="usuario@ejemplo.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="password-wrapper">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-pass"
                onClick={() => setShowPass(v => !v)}
                tabIndex={-1}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-login" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="login-credentials">
          <p>Credenciales de prueba:</p>
          <table>
            <tbody>
              <tr><td>Admin</td><td>admin@dtdeportivo.com</td><td>Admin123!</td></tr>
              <tr><td>Entrenador</td><td>entrenador@dtdeportivo.com</td><td>Coach123!</td></tr>
              <tr><td>Salud</td><td>salud@dtdeportivo.com</td><td>Salud123!</td></tr>
              <tr><td>Jugador</td><td>jugador@dtdeportivo.com</td><td>Jugador123!</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
