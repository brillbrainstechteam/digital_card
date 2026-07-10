const { pool } = require('../config/database')
const AppError = require('../utils/AppError')

async function getPublishedCardBySlug(slug) {
  const result = await pool.query(
    "SELECT id, title, slug, logo_url, card_data FROM cards WHERE slug = $1 AND status = 'published'",
    [slug]
  )

  if (result.rows.length === 0) {
    throw new AppError('Card not found', 404)
  }

  const card = result.rows[0]

  const qrResult = await pool.query(
    'SELECT slug, settings FROM qr_codes WHERE card_id = $1',
    [card.id]
  )
  card.qr_settings = qrResult.rows[0]?.settings || null
  card.qr_slug = qrResult.rows[0]?.slug || null

  return card
}

module.exports = { getPublishedCardBySlug }
