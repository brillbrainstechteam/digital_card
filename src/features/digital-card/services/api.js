import client, { getToken } from '../../../api/client'

export async function fetchCards() {
  const { data } = await client.get('/cards')
  return data.data.cards
}

export async function fetchCard(id) {
  const { data } = await client.get(`/cards/${id}`)
  return data.data.card
}

export async function createCard(title, cardData) {
  const { data } = await client.post('/cards', { title, card_data: cardData })
  return data.data.card
}

export async function updateCard(id, updates) {
  const { data } = await client.put(`/cards/${id}`, updates)
  return data.data.card
}

export async function deleteCard(id) {
  const { data } = await client.delete(`/cards/${id}`)
  return data
}

export async function unarchiveCard(id) {
  const { data } = await client.patch(`/cards/${id}/unarchive`)
  return data.data.card
}

export async function cancelCardSubscription(id) {
  const { data } = await client.patch(`/cards/${id}/cancel-subscription`)
  return data.data.card
}

export async function resubscribeCard(id) {
  const { data } = await client.patch(`/cards/${id}/resubscribe`)
  return data.data.card
}

export async function fetchPublicCard(slug) {
  const { data } = await client.get(`/public/cards/${slug}`)
  return data.data.card
}

export async function trackCardView(slug) {
  try {
    await client.post(`/public/cards/${slug}/view`)
  } catch {
    // tracking failures should never disrupt the visitor
  }
}

export async function trackButtonClick(slug, button) {
  try {
    await client.post(`/public/cards/${slug}/click`, { button })
  } catch {
    // tracking failures should never disrupt the visitor
  }
}

export async function submitCardLead(slug, payload) {
  const { data } = await client.post(`/public/cards/${slug}/leads`, payload)
  return data.data.lead
}

export async function submitSubscriber(slug, email) {
  const { data } = await client.post(`/public/cards/${slug}/subscribe`, { email })
  return data.data.subscriber
}

export async function fetchAnalytics(cardId, { dateRange = '', dateFrom = '', dateTo = '' } = {}) {
  const { data } = await client.get(`/analytics/${cardId}`, { params: { dateRange, dateFrom, dateTo } })
  return data.data
}

export async function fetchAnalyticsLeads(cardId, { search = '', page = 1, limit = 10, dateRange = '', dateFrom = '', dateTo = '', sortBy = 'newest' } = {}) {
  const { data } = await client.get(`/analytics/${cardId}/leads`, {
    params: { search, page, limit, dateRange, dateFrom, dateTo, sortBy },
  })
  return data.data
}

export async function fetchAnalyticsActivity(cardId, { search = '', page = 1, limit = 20, dateRange = '', dateFrom = '', dateTo = '', eventType = '' } = {}) {
  const { data } = await client.get(`/analytics/${cardId}/activity`, {
    params: { search, page, limit, dateRange, dateFrom, dateTo, eventType },
  })
  return data.data
}

export async function fetchAnalyticsSubscribers(cardId, { search = '', page = 1, limit = 10 } = {}) {
  const { data } = await client.get(`/analytics/${cardId}/subscribers`, {
    params: { search, page, limit },
  })
  return data.data
}

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

export async function uploadImage(file, onProgress) {
  // Client-side gate. Not a security boundary on its own — anyone can call
  // Cloudinary directly — but it stops honest mistakes cheaply and keeps the
  // signed request below well-formed.
  if (!file) throw new Error('No file selected')
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Please choose a PNG, JPG, WEBP, GIF or SVG image')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image must be smaller than 5 MB')
  }

  const form = new FormData()
  form.append('file', file)

  // Prefer a server-issued signature: uploads then require a logged-in
  // session, and the preset in the bundle stops being a blank cheque against
  // our Cloudinary account. Falls back to the unsigned preset when the server
  // has no Cloudinary credentials configured, so uploads keep working.
  let cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD || 'demo'
  let signed = false

  // Guests legitimately upload a logo while building a card at /create, and
  // /upload/sign requires auth. Skip the request entirely when there is no
  // token — otherwise every guest upload takes a pointless 401, and the
  // client's 401 interceptor clears the token as a side effect.
  if (getToken()) {
    try {
      const { data } = await client.post('/upload/sign')
      const sig = data.data
      form.append('api_key', sig.apiKey)
      form.append('timestamp', sig.timestamp)
      form.append('signature', sig.signature)
      form.append('folder', sig.folder)
      if (sig.cloudName) cloudName = sig.cloudName
      signed = true
    } catch {
      signed = false // server has no Cloudinary credentials yet — fall back
    }
  }

  if (!signed) {
    form.append('upload_preset', import.meta.env.VITE_CLOUDINARY_PRESET || 'digital_card_logos')
    form.append('folder', 'digital-cards')
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`

  if (onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', url)
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      }
      xhr.onload = () => {
        const json = JSON.parse(xhr.responseText || '{}')
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(json.error?.message || 'Image upload failed'))
          return
        }
        onProgress(100)
        resolve(json.secure_url)
      }
      xhr.onerror = () => reject(new Error('Image upload failed'))
      xhr.send(form)
    })
  }

  const res = await fetch(url, { method: 'POST', body: form })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message || 'Image upload failed')
  return json.secure_url
}

export function uploadLogo(file, onProgress) {
  return uploadImage(file, onProgress)
}
