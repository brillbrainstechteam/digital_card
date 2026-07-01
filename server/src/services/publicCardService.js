const { pool } = require('../config/database')
const AppError = require('../utils/AppError')

async function getPublishedCardBySlug(slug) {
  const result = await pool.query(
    "SELECT title, slug, logo_url, card_data FROM cards WHERE slug = $1 AND status = 'published'",
    [slug]
  )

  if (result.rows.length === 0) {
    throw new AppError('Card not found', 404)
  }

  return result.rows[0]
}

module.exports = { getPublishedCardBySlug }
