const { Router } = require('express')
const { body } = require('express-validator')
const { validate } = require('../middleware/validate')
const { authenticate } = require('../middleware/auth')
const authController = require('../controllers/authController')

const router = Router()

router.post(
  '/signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('business_name').trim().notEmpty().withMessage('Business name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('phone').optional({ values: 'falsy' }).trim(),
  ],
  validate,
  authController.signup
)

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
)

router.get('/me', authenticate, authController.getMe)

module.exports = router
