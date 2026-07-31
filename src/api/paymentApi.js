import client from './client'

export async function createOrder(cardIds, qrIds) {
  const { data } = await client.post('/payment/create-order', { cardIds, qrIds })
  return data.data
}

export async function verifyPayment(payload) {
  const { data } = await client.post('/payment/verify', payload)
  return data
}
