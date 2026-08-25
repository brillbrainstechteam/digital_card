const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { pool } = require('../config/database')
const contactService = require('./contactService')

function generateTempPassword() {
  return crypto.randomBytes(6).toString('base64url')
}

async function resetUserPassword(userId) {
  const tempPassword = generateTempPassword()
  const salt = await bcrypt.genSalt(12)
  const password_hash = await bcrypt.hash(tempPassword, salt)
  const result = await pool.query(
    // credentials_changed_at revokes every JWT already issued for this user.
    // Without it, resetting the password of a compromised account left the
    // attacker's existing token working for the rest of its 7-day life.
    'UPDATE users SET password_hash = $1, credentials_changed_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING id, email',
    [password_hash, userId]
  )
  if (!result.rows[0]) throw new Error('User not found')
  return { email: result.rows[0].email, tempPassword }
}

// A trailing-window count plus the immediately preceding window of the same
// length, so the panel can show "+N this week" against "vs last week" rather
// than a bare total with no sense of direction.
function windowedCountSql(table) {
  return `
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')  AS last7,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days'
                         AND created_at <  NOW() - INTERVAL '7 days')  AS prev7,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS last30
    FROM ${table}
  `
}

function readWindow(row) {
  return {
    total: parseInt(row.total, 10),
    last7: parseInt(row.last7, 10),
    prev7: parseInt(row.prev7, 10),
    last30: parseInt(row.last30, 10),
  }
}


// Admin is a single shared credential, so at minimum every destructive action
// it takes must be attributable and reviewable after the fact. Failures here
// are logged but never block the action itself.
async function recordAdminAction({ actor, action, targetType, targetId, detail, ip }) {
  try {
    await pool.query(
      `INSERT INTO admin_audit_log (actor, action, target_type, target_id, detail, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actor || 'unknown', action, targetType || null, targetId ? String(targetId) : null,
       detail ? JSON.stringify(detail) : null, ip || null]
    )
  } catch (err) {
    console.error('[admin audit]', err.message)
  }
}

async function getAdminAuditLog(limit = 200) {
  const result = await pool.query(
    'SELECT actor, action, target_type, target_id, detail, ip, created_at FROM admin_audit_log ORDER BY created_at DESC LIMIT $1',
    [Math.min(Math.max(parseInt(limit, 10) || 200, 1), 500)]
  )
  return result.rows
}


async function getContactMessages() {
  return contactService.getAllMessages()
}

async function setContactMessageStatus(id, status) {
  return contactService.updateMessageStatus(id, status)
}

async function getStats() {
  const [users, cards, qrcodes, cardStatus, qrPurchased, views, scans, leads] = await Promise.all([
    pool.query(windowedCountSql('users')),
    pool.query(windowedCountSql('cards')),
    pool.query(windowedCountSql('qr_codes')),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'published') AS published,
        COUNT(*) FILTER (WHERE status = 'draft')     AS draft,
        COUNT(*) FILTER (WHERE status = 'suspended') AS suspended,
        COUNT(*) FILTER (WHERE status = 'archived')  AS archived
      FROM cards
    `),
    // Revenue only ever comes from QR codes that were actually paid for. The
    // Overview used to bill every QR row, which silently overstated MRR by
    // counting unpaid drafts.
    pool.query("SELECT COUNT(*) AS c FROM qr_codes WHERE settings->>'purchased' = 'true'"),
    pool.query(windowedCountSql('card_views')),
    pool.query(windowedCountSql('qr_scans')),
    pool.query(windowedCountSql('leads')),
  ])

  const cs = cardStatus.rows[0]
  return {
    users: readWindow(users.rows[0]),
    cards: readWindow(cards.rows[0]),
    qrCodes: readWindow(qrcodes.rows[0]),
    views: readWindow(views.rows[0]),
    scans: readWindow(scans.rows[0]),
    leads: readWindow(leads.rows[0]),
    purchasedQrCodes: parseInt(qrPurchased.rows[0].c, 10),
    publishedCards: parseInt(cs.published, 10),
    draftCards: parseInt(cs.draft, 10),
    suspendedCards: parseInt(cs.suspended, 10),
    archivedCards: parseInt(cs.archived, 10),

    // Flat aliases kept so any older consumer of this endpoint keeps working.
    totalUsers: parseInt(users.rows[0].total, 10),
    totalCards: parseInt(cards.rows[0].total, 10),
    totalQrCodes: parseInt(qrcodes.rows[0].total, 10),
  }
}

