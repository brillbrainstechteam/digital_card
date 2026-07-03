const { pool } = require('../config/database')
const AppError = require('../utils/AppError')

const EVENT_TYPES = [
  'view',
  'click_call',
  'click_email',
  'click_whatsapp',
  'click_website',
  'click_save_contact',
  'click_social',
]

async function getCardIdBySlug(slug) {
  const result = await pool.query('SELECT id FROM cards WHERE slug = $1', [slug])
  if (result.rows.length === 0) {
    throw new AppError('Card not found', 404)
  }
  return result.rows[0].id
}

async function logEvent(slug, eventType, meta = {}) {
  if (!EVENT_TYPES.includes(eventType)) {
    throw new AppError('Invalid event type', 400)
  }
  const cardId = await getCardIdBySlug(slug)
  await pool.query(
    'INSERT INTO card_events (card_id, event_type, meta) VALUES ($1, $2, $3)',
    [cardId, eventType, JSON.stringify(meta || {})]
  )
  return { ok: true }
}

async function createLead(slug, payload) {
  const cardId = await getCardIdBySlug(slug)
  const { fullName, businessName, email, phone, company } = payload

  if (!fullName || !fullName.trim()) {
    throw new AppError('Full name is required', 400)
  }
  if (!phone || !phone.trim()) {
    throw new AppError('Phone number is required', 400)
  }

  const result = await pool.query(
    `INSERT INTO card_leads (card_id, full_name, business_name, email, phone, company)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [cardId, fullName.trim(), businessName?.trim() || null, email?.trim() || null, phone.trim(), company?.trim() || null]
  )

  await pool.query(
    'INSERT INTO card_events (card_id, event_type, meta) VALUES ($1, $2, $3)',
    [cardId, 'click_save_contact', JSON.stringify({ submitted: true })]
  )

  return result.rows[0]
}

async function getOwnedCardIds(userId, cardId) {
  if (cardId && cardId !== 'all') {
    const result = await pool.query('SELECT id FROM cards WHERE id = $1 AND user_id = $2', [cardId, userId])
    if (result.rows.length === 0) {
      throw new AppError('Card not found', 404)
    }
    return [cardId]
  }
  const result = await pool.query('SELECT id FROM cards WHERE user_id = $1', [userId])
  return result.rows.map((row) => row.id)
}

async function getSummary(userId, cardId) {
  const cardIds = await getOwnedCardIds(userId, cardId)
  if (cardIds.length === 0) {
    return {
      totals: { views: 0, contactSaves: 0, buttonClicks: 0, conversionRate: 0, qrScans: 0 },
      traffic: { views: 0, contactSaves: 0, ctr: 0, lastViewed: null },
      buttons: { call: 0, email: 0, whatsapp: 0, website: 0, saveContact: 0, socials: {} },
    }
  }

  const eventCounts = await pool.query(
    `SELECT event_type, meta->>'platform' AS platform, COUNT(*)::int AS count
     FROM card_events
     WHERE card_id = ANY($1::uuid[])
     GROUP BY event_type, meta->>'platform'`,
    [cardIds]
  )

  const lastViewedResult = await pool.query(
    `SELECT MAX(created_at) AS last_viewed FROM card_events WHERE card_id = ANY($1::uuid[]) AND event_type = 'view'`,
    [cardIds]
  )

  const leadCountResult = await pool.query(
    'SELECT COUNT(*)::int AS count FROM card_leads WHERE card_id = ANY($1::uuid[])',
    [cardIds]
  )

  let views = 0
  let call = 0
  let email = 0
  let whatsapp = 0
  let website = 0
  const socials = {}

  for (const row of eventCounts.rows) {
    if (row.event_type === 'view') views += row.count
    else if (row.event_type === 'click_call') call += row.count
    else if (row.event_type === 'click_email') email += row.count
    else if (row.event_type === 'click_whatsapp') whatsapp += row.count
    else if (row.event_type === 'click_website') website += row.count
    else if (row.event_type === 'click_social') {
      const platform = row.platform || 'unknown'
      socials[platform] = (socials[platform] || 0) + row.count
    }
  }

  const contactSaves = leadCountResult.rows[0].count
  const socialClicks = Object.values(socials).reduce((sum, n) => sum + n, 0)
  const buttonClicks = call + email + whatsapp + website + contactSaves + socialClicks
  const conversionRate = views > 0 ? Number(((contactSaves / views) * 100).toFixed(1)) : 0
  const ctr = views > 0 ? Number(((buttonClicks / views) * 100).toFixed(1)) : 0

  return {
    totals: { views, contactSaves, buttonClicks, conversionRate, qrScans: 0 },
    traffic: { views, contactSaves, ctr, lastViewed: lastViewedResult.rows[0].last_viewed },
    buttons: { call, email, whatsapp, website, saveContact: contactSaves, socials },
  }
}

async function getLeads(userId, cardId, { search = '', limit = 200 } = {}) {
  const cardIds = await getOwnedCardIds(userId, cardId)
  if (cardIds.length === 0) return []

  const params = [cardIds]
  let query = `
    SELECT id, full_name, business_name, email, phone, company, created_at
    FROM card_leads
    WHERE card_id = ANY($1::uuid[])
  `
  if (search) {
    params.push(`%${search}%`)
    query += ` AND (full_name ILIKE $${params.length} OR business_name ILIKE $${params.length} OR email ILIKE $${params.length} OR company ILIKE $${params.length})`
  }
  params.push(limit)
  query += ` ORDER BY created_at DESC LIMIT $${params.length}`

  const result = await pool.query(query, params)
  return result.rows
}

module.exports = { logEvent, createLead, getSummary, getLeads }
