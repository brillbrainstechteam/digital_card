const Razorpay = require('razorpay')
const crypto = require('crypto')
const { pool } = require('../config/database')
const env = require('../config/env')

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

async function createOrder(userId, cardIds, qrIds) {
  const numCards = cardIds.length
  const numQrs   = qrIds.length
  const totalPaise = (numCards * CARD_PRICE_PAISE) + (numQrs * QR_PRICE_PAISE)

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

  return order
}

function verifySignature(orderId, paymentId, signature) {
  const body = `${orderId}|${paymentId}`
  const expected = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(body)
    .digest('hex')
  return expected === signature
}

async function fulfillOrder(userId, orderId, paymentId, cardIds, qrIds) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Record payment
    await client.query(
      `INSERT INTO payments (user_id, razorpay_order_id, razorpay_payment_id, amount_paise, status, card_ids, qr_ids)
       VALUES ($1, $2, $3, $4, 'paid', $5, $6)
       ON CONFLICT (razorpay_payment_id) DO NOTHING`,
      [
        userId,
        orderId,
        paymentId,
        (cardIds.length * CARD_PRICE_PAISE) + (qrIds.length * QR_PRICE_PAISE),
        JSON.stringify(cardIds),
        JSON.stringify(qrIds),
      ]
    )

    // Publish all cards
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

    // Activate all QR codes
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
  } catch (err) {
    await client.query('ROLLBACK')
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
