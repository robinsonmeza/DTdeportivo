import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const DeporteContext = createContext(null)

const STORAGE_KEY = 'dt_selected_sport_id'

export function DeporteProvider({ children }) {
  const { usuario, tienePermiso } = useAuth()
  const puedeGestionarDeportes = tienePermiso(['administrador', 'entrenador'])

  const [disciplinas, setDisciplinas] = useState([])
  const [selectedSportId, setSelectedSportIdState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || ''
  })
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(true)

  const cargarDisciplinas = useCallback(async () => {
    try {
      setLoadingDisciplinas(true)
      const res = await api.get('/disciplinas')
      const lista = res.data || []
      setDisciplinas(lista)

      // Auto-seleccionar primer deporte si no hay nada seleccionado o si el seleccionado ya no existe
      setSelectedSportIdState(prev => {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === 'todos') return 'todos'
        if (stored && lista.some(d => String(d.id) === String(stored))) {
          return stored
        }
        if (prev === 'todos') return 'todos'
        if (prev && lista.some(d => String(d.id) === String(prev))) {
          return prev
        }
        if (lista.length > 0) {
          const firstId = String(lista[0].id)
          localStorage.setItem(STORAGE_KEY, firstId)
          return firstId
        }
        return 'todos'
      })
    } catch (err) {
      console.error('Error al cargar deportes/disciplinas:', err)
    } finally {
      setLoadingDisciplinas(false)
    }
  }, [])

  useEffect(() => {
    if (usuario) {
      cargarDisciplinas()
    }
  }, [usuario, cargarDisciplinas])

  const setSelectedSportId = useCallback((id) => {
    const val = String(id || 'todos')
    setSelectedSportIdState(val)
    localStorage.setItem(STORAGE_KEY, val)
  }, [])

  // Deporte activo actualmente
  const selectedSport = useMemo(() => {
    if (!selectedSportId || selectedSportId === 'todos') {
      return { id: 'todos', nombre: 'Todos los deportes', esTodos: true }
    }
    const found = disciplinas.find(d => String(d.id) === String(selectedSportId))
    return found ? { ...found, esTodos: false } : { id: 'todos', nombre: 'Todos los deportes', esTodos: true }
  }, [disciplinas, selectedSportId])

  // Crear deporte
  const crearDisciplina = async (nombre) => {
    if (!nombre || !nombre.trim()) {
      toast.error('El nombre del deporte es obligatorio')
      return null
    }
    try {
      const res = await api.post('/disciplinas', { nombre: nombre.trim() })
      toast.success(`Deporte "${res.data.nombre}" creado exitosamente`)
      await cargarDisciplinas()
      setSelectedSportId(res.data.id)
      return res.data
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error al crear deporte'
      toast.error(msg)
      throw err
    }
  }

  // Eliminar deporte
  const eliminarDisciplina = async (id, nombre = '') => {
    try {
      await api.delete(`/disciplinas/${id}`)
      toast.success(`Deporte ${nombre ? `"${nombre}" ` : ''}eliminado correctamente`)
      
      // Si el deporte eliminado era el seleccionado, cambiar al primer disponible o 'todos'
      if (String(selectedSportId) === String(id)) {
        const restantes = disciplinas.filter(d => String(d.id) !== String(id))
        if (restantes.length > 0) {
          setSelectedSportId(restantes[0].id)
        } else {
          setSelectedSportId('todos')
        }
      }
      await cargarDisciplinas()
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error al eliminar deporte'
      toast.error(msg)
      throw err
    }
  }

  return (
    <DeporteContext.Provider
      value={{
        disciplinas,
        selectedSportId,
        selectedSport,
        setSelectedSportId,
        loadingDisciplinas,
        cargarDisciplinas,
        crearDisciplina,
        eliminarDisciplina,
        puedeGestionarDeportes,
      }}
    >
      {children}
    </DeporteContext.Provider>
  )
}

export function useDeporte() {
  const ctx = useContext(DeporteContext)
  if (!ctx) {
    throw new Error('useDeporte debe usarse dentro de un DeporteProvider')
  }
  return ctx
}
