const { pool } = require('../config/database')
const AppError = require('../utils/AppError')

async function getPublishedCardBySlug(slug) {
  const result = await pool.query(
    `SELECT id, title, slug, logo_url, card_data, status,
            subscription_cancelled, subscription_expires_at
     FROM cards WHERE slug = $1 AND status != 'archived' AND status != 'draft'`,
    [slug]
  )

  if (result.rows.length === 0) {
    throw new AppError('Card not found', 404)
  }

  const card = result.rows[0]

  if (card.status === 'suspended') {
    throw new AppError('This card is currently inactive', 402)
  }

  // Subscription cancelled and billing period has passed → block access
  if (card.subscription_cancelled && card.subscription_expires_at && new Date(card.subscription_expires_at) < new Date()) {
    throw new AppError('This card subscription has expired', 402)
  }

  const qrResult = await pool.query(
    'SELECT slug, settings FROM qr_codes WHERE card_id = $1',
    [card.id]
  )
  card.qr_settings = qrResult.rows[0]?.settings || null
  card.qr_slug = qrResult.rows[0]?.slug || null

  return card
}

module.exports = { getPublishedCardBySlug }
