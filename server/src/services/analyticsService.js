const { pool } = require('../config/database')
const AppError = require('../utils/AppError')

const BUTTON_TYPES = [
  'call', 'email', 'whatsapp', 'website', 'save_contact', 'google_maps',
  'instagram', 'facebook', 'linkedin', 'twitter', 'youtube',
  'telegram', 'tiktok', 'threads', 'soundcloud', 'pinterest',
  'patreon', 'twitch', 'apple_music', 'reddit', 'github',
]

async function getCardBySlug(slug) {
  const result = await pool.query('SELECT id, status FROM cards WHERE slug = $1', [slug])
  if (result.rows.length === 0) throw new AppError('Card not found', 404)
  return result.rows[0]
}

async function trackView(slug) {
  const card = await getCardBySlug(slug)
  if (card.status !== 'published') return { ok: false }
  await pool.query('INSERT INTO card_views (card_id) VALUES ($1)', [card.id])
  await pool.query("INSERT INTO card_events (card_id, event_type) VALUES ($1, 'view')", [card.id])
  return { ok: true }
}

async function trackButtonClick(slug, buttonType) {
  if (!BUTTON_TYPES.includes(buttonType)) throw new AppError('Invalid button type', 400)
  const card = await getCardBySlug(slug)
  await pool.query('INSERT INTO button_clicks (card_id, button_type) VALUES ($1, $2)', [card.id, buttonType])
  await pool.query(
    "INSERT INTO card_events (card_id, event_type, metadata) VALUES ($1, 'button_click', $2)",
    [card.id, JSON.stringify({ button: buttonType })]
  )
  return { ok: true }
}

async function createLead(slug, payload) {
  const card = await getCardBySlug(slug)
  const { visitorName, businessName, email, phone } = payload
  if (!visitorName || !visitorName.trim()) throw new AppError('Visitor name is required', 400)
  if (!phone || !phone.trim()) throw new AppError('Phone number is required', 400)
  const result = await pool.query(
    'INSERT INTO leads (card_id, visitor_name, business_name, email, phone) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [card.id, visitorName.trim(), businessName?.trim() || null, email?.trim() || null, phone.trim()]
  )
  await pool.query(
    "INSERT INTO card_events (card_id, event_type, metadata) VALUES ($1, 'lead_created', $2)",
    [card.id, JSON.stringify({ visitor_name: visitorName.trim() })]
  )
  return result.rows[0]
}

async function verifyOwnership(userId, cardId) {
  if (!cardId || cardId === 'all') return null
  const result = await pool.query('SELECT id, status FROM cards WHERE id = $1 AND user_id = $2', [cardId, userId])
  if (result.rows.length === 0) throw new AppError('Forbidden', 403)
  return result.rows[0]
}

async function getOwnedCardIds(userId, cardId) {
  if (cardId && cardId !== 'all') {
    const card = await verifyOwnership(userId, cardId)
    return card.status === 'archived' ? [] : [cardId]
  }
  const result = await pool.query(
    "SELECT id FROM cards WHERE user_id = $1 AND status <> 'archived'",
    [userId]
  )
  return result.rows.map((r) => r.id)
}

// The DB server runs in UTC (`SHOW timezone` -> Etc/UTC) but the business and
// every user of this analytics page is in India. Every "day" boundary below
// used to be computed in UTC — `NOW()::date`, `CURRENT_DATE`, a bare date
// literal — so a view/lead/scan that happened at, say, 1:30 AM IST landed
// under UTC's "yesterday" (that instant is still 20:00 the previous day in
// UTC). "Today" silently excluded the first 5.5 hours of the actual day, and
// "This Month" had the same slip at month boundaries. Every comparison here
// is now anchored to IST wall-clock midnight instead.
const REPORTING_TZ = 'Asia/Kolkata'

