import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// Interceptor de respuesta para manejo global de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.error || error.message || 'Error de conexión'
    return Promise.reject(new Error(msg))
  }
)

export default api
