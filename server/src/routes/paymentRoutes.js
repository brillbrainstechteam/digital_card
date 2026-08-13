const { Router } = require('express')
const { authenticate } = require('../middleware/auth')
const paymentController = require('../controllers/paymentController')

const router = Router()

// The raw body is supplied by the express.raw() mount in app.js. The previous
// hand-rolled stream reader ran *after* express.json() had already consumed
// the request, so 'end' never fired and every webhook call hung open forever
// (an unauthenticated way to exhaust connections).
router.post('/webhook', (req, res, next) => {
  req.rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : ''
  try { req.body = JSON.parse(req.rawBody) } catch { req.body = {} }
  next()
}, paymentController.webhook)

router.post('/create-order', authenticate, paymentController.createOrder)
router.post('/verify', authenticate, paymentController.verifyPayment)

module.exports = router
