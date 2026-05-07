import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUsuario(null)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { setCargando(false); return }

    api.get('/auth/me')
      .then(r => setUsuario(r.data))
      .catch(() => logout())
      .finally(() => setCargando(false))
  }, [logout])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('access_token',  data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    setUsuario(data.usuario)
    return data.usuario
  }

  const tienePermiso = (rolesPermitidos) => {
    if (!usuario) return false
    if (usuario.rol === 'administrador') return true
    return rolesPermitidos.includes(usuario.rol)
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout, tienePermiso }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
