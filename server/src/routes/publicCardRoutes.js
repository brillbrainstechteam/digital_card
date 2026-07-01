const { Router } = require('express')
const publicCardController = require('../controllers/publicCardController')

const router = Router()

router.get('/:slug', publicCardController.getCard)

module.exports = router