function applyDateFilter(conditions, params, dateRange, dateFrom, dateTo, column = 'created_at') {
  if (dateRange === 'today') {
    conditions.push(`${column} >= ((NOW() AT TIME ZONE '${REPORTING_TZ}')::date AT TIME ZONE '${REPORTING_TZ}')`)
  } else if (dateRange === 'last7') {
    // A rolling 7/30-day window is a fixed duration regardless of timezone —
    // "now minus 7 days" is the same instant everywhere, so these two need no
    // conversion.
    conditions.push(`${column} >= NOW() - INTERVAL '7 days'`)
  } else if (dateRange === 'last30') {
    conditions.push(`${column} >= NOW() - INTERVAL '30 days'`)
  } else if (dateRange === 'thisMonth') {
    conditions.push(`date_trunc('month', ${column} AT TIME ZONE '${REPORTING_TZ}') = date_trunc('month', NOW() AT TIME ZONE '${REPORTING_TZ}')`)
  } else if (dateRange === 'custom') {
    // dateFrom/dateTo come from an HTML <input type="date"> as a bare
    // "YYYY-MM-DD" — the user means that calendar day in their own timezone,
    // not a UTC date.
    if (dateFrom) {
      params.push(dateFrom)
      conditions.push(`${column} >= ($${params.length}::date AT TIME ZONE '${REPORTING_TZ}')`)
    }
    if (dateTo) {
      params.push(dateTo)
      conditions.push(`${column} < (($${params.length}::date + INTERVAL '1 day') AT TIME ZONE '${REPORTING_TZ}')`)
    }
  }
}

async function getSummary(userId, cardId, { dateRange = '', dateFrom = '', dateTo = '' } = {}) {
  const cardIds = await getOwnedCardIds(userId, cardId)
  if (cardIds.length === 0) {
    return {
      totalViews: 0, totalLeads: 0, totalButtonClicks: 0, totalQrScans: 0,
      conversionRate: 0, lastActivity: null, topPerformingAction: null,
      buttonClicks: Object.fromEntries(BUTTON_TYPES.map((t) => [t, 0])),
    }
  }

  // Each query builds its own $1 (cardIds) + date-filter params since the
  // date column name differs per table (all "created_at" here, but kept
  // per-query so a future table with a different column stays easy to add).
  function withDateFilter(baseSql, column = 'created_at') {
    const params = [cardIds]
    const conditions = []
    applyDateFilter(conditions, params, dateRange, dateFrom, dateTo, column)
    const whereExtra = conditions.length ? ` AND ${conditions.join(' AND ')}` : ''
    return { sql: baseSql.replace('__EXTRA__', whereExtra), params }
  }

  const viewsQ = withDateFilter('SELECT COUNT(*)::int AS count FROM card_views WHERE card_id = ANY($1::uuid[])__EXTRA__')
  const leadsQ = withDateFilter('SELECT COUNT(*)::int AS count FROM leads WHERE card_id = ANY($1::uuid[])__EXTRA__')
  const clicksQ = withDateFilter('SELECT button_type, COUNT(*)::int AS count FROM button_clicks WHERE card_id = ANY($1::uuid[])__EXTRA__ GROUP BY button_type')
  // QR scans feed the same funnel (scan → view → click → lead) without double
  // counting: a scan is its own event, distinct from the page view it leads to.
  const qrScansQ = withDateFilter(
    `SELECT COUNT(*)::int AS count FROM qr_scans s
     JOIN qr_codes qr ON qr.id = s.qr_id
     WHERE qr.card_id = ANY($1::uuid[])__EXTRA__`,
    's.created_at'
  )

  const [viewsRes, leadsRes, clicksRes, lastActivityRes, qrScansRes] = await Promise.all([
    pool.query(viewsQ.sql, viewsQ.params),
    pool.query(leadsQ.sql, leadsQ.params),
    pool.query(clicksQ.sql, clicksQ.params),
    pool.query('SELECT MAX(created_at) AS last_activity FROM card_events WHERE card_id = ANY($1::uuid[])', [cardIds]),
    pool.query(qrScansQ.sql, qrScansQ.params),
  ])

  const totalViews = viewsRes.rows[0].count
  const totalLeads = leadsRes.rows[0].count
  const totalQrScans = qrScansRes.rows[0].count
  const buttonClicks = Object.fromEntries(BUTTON_TYPES.map((t) => [t, 0]))
  let totalButtonClicks = 0
  let topCount = 0
  let topPerformingAction = null

  for (const row of clicksRes.rows) {
    buttonClicks[row.button_type] = row.count
    totalButtonClicks += row.count
    if (row.count > topCount) { topCount = row.count; topPerformingAction = row.button_type }
  }

  const conversionRate = totalViews > 0 ? Number(((totalLeads / totalViews) * 100).toFixed(1)) : 0

  return {
    totalViews, totalLeads, totalButtonClicks, totalQrScans, conversionRate,
    lastActivity: lastActivityRes.rows[0].last_activity,
    topPerformingAction, buttonClicks,
  }
}

