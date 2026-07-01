import client from './api/client'

export async function fetchCards() {
  const { data } = await client.get('/cards')
  return data.data.cards
}

export async function fetchCard(id) {
  const { data } = await client.get(`/cards/${id}`)
  return data.data.card
}

export async function createCard(title) {
  const { data } = await client.post('/cards', { title })
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

export async function fetchPublicCard(slug) {
  const { data } = await client.get(`/public/cards/${slug}`)
  return data.data.card
}

export async function uploadImage(file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', import.meta.env.VITE_CLOUDINARY_PRESET || 'digital_card_logos')
  form.append('folder', 'digital-cards')

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD || 'demo'
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
