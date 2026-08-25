const Razorpay = require('razorpay')
const crypto = require('crypto')
const { pool } = require('../config/database')
const env = require('../config/env')
const AppError = require('../utils/AppError')

// Lazy singleton — instantiated on first use so env is fully loaded
let _razorpay = null
function getRazorpay() {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret,
    })
  }
  return _razorpay
}

// Amount is always in paise (1 INR = 100 paise)
const CARD_PRICE_PAISE = 100   // ₹1
const QR_PRICE_PAISE   = 100   // ₹1

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Only items the caller actually owns, and which are not already paid for,
// may appear on an order. Previously any id the client sent was priced and
// echoed into the order notes without a single ownership check.
async function resolveOwnedItems(userId, cardIds, qrIds) {
  const cards = [...new Set(cardIds.map(String))].filter((id) => UUID_RE.test(id))
  const qrs = [...new Set(qrIds.map(String))].filter((id) => UUID_RE.test(id))

  const ownedCards = cards.length
    ? (await pool.query(
        `SELECT id FROM cards WHERE id = ANY($1::uuid[]) AND user_id = $2 AND status <> 'published'`,
        [cards, userId]
      )).rows.map((r) => r.id)
    : []

  const ownedQrs = qrs.length
    ? (await pool.query(
        `SELECT id FROM qr_codes
         WHERE id = ANY($1::uuid[]) AND user_id = $2
           AND COALESCE(settings->>'purchased', 'false') <> 'true'`,
        [qrs, userId]
      )).rows.map((r) => r.id)
    : []

  return { cardIds: ownedCards, qrIds: ownedQrs }
}

async function createOrder(userId, requestedCardIds, requestedQrIds) {
  const { cardIds, qrIds } = await resolveOwnedItems(userId, requestedCardIds, requestedQrIds)
  if (cardIds.length === 0 && qrIds.length === 0) {
    throw new AppError('Nothing to pay for — these items are already active or not yours.', 400)
  }

  const totalPaise = (cardIds.length * CARD_PRICE_PAISE) + (qrIds.length * QR_PRICE_PAISE)

  const order = await getRazorpay().orders.create({
    amount: totalPaise,
    currency: 'INR',
    receipt: `dc_${Date.now()}`,
    notes: {
      userId: String(userId),
      cardIds: cardIds.join(','),
      qrIds: qrIds.join(','),
    },
  })

  // The authoritative record of what this order buys. Fulfilment reads from
  // here, never from the client, because the Razorpay signature covers only
  // `order_id|payment_id` — not the item list.
  await pool.query(
    `INSERT INTO payment_orders (razorpay_order_id, user_id, card_ids, qr_ids, amount_paise)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (razorpay_order_id) DO NOTHING`,
    [order.id, userId, JSON.stringify(cardIds), JSON.stringify(qrIds), totalPaise]
  )

  return order
}

function verifySignature(orderId, paymentId, signature) {
  if (!signature || typeof signature !== 'string') return false
  const expected = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  // Was `expected === signature`. The webhook path already used a
  // constant-time compare; this one leaked a byte-by-byte timing signal.
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(signature, 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/**
 * Fulfil a verified payment.
 *
 * Takes NO item list from the caller. The order row written at createOrder is
 * the only source of truth for what was bought, and consuming it is a
 * conditional UPDATE on status='created' — so replaying the same signature
 * finds nothing to claim and publishes nothing.
 */
async function fulfillOrder(orderId, paymentId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Atomic claim. If another request (or a replay) already consumed this
    // order, rowCount is 0 and we stop here.
    const claimed = await client.query(
      `UPDATE payment_orders
       SET status = 'paid', paid_at = NOW()
       WHERE razorpay_order_id = $1 AND status = 'created'
       RETURNING user_id, card_ids, qr_ids, amount_paise`,
      [orderId]
    )

    if (claimed.rowCount === 0) {
      await client.query('ROLLBACK')
      const existing = await pool.query(
        'SELECT status FROM payment_orders WHERE razorpay_order_id = $1',
        [orderId]
      )
      if (existing.rowCount === 0) throw new AppError('Unknown payment order', 400)
      return { alreadyFulfilled: true }
    }

    const { user_id: userId, card_ids: cardIds, qr_ids: qrIds, amount_paise: amount } = claimed.rows[0]

    await client.query(
      `INSERT INTO payments (user_id, razorpay_order_id, razorpay_payment_id, amount_paise, status, card_ids, qr_ids)
       VALUES ($1, $2, $3, $4, 'paid', $5, $6)
       ON CONFLICT (razorpay_payment_id) DO NOTHING`,
      [userId, orderId, paymentId, amount, JSON.stringify(cardIds), JSON.stringify(qrIds)]
    )

    if (cardIds.length > 0) {
      await client.query(
        `UPDATE cards
         SET status = 'published',
             subscription_cancelled = FALSE,
             subscription_expires_at = NOW() + INTERVAL '30 days'
         WHERE id = ANY($1::uuid[]) AND user_id = $2`,
        [cardIds, userId]
      )
    }

    if (qrIds.length > 0) {
      await client.query(
        `UPDATE qr_codes
         SET settings = jsonb_set(
               jsonb_set(settings, '{purchased}', 'true'),
               '{lifecycleStatus}', '"active"'
             )
         WHERE id = ANY($1::uuid[]) AND user_id = $2`,
        [qrIds, userId]
      )
    }

    await client.query('COMMIT')
    return { fulfilled: true, cardIds, qrIds }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

// Razorpay webhook signature verification.
// Fails CLOSED: an unset secret previously returned `true`, which let anyone
// POST a forged `payment.captured` event and publish cards / activate QR
// codes for free. No secret now means no webhook is ever trusted.
function verifyWebhookSignature(rawBody, signature) {
  if (!env.razorpay.webhookSecret) {
    console.error('SECURITY: RAZORPAY_WEBHOOK_SECRET is not configured — rejecting webhook')
    return false
  }
  if (!signature || typeof signature !== 'string') return false

  const expected = crypto
    .createHmac('sha256', env.razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex')

  const expectedBuf = Buffer.from(expected, 'utf8')
  const actualBuf = Buffer.from(signature, 'utf8')
  if (expectedBuf.length !== actualBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, actualBuf)
}

module.exports = { createOrder, verifySignature, fulfillOrder, verifyWebhookSignature }
