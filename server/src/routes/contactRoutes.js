const { Router } = require('express')
const { body } = require('express-validator')
const { validate } = require('../middleware/validate')
const contactController = require('../controllers/contactController')

const router = Router()

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters'),
  ],
  validate,
  contactController.submit
)

module.exports = router
