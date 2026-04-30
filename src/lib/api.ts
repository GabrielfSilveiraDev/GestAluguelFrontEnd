import axios from 'axios'

// SUMMARY: Creates the base Axios instance for API communication.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5101/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// SUMMARY: Intercepts outgoing requests to inject the JWT token into the Authorization header.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// SUMMARY: Intercepts incoming responses to handle global 401 Unauthorized errors by logging out the user.
api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('perfil')
        localStorage.removeItem('nomeCompleto')
        localStorage.removeItem('inquilinoId')
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
)

export default api