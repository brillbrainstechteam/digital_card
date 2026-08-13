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

router.patch(
  '/me',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('business_name').trim().notEmpty().withMessage('Business name is required'),
    body('phone').optional({ values: 'falsy' }).trim(),
  ],
  validate,
  authController.updateProfile
)

router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validate,
  authController.changePassword
)

router.delete(
  '/me',
  authenticate,
  [
    body('reason').isIn(['not_useful', 'too_expensive', 'missing_features', 'privacy', 'temporary', 'other']).withMessage('Please select a deletion reason'),
    body('details').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('Additional feedback must be under 1000 characters'),
  ],
  validate,
  authController.deleteAccount
)

module.exports = router