// Daily buckets for the last 30 days, one row per calendar day even when
// nothing happened — a series with gaps would draw a misleading chart.
async function getInsights() {
  const [series, topCards, devices, countries] = await Promise.all([
    pool.query(`
      WITH days AS (
        SELECT generate_series((NOW() - INTERVAL '29 days')::date, NOW()::date, '1 day')::date AS day
      )
      SELECT
        d.day,
        COALESCE(u.c, 0) AS users,
        COALESCE(c.c, 0) AS cards,
        COALESCE(v.c, 0) AS views,
        COALESCE(s.c, 0) AS scans
      FROM days d
      LEFT JOIN (SELECT created_at::date AS day, COUNT(*) c FROM users      WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY 1) u ON u.day = d.day
      LEFT JOIN (SELECT created_at::date AS day, COUNT(*) c FROM cards      WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY 1) c ON c.day = d.day
      LEFT JOIN (SELECT created_at::date AS day, COUNT(*) c FROM card_views WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY 1) v ON v.day = d.day
      LEFT JOIN (SELECT created_at::date AS day, COUNT(*) c FROM qr_scans   WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY 1) s ON s.day = d.day
      ORDER BY d.day
    `),
    pool.query(`
      SELECT c.id, c.title, c.slug, u.email AS user_email,
        COUNT(DISTINCT v.id) AS views,
        COUNT(DISTINCT l.id) AS leads
      FROM cards c
      LEFT JOIN users u      ON u.id = c.user_id
      LEFT JOIN card_views v ON v.card_id = c.id
      LEFT JOIN leads l      ON l.card_id = c.id
      GROUP BY c.id, u.email
      HAVING COUNT(DISTINCT v.id) > 0
      ORDER BY views DESC
      LIMIT 10
    `),
    pool.query(`
      SELECT COALESCE(NULLIF(device_type, ''), 'unknown') AS label, COUNT(*) AS c
      FROM qr_scans GROUP BY 1 ORDER BY c DESC LIMIT 6
    `),
    pool.query(`
      SELECT COALESCE(NULLIF(country, ''), 'unknown') AS label, COUNT(*) AS c
      FROM qr_scans GROUP BY 1 ORDER BY c DESC LIMIT 6
    `),
  ])

  const toBreakdown = (rows) => rows.map((r) => ({ label: r.label, count: parseInt(r.c, 10) }))

  return {
    series: series.rows.map((r) => ({
      day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10),
      users: parseInt(r.users, 10),
      cards: parseInt(r.cards, 10),
      views: parseInt(r.views, 10),
      scans: parseInt(r.scans, 10),
    })),
    topCards: topCards.rows.map((r) => ({
      ...r,
      views: parseInt(r.views, 10),
      leads: parseInt(r.leads, 10),
    })),
    devices: toBreakdown(devices.rows),
    countries: toBreakdown(countries.rows),
  }
}

// Everything about one user in a single round-trip, for the drill-down panel.
async function getUserDetail(userId) {
  const [user, cards, qrs, leads] = await Promise.all([
    pool.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [userId]),
    pool.query(`
      SELECT c.id, c.title, c.slug, c.status, c.created_at,
        (SELECT COUNT(*) FROM card_views v WHERE v.card_id = c.id) AS views,
        (SELECT COUNT(*) FROM leads l WHERE l.card_id = c.id)      AS leads
      FROM cards c WHERE c.user_id = $1 ORDER BY c.created_at DESC
    `, [userId]),
    pool.query(`
      SELECT q.id, q.slug, q.created_at,
        q.settings->>'purchased'       AS purchased,
        q.settings->>'lifecycleStatus' AS lifecycle_status,
        (SELECT title FROM cards WHERE cards.id = q.card_id) AS card_title,
        (SELECT COUNT(*) FROM qr_scans s WHERE s.qr_id = q.id) AS scans
      FROM qr_codes q WHERE q.user_id = $1 ORDER BY q.created_at DESC
    `, [userId]),
    pool.query('SELECT COUNT(*) AS c FROM leads WHERE card_id IN (SELECT id FROM cards WHERE user_id = $1)', [userId]),
  ])

  if (!user.rows[0]) throw new Error('User not found')
  return {
    user: user.rows[0],
    cards: cards.rows.map((r) => ({ ...r, views: parseInt(r.views, 10), leads: parseInt(r.leads, 10) })),
    qrCodes: qrs.rows.map((r) => ({ ...r, scans: parseInt(r.scans, 10) })),
    totalLeads: parseInt(leads.rows[0].c, 10),
  }
}

