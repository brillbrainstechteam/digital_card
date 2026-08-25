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

  // The full qr_settings blob used to be returned to anonymous visitors. It
  // carries destinationFields, which for a Wi-Fi QR contains the network
  // password, and server-managed flags like `purchased`. Only the slug is
  // needed publicly; nothing on the page consumes the rest.
  const qrResult = await pool.query(
    'SELECT slug FROM qr_codes WHERE card_id = $1',
    [card.id]
  )
  card.qr_slug = qrResult.rows[0]?.slug || null

  // Billing state is internal: it decided access above and should not be
  // published alongside the card.
  delete card.subscription_cancelled
  delete card.subscription_expires_at

  return card
}

module.exports = { getPublishedCardBySlug }
