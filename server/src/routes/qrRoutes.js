const { Router } = require('express')
const { authenticate } = require('../middleware/auth')
const qrController = require('../controllers/qrController')

const router = Router()

router.get('/', authenticate, qrController.listQrs)
router.post('/', authenticate, qrController.createStandaloneQr)
router.patch('/:qrId/activate', authenticate, qrController.activatePurchase)
router.patch('/:qrId/slug', authenticate, qrController.updateSlug)
router.patch('/:qrId/settings', authenticate, qrController.updateSettings)
router.patch('/:qrId/destination', authenticate, qrController.updateDestination)
router.patch('/:qrId/lifecycle', authenticate, qrController.updateLifecycle)
router.delete('/:qrId', authenticate, qrController.deleteQr)
router.get('/card/:cardId', authenticate, qrController.getCardQr)
router.put('/card/:cardId', authenticate, qrController.upsertCardQr)
router.delete('/card/:cardId', authenticate, qrController.deleteCardQr)
router.get('/card/:cardId/analytics', authenticate, qrController.getCardAnalytics)

router.get('/analytics/overview', authenticate, qrController.getOverallAnalytics)
router.get('/:qrId/analytics', authenticate, qrController.getAnalytics)

module.exports = router