async function getAllUsers() {
  const result = await pool.query(`
    SELECT u.id, u.name, u.email, u.created_at,
      COUNT(DISTINCT c.id) AS card_count,
      COUNT(DISTINCT q.id) AS qr_count,
      COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'published') AS published_count
    FROM users u
    LEFT JOIN cards c ON c.user_id = u.id
    LEFT JOIN qr_codes q ON q.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `)
  return result.rows.map((r) => ({
    ...r,
    card_count: parseInt(r.card_count, 10),
    qr_count: parseInt(r.qr_count, 10),
    published_count: parseInt(r.published_count, 10),
  }))
}

async function getAllCards() {
  const result = await pool.query(`
    SELECT c.id, c.title, c.slug, c.status, c.created_at, c.updated_at,
      u.name AS user_name, u.email AS user_email,
      (SELECT COUNT(*) FROM card_views v WHERE v.card_id = c.id) AS views,
      (SELECT COUNT(*) FROM leads l WHERE l.card_id = c.id)      AS leads
    FROM cards c
    LEFT JOIN users u ON u.id = c.user_id
    ORDER BY c.created_at DESC
  `)
  return result.rows.map((r) => ({
    ...r,
    views: parseInt(r.views, 10),
    leads: parseInt(r.leads, 10),
  }))
}

async function getAllQrCodes() {
  const result = await pool.query(`
    SELECT q.id, q.slug, q.created_at, q.updated_at,
      c.title AS card_title,
      q.settings->>'lifecycleStatus' AS lifecycle_status,
      q.settings->>'purchased' AS purchased,
      u.name AS user_name, u.email AS user_email,
      (SELECT COUNT(*) FROM qr_scans s WHERE s.qr_id = q.id) AS scans
    FROM qr_codes q
    LEFT JOIN users u ON u.id = q.user_id
    LEFT JOIN cards c ON c.id = q.card_id
    ORDER BY q.created_at DESC
  `)
  return result.rows.map((r) => ({ ...r, scans: parseInt(r.scans, 10) }))
}

async function adminUpdateCardStatus(cardId, status) {
  // Card ids are UUIDs, not integers — parseInt() truncated them to a
  // garbage number (e.g. '774527dd-b8cb-...' -> 774527), which Postgres
  // then rejected outright when casting it to the uuid column ("invalid
  // input syntax for type uuid"). Every status change from this panel was
  // failing before this fix.
  const result = await pool.query(
    'UPDATE cards SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, title, status',
    [status, cardId]
  )
  if (!result.rows[0]) throw new Error('Card not found')
  return result.rows[0]
}

async function adminUpdateQrLifecycle(qrId, lifecycleStatus) {
  // Same UUID/parseInt bug as adminUpdateCardStatus above, plus a
  // RETURNING of `card_title`, a column that only exists on `cards` — it
  // was never joined here, so this also threw "column card_title does not
  // exist" (same class of bug fixed elsewhere in getAllQrCodes). Standalone
  // QR codes (not attached to a card) have card_id = NULL, so the title is
  // pulled via a scalar subquery rather than an inner join — a plain
  // UPDATE ... FROM cards would silently fail to update those rows at all.
  const result = await pool.query(
    `UPDATE qr_codes SET settings = jsonb_set(settings, '{lifecycleStatus}', $1::jsonb), updated_at = NOW()
     WHERE id = $2
     RETURNING id, (SELECT title FROM cards WHERE cards.id = qr_codes.card_id) AS card_title, settings`,
    [JSON.stringify(lifecycleStatus), qrId]
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

module.exports = { recordAdminAction, getAdminAuditLog, getContactMessages, setContactMessageStatus, getStats, getInsights, getUserDetail, getAllUsers, getAllCards, getAllQrCodes, adminUpdateCardStatus, adminUpdateQrLifecycle, adminDeleteCard, adminDeleteUser, getRecentActivity, getSubscriptionStats, getAllSubscriptions, resetUserPassword }
