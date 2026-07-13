const crypto = require('crypto')
const { UAParser } = require('ua-parser-js')
const { pool } = require('../config/database')
const AppError = require('../utils/AppError')

function generateSlug() {
  return crypto.randomBytes(5).toString('hex')
}

async function getCardOwned(cardId, userId) {
  const result = await pool.query(
    'SELECT id, slug, status FROM cards WHERE id = $1 AND user_id = $2',
    [cardId, userId]
  )
  if (result.rows.length === 0) throw new AppError('Card not found', 404)
  return result.rows[0]
}

async function getCardQr(userId, cardId) {
  await getCardOwned(cardId, userId)
  const result = await pool.query('SELECT * FROM qr_codes WHERE card_id = $1', [cardId])
  return result.rows[0] || null
}

// Powers the QR Studio sidebar's "My QR Codes" list — every QR the user
// has ever saved, each one card-linked, newest first.
async function listUserQrs(userId) {
  const result = await pool.query(
    `SELECT qr.*, c.title AS card_title, c.slug AS card_slug, c.status AS card_status
     FROM qr_codes qr
     LEFT JOIN cards c ON c.id = qr.card_id
     WHERE qr.user_id = $1
     ORDER BY qr.updated_at DESC`,
    [userId]
  )
  return result.rows
}

// A card can have at most one QR code — enforced here (check-then-write,
// guarded by the DB's unique partial index as a safety net) and by the
// unique index on qr_codes(card_id).
async function upsertCardQr(userId, cardId, settings) {
  await getCardOwned(cardId, userId)

  const existing = await pool.query('SELECT id FROM qr_codes WHERE card_id = $1', [cardId])
  if (existing.rows.length > 0) {
    const result = await pool.query(
      'UPDATE qr_codes SET settings = $1, updated_at = NOW() WHERE card_id = $2 RETURNING *',
      [JSON.stringify(settings), cardId]
    )
    return result.rows[0]
  }

  let slug = generateSlug()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const dupe = await pool.query('SELECT id FROM qr_codes WHERE slug = $1', [slug])
    if (dupe.rows.length === 0) break
    slug = generateSlug()
  }

  const result = await pool.query(
    `INSERT INTO qr_codes (id, user_id, card_id, slug, settings)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [crypto.randomUUID(), userId, cardId, slug, JSON.stringify(settings)]
  )
  return result.rows[0]
}

// The "Publish" action in the standalone QR Studio — a QR with no card
// attached (card_id stays NULL, already supported by the schema/unique
// index). Each publish creates a new row rather than upserting, since
// unlike a card's QR (capped at one), a user can publish as many
// standalone QR codes as they like.
async function createStandaloneQr(userId, settings) {
  let slug = generateSlug()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const dupe = await pool.query('SELECT id FROM qr_codes WHERE slug = $1', [slug])
    if (dupe.rows.length === 0) break
    slug = generateSlug()
  }

  const result = await pool.query(
    `INSERT INTO qr_codes (id, user_id, card_id, slug, settings)
     VALUES ($1, $2, NULL, $3, $4) RETURNING *`,
    [crypto.randomUUID(), userId, slug, JSON.stringify(settings)]
  )
  return result.rows[0]
}

async function activateQrPurchase(userId, qrId) {
  const owned = await pool.query(
    'SELECT settings FROM qr_codes WHERE id = $1 AND user_id = $2',
    [qrId, userId]
  )
  if (owned.rows.length === 0) throw new AppError('QR code not found', 404)
  const settings = { ...(owned.rows[0].settings || {}), purchased: true }
  const result = await pool.query(
    `UPDATE qr_codes
     SET settings = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3
     RETURNING *`,
    [JSON.stringify(settings), qrId, userId]
  )
  return result.rows[0]
}

async function deleteCardQr(userId, cardId) {
  await getCardOwned(cardId, userId)
  await pool.query('DELETE FROM qr_codes WHERE card_id = $1', [cardId])
  return { ok: true }
}

// ---- Public scan resolution + tracking ----

async function getQrBySlugPublic(slug) {
  const result = await pool.query(
    `SELECT qr.id, qr.card_id, qr.slug, qr.settings, c.slug AS card_slug, c.status AS card_status
     FROM qr_codes qr
     LEFT JOIN cards c ON c.id = qr.card_id
     WHERE qr.slug = $1`,
    [slug]
  )
  if (result.rows.length === 0) throw new AppError('QR code not found', 404)
  const qr = result.rows[0]
  if (qr.settings?.purchased !== true) throw new AppError('QR code is awaiting payment', 404)
  if (qr.card_id && qr.card_status !== 'published') throw new AppError('QR code is not published', 404)
  return qr
}

function parseUserAgent(uaString) {
  const parser = new UAParser(uaString)
  const device = parser.getDevice()
  const browser = parser.getBrowser()
  const os = parser.getOS()
  return {
    deviceType: device.type || 'desktop',
    browser: browser.name || 'Unknown',
    os: os.name || 'Unknown',
  }
}

function hashVisitor(ip, userAgent) {
  return crypto.createHash('sha256').update(`${ip}::${userAgent}`).digest('hex')
}

const PRIVATE_IP_PREFIXES = ['127.', '10.', '192.168.', '::1']

// Best-effort, key-free IP geolocation. Any failure (offline, rate-limited,
// timeout) silently degrades to "unknown" rather than blocking the scan.
async function geolocateIp(ip) {
  if (!ip || PRIVATE_IP_PREFIXES.some((prefix) => ip.startsWith(prefix))) {
    return { country: null, city: null }
  }
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1500)
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const json = await res.json()
    if (json.status !== 'success') return { country: null, city: null }
    return { country: json.country || null, city: json.city || null }
  } catch {
    return { country: null, city: null }
  }
}

function extractClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress || ''
}

async function recordScan(qrRow, req) {
  const ip = extractClientIp(req)
  const userAgent = req.headers['user-agent'] || ''
  const referrer = req.headers['referer'] || req.headers['referrer'] || null
  const { deviceType, browser, os } = parseUserAgent(userAgent)
  const visitorHash = hashVisitor(ip, userAgent)
  const { country, city } = await geolocateIp(ip)

  await pool.query(
    `INSERT INTO qr_scans (qr_id, visitor_hash, device_type, browser, os, country, city, referrer)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [qrRow.id, visitorHash, deviceType, browser, os, country, city, referrer]
  )

  // Feeds the same card_events timeline used by Recent Activity, so a QR
  // scan shows up alongside views/clicks/leads without a separate counter.
  if (qrRow.card_id) {
    await pool.query(
      "INSERT INTO card_events (card_id, event_type, metadata) VALUES ($1, 'qr_scan', $2)",
      [qrRow.card_id, JSON.stringify({ qr_id: qrRow.id })]
    )
  }

  return { ok: true }
}

