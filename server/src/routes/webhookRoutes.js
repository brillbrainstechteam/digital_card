const { Router } = require('express')
const subscriptionService = require('../services/subscriptionService')

const router = Router()

const SUBSCRIPTION_EVENTS = {
  'subscription.activated': subscriptionService.onSubscriptionActivated,
  'subscription.renewed': subscriptionService.onSubscriptionRenewed,
  'subscription.cancelled': subscriptionService.onSubscriptionCancelled,
  'subscription.expired': subscriptionService.onSubscriptionExpired,
  'payment.failed': subscriptionService.onPaymentFailed,
}

// POST /api/webhooks/subscription
// Receives events from Stripe / Razorpay (or any payment provider).
// In production: validate the provider's signature before processing.
router.post('/subscription', async (req, res, next) => {
  try {
    const { event, userId } = req.body

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
