const paymentService = require('../services/paymentService')
const env = require('../config/env')

async function createOrder(req, res, next) {
  try {
    const userId = req.user.id
    const { cardIds = [], qrIds = [] } = req.body

    if (cardIds.length === 0 && qrIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No items to pay for' })
    }

    const order = await paymentService.createOrder(userId, cardIds, qrIds)

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: env.razorpay.keyId,
      },
    })
  } catch (err) {
    next(err)
  }
}

async function verifyPayment(req, res, next) {
  try {
    const userId = req.user.id
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, cardIds = [], qrIds = [] } = req.body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment fields' })
    }

    const valid = paymentService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' })
    }

    await paymentService.fulfillOrder(userId, razorpay_order_id, razorpay_payment_id, cardIds, qrIds)

    res.json({ success: true, message: 'Payment verified and products activated' })
  } catch (err) {
    next(err)
  }
}

// Razorpay webhook — called by Razorpay servers directly
async function webhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature']
    // req.rawBody is set by the raw body parser middleware on this route
    const valid = paymentService.verifyWebhookSignature(req.rawBody || JSON.stringify(req.body), signature)
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' })
    }

    const { event, payload } = req.body
    if (event === 'payment.captured') {
      const payment = payload?.payment?.entity
      if (payment?.notes) {
        const userId = parseInt(payment.notes.userId, 10)
        const cardIds = payment.notes.cardIds ? payment.notes.cardIds.split(',').map(Number).filter(Boolean) : []
        const qrIds   = payment.notes.qrIds   ? payment.notes.qrIds.split(',').map(Number).filter(Boolean)   : []
        await paymentService.fulfillOrder(userId, payment.order_id, payment.id, cardIds, qrIds)
      }
    }

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

module.exports = { createOrder, verifyPayment, webhook }
