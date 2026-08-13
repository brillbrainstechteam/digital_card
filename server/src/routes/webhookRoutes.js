const crypto = require('crypto')
const { Router } = require('express')
const env = require('../config/env')
const subscriptionService = require('../services/subscriptionService')

const router = Router()

const SUBSCRIPTION_EVENTS = {
  'subscription.activated': subscriptionService.onSubscriptionActivated,
  'subscription.renewed': subscriptionService.onSubscriptionRenewed,
  'subscription.cancelled': subscriptionService.onSubscriptionCancelled,
  'subscription.expired': subscriptionService.onSubscriptionExpired,
  'payment.failed': subscriptionService.onPaymentFailed,
}

// This endpoint previously took `{ event, userId }` from an unauthenticated
// POST body, so anyone could send `subscription.cancelled` with someone
// else's user id and archive every published card on that account.
// It now requires a shared-secret signature over the raw body and fails
// closed when no secret is configured.
function verifySignature(rawBody, signature) {
  if (!env.razorpay.webhookSecret) {
    console.error('SECURITY: RAZORPAY_WEBHOOK_SECRET is not configured — rejecting subscription webhook')
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

// POST /api/webhooks/subscription
// Body is delivered as a raw Buffer (see the raw-body mount in app.js) so the
// signature is checked against the exact bytes that were signed.
router.post('/subscription', async (req, res, next) => {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : ''
    const signature = req.get('x-razorpay-signature') || req.get('x-webhook-signature')

    if (!verifySignature(rawBody, signature)) {
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' })
    }

    let payload
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid JSON body' })
    }

    const { event, userId } = payload
    if (!event || !userId) {
      return res.status(400).json({ success: false, message: 'event and userId are required' })
    }

    const handler = SUBSCRIPTION_EVENTS[event]
    if (!handler) {
      return res.status(400).json({ success: false, message: `Unknown event: ${event}` })
    }

    await handler(userId)
    res.json({ success: true, message: `Processed: ${event}` })
  } catch (err) {
    next(err)
  }
})

module.exports = router
