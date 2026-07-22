const { Router } = require('express')
const qrController = require('../controllers/qrController')

const router = Router()

router.get('/:slug', qrController.resolveScan)

module.exports = router
