const crypto = require('crypto')
const { pool } = require('../config/database')
const AppError = require('../utils/AppError')
const { isValidSlugFormat, isReservedSlug } = require('../utils/slug')

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

// Statuses a card OWNER may set through the public API.
// 'published' is deliberately excluded: it is the paid state, and is only
// ever set by verified payment fulfilment (paymentService.fulfillOrder) or by
// an admin. Allowing it here let any authenticated user publish for free with
// a single PUT /api/cards/:id — and it even granted a 30-day billing period.
const ALLOWED_STATUSES = ['draft', 'suspended']

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
  if (updates.slug !== undefined) {
    const slug = String(updates.slug).trim().toLowerCase()
    if (!isValidSlugFormat(slug)) {
      throw new AppError('Link must be 3-30 characters: lowercase letters, numbers, and hyphens only (no leading/trailing hyphen).', 400)
    }
    if (isReservedSlug(slug)) {
      throw new AppError('That link is reserved. Please choose a different one.', 400)
    }
    const existing = await pool.query('SELECT id FROM cards WHERE slug = $1 AND id != $2', [slug, cardId])
    if (existing.rows.length > 0) {
      throw new AppError('That link is already taken. Please choose a different one.', 409)
    }
    fields.push(`slug = $${idx++}`)
    values.push(slug)
  }
  if (updates.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(updates.status)) {
      throw new AppError('Status must be "draft" or "suspended". Publishing happens through checkout.', 400)
    }
    fields.push(`status = $${idx++}`)
    values.push(updates.status)
    // NOTE: there was a `status === 'published'` branch here granting a fresh
    // 30-day billing period. It was unreachable (ALLOWED_STATUSES rejects
    // 'published' above) but would have become a free-publish path the moment
    // anyone widened that list. Publishing belongs to paymentService only.
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

async function cancelSubscription(cardId, userId) {
  const card = await getCardById(cardId, userId)

  if (card.status !== 'published') {
    throw new AppError('Only published cards can have their subscription cancelled', 400)
  }

  // Card keeps working until subscription_expires_at (30 days from last publish)
  // If already has an expiry, honour it; otherwise set 30 days from now
  const expiresAt = card.subscription_expires_at && new Date(card.subscription_expires_at) > new Date()
    ? card.subscription_expires_at
    : (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString() })()

  const result = await pool.query(
    `UPDATE cards SET subscription_cancelled = TRUE, subscription_expires_at = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [expiresAt, cardId]
  )
  return result.rows[0]
}

/**
 * Undo a cancellation *within the period already paid for*.
 *
 * This used to set status='published' and grant a fresh 30 days to any card
 * that was published OR suspended, with no payment involved. That made it a
 * free-renewal endpoint, and it also let a user overturn an admin suspension
 * by republishing themselves. Now it only clears the cancellation flag, never
 * extends the expiry, and refuses anything that would need a new payment.
 */
async function resubscribe(cardId, userId) {
  const card = await getCardById(cardId, userId)

  // Admin moderation is not the user's to undo.
  if (card.status === 'suspended') {
    throw new AppError('This card has been suspended. Please contact support.', 403)
  }
  if (card.status !== 'published') {
    throw new AppError('Only a published card can be resumed. Please checkout to publish.', 400)
  }
  if (!card.subscription_cancelled) {
    return card // already active — nothing to do
  }

  const expiry = card.subscription_expires_at ? new Date(card.subscription_expires_at) : null
  if (!expiry || expiry <= new Date()) {
    throw new AppError('This billing period has ended. Please checkout to renew.', 402)
  }

  // Keep the existing expiry — resuming is not a renewal.
  const result = await pool.query(
    `UPDATE cards SET subscription_cancelled = FALSE, updated_at = NOW()
     WHERE id = $1 AND user_id = $2 RETURNING *`,
    [cardId, userId]
  )
  return result.rows[0]
}

async function deleteCard(cardId, userId) {
  const card = await getCardById(cardId, userId)

  if (card.status === 'archived') {
    return { action: 'none', message: 'Card is already archived' }
  }

  if (card.status === 'suspended') {
    await pool.query(
      "UPDATE cards SET status = 'archived', updated_at = NOW() WHERE id = $1",
      [cardId]
    )
    return { action: 'archived', message: 'Suspended card has been archived' }
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

module.exports = { createCard, getCardsByUser, getCardById, updateCard, deleteCard, unarchiveCard, cancelSubscription, resubscribe }
