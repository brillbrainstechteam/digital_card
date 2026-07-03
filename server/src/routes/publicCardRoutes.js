const { Router } = require('express')
const publicCardController = require('../controllers/publicCardController')
const analyticsController = require('../controllers/analyticsController')

const router = Router()

router.get('/:slug', publicCardController.getCard)
router.post('/:slug/events', analyticsController.trackEvent)
router.post('/:slug/leads', analyticsController.submitLead)

module.exports = router
