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
    // cardIds/qrIds are deliberately NOT read from the body. The Razorpay
    // signature covers only `order_id|payment_id`, so anything else the client
    // sends is unauthenticated — previously a ₹1 order could be redeemed
    // against every card and QR the user owned. fulfillOrder reads the item
    // list from the payment_orders row written when the order was created.
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment fields' })
    }

    const valid = paymentService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' })
    }

    const result = await paymentService.fulfillOrder(razorpay_order_id, razorpay_payment_id)

    res.json({
      success: true,
      message: result.alreadyFulfilled
        ? 'This payment was already processed'
        : 'Payment verified and products activated',
    })
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

    // paymentRoutes' raw-body shim has already parsed req.body from req.rawBody.
    const { event, payload } = req.body || {}

    if (event === 'payment.captured') {
      const payment = payload?.payment?.entity
      // Fulfilment is keyed on the order id alone. The old code did
      // parseInt() on notes.userId — a UUID — which yielded a truncated
      // integer and made every webhook fulfilment fail, and it trusted the
      // notes for the item list rather than our own order record.
      if (payment?.order_id) {
        await paymentService.fulfillOrder(payment.order_id, payment.id)
      }
    }

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

module.exports = { createOrder, verifyPayment, webhook }
