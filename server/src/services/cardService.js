const crypto = require('crypto')
const { pool } = require('../config/database')
const AppError = require('../utils/AppError')

function generateSlug(title) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  const suffix = crypto.randomBytes(3).toString('hex')
  return `${base}-${suffix}`
}

async function createCard(userId, { title, card_data }) {
  let slug = generateSlug(title)
  let attempts = 0
  while (attempts < 5) {
    const existing = await pool.query('SELECT id FROM cards WHERE slug = $1', [slug])
    if (existing.rows.length === 0) break
    slug = generateSlug(title)
    attempts++
  }
  if (attempts === 5) {
    throw new AppError('Could not generate a unique slug. Please try again.', 500)
  }

  const initialData = card_data && typeof card_data === 'object' ? card_data : {}

  const result = await pool.query(
    `INSERT INTO cards (user_id, title, slug, logo_url, status, card_data)
     VALUES ($1, $2, $3, NULL, 'draft', $4)
     RETURNING *`,
    [userId, title, slug, JSON.stringify(initialData)]
  )

  return result.rows[0]
}

async function getCardsByUser(userId) {
  const result = await pool.query(
    'SELECT * FROM cards WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  )
  return result.rows
}

async function getCardById(cardId, userId) {
  const result = await pool.query('SELECT * FROM cards WHERE id = $1', [cardId])

  if (result.rows.length === 0) {
    throw new AppError('Card not found', 404)
  }

  const card = result.rows[0]
  if (card.user_id !== userId) {
    throw new AppError('You do not have permission to access this card', 403)
  }

  return card
}

const ALLOWED_STATUSES = ['draft', 'published']

async function updateCard(cardId, userId, updates) {
  const card = await getCardById(cardId, userId)

  const fields = []
  const values = []
  let idx = 1

  if (updates.title !== undefined) {
    fields.push(`title = $${idx++}`)
    values.push(updates.title)
  }
  if (updates.logo_url !== undefined) {
    fields.push(`logo_url = $${idx++}`)
    values.push(updates.logo_url)
  }
  if (updates.card_data !== undefined) {
    fields.push(`card_data = $${idx++}`)
    values.push(JSON.stringify(updates.card_data))
  }
  if (updates.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(updates.status)) {
      throw new AppError('Status must be "draft" or "published"', 400)
    }
    fields.push(`status = $${idx++}`)
    values.push(updates.status)
  }

  if (fields.length === 0) {
    return card
  }

  fields.push(`updated_at = NOW()`)
  values.push(cardId)

  const result = await pool.query(
    `UPDATE cards SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )

  return result.rows[0]
}

async function deleteCard(cardId, userId) {
  const card = await getCardById(cardId, userId)

  if (card.status === 'archived') {
    return { action: 'none', message: 'Card is already archived' }
  }

  if (card.status === 'draft') {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `DELETE FROM qr_scans
         WHERE qr_id IN (SELECT id FROM qr_codes WHERE card_id = $1)`,
        [cardId]
      )
      await client.query('DELETE FROM qr_codes WHERE card_id = $1', [cardId])
      await client.query('DELETE FROM cards WHERE id = $1 AND user_id = $2', [cardId, userId])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    return { action: 'deleted', message: 'Draft card permanently deleted' }
  }

  await pool.query(
    "UPDATE cards SET status = 'archived', updated_at = NOW() WHERE id = $1",
    [cardId]
  )
  return { action: 'archived', message: 'Published card has been archived' }
}

async function unarchiveCard(cardId, userId) {
  const card = await getCardById(cardId, userId)

  if (card.status !== 'archived') {
    throw new AppError('Card is not archived', 400)
  }

  const result = await pool.query(
    "UPDATE cards SET status = 'draft', updated_at = NOW() WHERE id = $1 RETURNING *",
    [cardId]
  )
  return result.rows[0]
}

module.exports = { createCard, getCardsByUser, getCardById, updateCard, deleteCard, unarchiveCard }
