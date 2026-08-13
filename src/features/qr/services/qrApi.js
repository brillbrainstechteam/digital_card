import client from '../../../api/client'
import { getDynamicQrUrl } from '../utils/publicQrUrl'

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
  const { data } = await client.post('/qr', { settings: { ...settings, purchased: false } })
  return data.data.qr
}

export async function activateQrPurchase(qrId) {
  const { data } = await client.patch(`/qr/${qrId}/activate`)
  return data.data.qr
}

export async function updateQrSlug(qrId, slug) {
  const { data } = await client.patch(`/qr/${qrId}/slug`, { slug })
  return data.data.qr
}

export async function updateQrSettings(qrId, settings) {
  const { data } = await client.patch(`/qr/${qrId}/settings`, { settings })
  return data.data.qr
}

export async function updateQrDestination(qrId, destinationType, destinationFields) {
  const { data } = await client.patch(`/qr/${qrId}/destination`, { destinationType, destinationFields })
  return data.data.qr
}

export async function updateQrLifecycle(qrId, lifecycleStatus) {
  const { data } = await client.patch(`/qr/${qrId}/lifecycle`, { lifecycleStatus })
  return data.data.qr
}

export async function deleteQr(qrId) {
  await client.delete(`/qr/${qrId}`)
}

// Swaps the encoded payload for the trackable /q/:slug link — but ONLY for
// dynamic QRs. A static QR's whole promise is that the payload lives in the
// pattern itself (and Wi-Fi / vCard payloads cannot be redirected at all), so
// it must always keep its literal data.
export function withDynamicQrData(qr) {
  const settings = qr?.settings || qr
  if (!qr?.slug) return settings
  if ((settings?.qrType || 'static') === 'static') return settings
  return { ...(settings || {}), data: getDynamicQrUrl(qr.slug) }
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

export async function fetchOverallQrAnalytics({ activeCardsOnly = false } = {}) {
  const { data } = await client.get('/qr/analytics/overview', {
    params: activeCardsOnly ? { activeCardsOnly: true } : undefined,
  })
  return data.data
}

// Public: resolves a scanned QR's tracking slug into the real destination,
// recording the scan server-side in the same call.
export async function resolveQrScan(slug) {
  const { data } = await client.get(`/public/qr/${slug}`, {
    params: { _: Date.now() },
    headers: { 'Cache-Control': 'no-cache' },
  })
  return data.data
}