// ---- Analytics ----

async function verifyQrOwnership(userId, qrId) {
  const result = await pool.query('SELECT * FROM qr_codes WHERE id = $1 AND user_id = $2', [qrId, userId])
  if (result.rows.length === 0) throw new AppError('QR code not found', 404)
  return result.rows[0]
}

async function getOwnedQrIds(userId, qrId, cardId) {
  if (qrId) {
    const qr = await verifyQrOwnership(userId, qrId)
    return [qr.id]
  }
  if (cardId) {
    await getCardOwned(cardId, userId)
    const result = await pool.query('SELECT id FROM qr_codes WHERE card_id = $1', [cardId])
    return result.rows.map((r) => r.id)
  }
  const result = await pool.query('SELECT id FROM qr_codes WHERE user_id = $1', [userId])
  return result.rows.map((r) => r.id)
}

function rowsToMap(rows, key) {
  return Object.fromEntries(rows.map((r) => [r[key] || 'unknown', r.count]))
}

async function getQrAnalytics(userId, { qrId, cardId } = {}) {
  const qrIds = await getOwnedQrIds(userId, qrId, cardId)
  if (qrIds.length === 0) {
    return {
      totalScans: 0,
      uniqueScans: 0,
      deviceBreakdown: {},
      browserBreakdown: {},
      osBreakdown: {},
      countryBreakdown: {},
      recentScans: [],
    }
  }

  const [totalRes, uniqueRes, deviceRes, browserRes, osRes, countryRes, recentRes] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count FROM qr_scans WHERE qr_id = ANY($1::uuid[])', [qrIds]),
    pool.query('SELECT COUNT(DISTINCT visitor_hash)::int AS count FROM qr_scans WHERE qr_id = ANY($1::uuid[])', [qrIds]),
    pool.query('SELECT device_type, COUNT(*)::int AS count FROM qr_scans WHERE qr_id = ANY($1::uuid[]) GROUP BY device_type', [qrIds]),
    pool.query('SELECT browser, COUNT(*)::int AS count FROM qr_scans WHERE qr_id = ANY($1::uuid[]) GROUP BY browser', [qrIds]),
    pool.query('SELECT os, COUNT(*)::int AS count FROM qr_scans WHERE qr_id = ANY($1::uuid[]) GROUP BY os', [qrIds]),
    pool.query("SELECT country, COUNT(*)::int AS count FROM qr_scans WHERE qr_id = ANY($1::uuid[]) AND country IS NOT NULL GROUP BY country", [qrIds]),
    pool.query(
      'SELECT device_type, browser, os, country, city, referrer, created_at FROM qr_scans WHERE qr_id = ANY($1::uuid[]) ORDER BY created_at DESC LIMIT 20',
      [qrIds]
    ),
  ])

  return {
    totalScans: totalRes.rows[0].count,
    uniqueScans: uniqueRes.rows[0].count,
    deviceBreakdown: rowsToMap(deviceRes.rows, 'device_type'),
    browserBreakdown: rowsToMap(browserRes.rows, 'browser'),
    osBreakdown: rowsToMap(osRes.rows, 'os'),
    countryBreakdown: rowsToMap(countryRes.rows, 'country'),
    recentScans: recentRes.rows,
  }
}

module.exports = {
  getCardQr,
  listUserQrs,
  upsertCardQr,
  createStandaloneQr,
  activateQrPurchase,
  deleteCardQr,
  getQrBySlugPublic,
  recordScan,
  getQrAnalytics,
}
