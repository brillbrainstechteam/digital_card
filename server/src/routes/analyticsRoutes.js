const { Router } = require('express')
const { authenticate } = require('../middleware/auth')
const analyticsController = require('../controllers/analyticsController')

const router = Router()

router.get('/:cardId', authenticate, analyticsController.getSummary)
router.get('/:cardId/leads', authenticate, analyticsController.getLeads)
router.get('/:cardId/activity', authenticate, analyticsController.getActivity)
router.get('/:cardId/subscribers', authenticate, analyticsController.getSubscribers)

module.exports = router
