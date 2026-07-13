import client from '../../../api/client'

// Card-linked QR persistence. Any product (Digital Card today, Business
// Card later) that wants a "one QR per record" integration calls these same
// endpoints — there is no per-product QR backend.

export async function fetchCardQr(cardId) {
  const { data } = await client.get(`/qr/card/${cardId}`)
  return data.data.qr
}

// Powers the QR Studio sidebar's "My QR Codes" list — every QR code the
// user has saved across all of their cards.
export async function fetchMyQrCodes() {
  const { data } = await client.get('/qr')
  return data.data.qrs
}

export async function saveCardQr(cardId, settings) {
  const { data } = await client.put(`/qr/card/${cardId}`, { settings })
  return data.data.qr
}

// The standalone QR Studio's "Publish" action — creates a new, card-less
// QR record (card_id stays null) so a design can be finalized, added to
// the cart, and listed under "My QR Codes" without needing a Digital Card.
export async function publishStandaloneQr(settings) {
  const { data } = await client.post('/qr', { settings })
  return data.data.qr
}

export async function removeCardQr(cardId) {
  await client.delete(`/qr/card/${cardId}`)
}

export async function fetchQrAnalytics({ qrId, cardId } = {}) {
  if (qrId) {
    const { data } = await client.get(`/qr/${qrId}/analytics`)
    return data.data
  }
  const { data } = await client.get(`/qr/card/${cardId}/analytics`)
  return data.data
}

export async function fetchOverallQrAnalytics() {
  const { data } = await client.get('/qr/analytics/overview')
  return data.data
}

// Public: resolves a scanned QR's tracking slug into the real destination,
// recording the scan server-side in the same call.
export async function resolveQrScan(slug) {
  const { data } = await client.get(`/public/qr/${slug}`)
  return data.data
}
