import axios from 'axios'

const TOKEN_KEY = 'bb-token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

function resolveApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  if (typeof window === 'undefined') return configuredUrl

  try {
    const apiUrl = new URL(configuredUrl)
    const apiIsLocal = ['localhost', '127.0.0.1', '::1'].includes(apiUrl.hostname)
    const pageIsLocal = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
    if (apiIsLocal && !pageIsLocal) apiUrl.hostname = window.location.hostname
    return apiUrl.toString().replace(/\/$/, '')
  } catch {
    return configuredUrl
  }
}

const client = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT to every request automatically.
client.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Normalize errors so callers get a clean message, and auto-logout on 401.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken()
    }
    const message =
      error.response?.data?.message || error.message || 'Something went wrong'
    return Promise.reject(new Error(message))
  }
)

export default client
