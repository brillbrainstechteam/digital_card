const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { pool } = require('../config/database')

function generateTempPassword() {
  return crypto.randomBytes(6).toString('base64url')
}

async function resetUserPassword(userId) {
  const tempPassword = generateTempPassword()
  const salt = await bcrypt.genSalt(12)
  const password_hash = await bcrypt.hash(tempPassword, salt)
  const result = await pool.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email',
    [password_hash, userId]
  )
  if (!result.rows[0]) throw new Error('User not found')
  return { email: result.rows[0].email, tempPassword }
}

async function getStats() {
  const [users, cards, qrcodes, published, suspended, archived] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM users'),
    pool.query('SELECT COUNT(*) FROM cards'),
    pool.query('SELECT COUNT(*) FROM qr_codes'),
    pool.query("SELECT COUNT(*) FROM cards WHERE status = 'published'"),
    pool.query("SELECT COUNT(*) FROM cards WHERE status = 'suspended'"),
    pool.query("SELECT COUNT(*) FROM cards WHERE status = 'archived'"),
  ])

  return {
    totalUsers: parseInt(users.rows[0].count, 10),
    totalCards: parseInt(cards.rows[0].count, 10),
    totalQrCodes: parseInt(qrcodes.rows[0].count, 10),
    publishedCards: parseInt(published.rows[0].count, 10),
    suspendedCards: parseInt(suspended.rows[0].count, 10),
    archivedCards: parseInt(archived.rows[0].count, 10),
  }
}

async function getAllUsers() {
  const result = await pool.query(`
    SELECT u.id, u.name, u.email, u.created_at,
      COUNT(DISTINCT c.id) AS card_count,
      COUNT(DISTINCT q.id) AS qr_count
    FROM users u
    LEFT JOIN cards c ON c.user_id = u.id
    LEFT JOIN qr_codes q ON q.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `)
  return result.rows
}

async function getAllCards() {
  const result = await pool.query(`
    SELECT c.id, c.title, c.slug, c.status, c.created_at, c.updated_at,
      u.name AS user_name, u.email AS user_email
    FROM cards c
    LEFT JOIN users u ON u.id = c.user_id
    ORDER BY c.created_at DESC
  `)
  return result.rows
}

async function getAllQrCodes() {
  const result = await pool.query(`
    SELECT q.id, q.slug, q.created_at, q.updated_at,
      c.title AS card_title,
      q.settings->>'lifecycleStatus' AS lifecycle_status,
      q.settings->>'purchased' AS purchased,
      u.name AS user_name, u.email AS user_email
    FROM qr_codes q
    LEFT JOIN users u ON u.id = q.user_id
    LEFT JOIN cards c ON c.id = q.card_id
    ORDER BY q.created_at DESC
  `)
  return result.rows
}

async function adminUpdateCardStatus(cardId, status) {
  const result = await pool.query(
    'UPDATE cards SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, title, status',
    [status, parseInt(cardId, 10)]
  )
  if (!result.rows[0]) throw new Error('Card not found')
  return result.rows[0]
}

async function adminUpdateQrLifecycle(qrId, lifecycleStatus) {
  const result = await pool.query(
    `UPDATE qr_codes SET settings = jsonb_set(settings, '{lifecycleStatus}', $1::jsonb), updated_at = NOW()
     WHERE id = $2 RETURNING id, card_title, settings`,
    [JSON.stringify(lifecycleStatus), parseInt(qrId, 10)]
  )
  if (!result.rows[0]) throw new Error('QR code not found')
  return result.rows[0]
}

async function getSubscriptionStats() {
  const [active, cancelled, expired, suspended] = await Promise.all([
    pool.query("SELECT COUNT(*) FROM cards WHERE status = 'published' AND subscription_cancelled = FALSE"),
    pool.query("SELECT COUNT(*) FROM cards WHERE subscription_cancelled = TRUE AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW())"),
    pool.query("SELECT COUNT(*) FROM cards WHERE subscription_cancelled = TRUE AND subscription_expires_at IS NOT NULL AND subscription_expires_at < NOW()"),
    pool.query("SELECT COUNT(*) FROM cards WHERE status = 'suspended'"),
  ])
  return {
    active: parseInt(active.rows[0].count, 10),
    cancelled: parseInt(cancelled.rows[0].count, 10),
    expired: parseInt(expired.rows[0].count, 10),
    suspended: parseInt(suspended.rows[0].count, 10),
  }
}

async function getAllSubscriptions() {
  const result = await pool.query(`
    SELECT c.id, c.title, c.slug, c.status, c.subscription_cancelled,
           c.subscription_expires_at, c.created_at, c.updated_at,
           u.name AS user_name, u.email AS user_email
    FROM cards c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.status IN ('published', 'suspended') OR c.subscription_cancelled = TRUE
    ORDER BY c.updated_at DESC
  `)
  return result.rows
}

async function adminDeleteCard(cardId) {
  await pool.query('DELETE FROM qr_scans WHERE qr_id IN (SELECT id FROM qr_codes WHERE card_id = $1)', [cardId])
  await pool.query('DELETE FROM qr_codes WHERE card_id = $1', [cardId])
  await pool.query('DELETE FROM cards WHERE id = $1', [cardId])
}

async function adminDeleteUser(userId) {
  const cards = await pool.query('SELECT id FROM cards WHERE user_id = $1', [userId])
  for (const card of cards.rows) {
    await adminDeleteCard(card.id)
  }
  await pool.query('DELETE FROM users WHERE id = $1', [userId])
}

async function getRecentActivity() {
  const result = await pool.query(`
    SELECT 'card_created' AS type, c.title AS label, u.email AS user_email, c.created_at AS ts
    FROM cards c LEFT JOIN users u ON u.id = c.user_id
    UNION ALL
    SELECT 'user_signup' AS type, u.name AS label, u.email AS user_email, u.created_at AS ts
    FROM users u
    ORDER BY ts DESC
    LIMIT 30
  `)
  return result.rows
}

module.exports = { getStats, getAllUsers, getAllCards, getAllQrCodes, adminUpdateCardStatus, adminUpdateQrLifecycle, adminDeleteCard, adminDeleteUser, getRecentActivity, getSubscriptionStats, getAllSubscriptions, resetUserPassword }
