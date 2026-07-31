const { Router } = require('express')
const { authenticate } = require('../middleware/auth')
const paymentController = require('../controllers/paymentController')

const router = Router()

// Webhook needs raw body for signature verification — mount before json middleware
router.post('/webhook', (req, res, next) => {
  let data = ''
  req.setEncoding('utf8')
  req.on('data', (chunk) => { data += chunk })
  req.on('end', () => {
    req.rawBody = data
    try { req.body = JSON.parse(data) } catch { req.body = {} }
    next()
  })
}, paymentController.webhook)

router.post('/create-order', authenticate, paymentController.createOrder)
router.post('/verify', authenticate, paymentController.verifyPayment)

module.exports = router