async function getLeads(userId, cardId, { search = '', page = 1, limit = 10, dateRange = '', dateFrom = '', dateTo = '', sortBy = 'newest' } = {}) {
  const cardIds = await getOwnedCardIds(userId, cardId)
  if (cardIds.length === 0) return { leads: [], total: 0 }

  const params = [cardIds]
  const conditions = ['card_id = ANY($1::uuid[])']

  if (search) {
    params.push(`%${search}%`)
    const i = params.length
    conditions.push(`(visitor_name ILIKE $${i} OR business_name ILIKE $${i} OR email ILIKE $${i} OR phone ILIKE $${i})`)
  }

  if (dateRange) applyDateFilter(conditions, params, dateRange, dateFrom, dateTo)

  const where = 'WHERE ' + conditions.join(' AND ')

  const sortMap = {
    newest: 'created_at DESC',
    oldest: 'created_at ASC',
    nameAsc: 'visitor_name ASC',
    nameDesc: 'visitor_name DESC',
  }
  const orderBy = sortMap[sortBy] || 'created_at DESC'

  const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM leads ${where}`, params)
  const offset = (page - 1) * limit
  params.push(limit, offset)
  const dataRes = await pool.query(
    `SELECT id, visitor_name, business_name, email, phone, created_at FROM leads ${where} ORDER BY ${orderBy} LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  return { leads: dataRes.rows, total: countRes.rows[0].total }
}

async function getActivity(userId, cardId, { search = '', dateRange = '', dateFrom = '', dateTo = '', eventType = '', page = 1, limit = 20 } = {}) {
  const cardIds = await getOwnedCardIds(userId, cardId)
  if (cardIds.length === 0) return { events: [], total: 0 }

  const params = [cardIds]
  const conditions = ['card_id = ANY($1::uuid[])']

  if (eventType === 'views') {
    conditions.push("event_type = 'view'")
  } else if (eventType === 'clicks') {
    conditions.push("event_type = 'button_click'")
  } else if (eventType === 'leads') {
    conditions.push("event_type = 'lead_created'")
  } else if (eventType === 'qr_scans') {
    conditions.push("event_type = 'qr_scan'")
  }

  if (search) {
    params.push(`%${search}%`)
    const i = params.length
    conditions.push(`(event_type ILIKE $${i} OR metadata::text ILIKE $${i})`)
  }

  if (dateRange) applyDateFilter(conditions, params, dateRange, dateFrom, dateTo)

  const where = 'WHERE ' + conditions.join(' AND ')

  const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM card_events ${where}`, params)
  const offset = (page - 1) * limit
  params.push(limit, offset)
  const dataRes = await pool.query(
    `SELECT event_type, metadata, created_at FROM card_events ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  return { events: dataRes.rows, total: countRes.rows[0].total }
}

module.exports = {
  trackView, trackButtonClick, createLead, getSummary, getLeads, getActivity, BUTTON_TYPES,
}
