import client from './client'

export async function submitContactMessage({ name, email, subject, message }) {
  const { data } = await client.post('/contact', { name, email, subject, message })
  return data
}
