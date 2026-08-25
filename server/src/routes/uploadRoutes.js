const { Router } = require('express')
const { authenticate } = require('../middleware/auth')
const uploadController = require('../controllers/uploadController')

const router = Router()

// Authenticated only: an anonymous caller must not be able to mint upload
// credentials for our Cloudinary account.
router.post('/sign', authenticate, uploadController.signUpload)

module.exports = router
