const BASE = '/api/admin'

function getToken() {
  return localStorage.getItem('admin_token')
}

function headers() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, { headers: headers(), ...options })
  const data = await res.json()
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/admin'
    }
    throw new Error(data.message || 'Request failed')
  }
  return data
}

export async function adminLogin(email, password) {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Login failed')
  localStorage.setItem('admin_token', data.token)
  return data
}

export function adminLogout() {
  localStorage.removeItem('admin_token')
}

export function isAdminLoggedIn() {
  return Boolean(getToken())
}

export const fetchStats = () => request('/stats')
export const fetchUsers = () => request('/users')
export const fetchCards = () => request('/cards')
export const fetchQrCodes = () => request('/qrcodes')
export const fetchActivity = () => request('/activity')

export const updateCardStatus = (cardId, status) =>
  request(`/cards/${cardId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })

export const updateQrLifecycle = (qrId, lifecycleStatus) =>
  request(`/qrcodes/${qrId}/lifecycle`, { method: 'PATCH', body: JSON.stringify({ lifecycleStatus }) })

export const deleteAdminCard = (cardId) =>
  request(`/cards/${cardId}`, { method: 'DELETE' })

export const deleteAdminUser = (userId) =>
  request(`/users/${userId}`, { method: 'DELETE' })

export const fetchSubscriptions = () => request('/subscriptions')
