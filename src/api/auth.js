import client, { setToken, clearToken } from './client'

export async function loginRequest(email, password) {
  const { data } = await client.post('/auth/login', { email, password })
  setToken(data.data.token)
  return data.data.user
}

export async function signupRequest(fields) {
  const { data } = await client.post('/auth/signup', fields)
  setToken(data.data.token)
  return data.data.user
}

export async function fetchMe() {
  const { data } = await client.get('/auth/me')
  return data.data.user
}

export function logoutRequest() {
  clearToken()
}
