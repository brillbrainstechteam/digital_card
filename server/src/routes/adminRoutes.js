const { Router } = require('express')
const { authenticateAdmin } = require('../middleware/adminAuth')
const ctrl = require('../controllers/adminController')

const router = Router()

router.post('/login', ctrl.login)

router.use(authenticateAdmin)
router.get('/stats', ctrl.getStats)
router.get('/users', ctrl.getUsers)
router.get('/cards', ctrl.getCards)
router.get('/qrcodes', ctrl.getQrCodes)
router.get('/activity', ctrl.getActivity)
router.patch('/cards/:cardId/status', ctrl.updateCardStatus)
router.delete('/cards/:cardId', ctrl.deleteCard)
router.delete('/users/:userId', ctrl.deleteUser)
router.post('/users/:userId/reset-password', ctrl.resetUserPassword)
router.patch('/qrcodes/:qrId/lifecycle', ctrl.updateQrLifecycle)
router.get('/subscriptions', ctrl.getSubscriptions)

module.exports = router
