const { Router } = require('express')
const publicCardController = require('../controllers/publicCardController')
const analyticsController = require('../controllers/analyticsController')

const router = Router()

router.get('/:slug', publicCardController.getCard)
router.post('/:slug/view', analyticsController.trackView)
router.post('/:slug/click', analyticsController.trackButtonClick)
router.post('/:slug/leads', analyticsController.submitLead)

module.exports = router
