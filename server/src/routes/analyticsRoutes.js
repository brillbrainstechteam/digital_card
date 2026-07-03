const { Router } = require('express')
const { authenticate } = require('../middleware/auth')
const analyticsController = require('../controllers/analyticsController')

const router = Router()

router.get('/summary', authenticate, analyticsController.getSummary)
router.get('/leads', authenticate, analyticsController.getLeads)

module.exports = router
