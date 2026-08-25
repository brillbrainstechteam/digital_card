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
    body('email').isEmail().withMessage('Valid email is required')
      .bail().customSanitizer((v) => String(v).trim().toLowerCase()),
    body('password')
      .isLength({ min: 10 }).withMessage('Password must be at least 10 characters')
      .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain a number'),
    body('phone').optional({ values: 'falsy' }).trim(),
  ],
  validate,
  authController.signup
)

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required')
      .bail().customSanitizer((v) => String(v).trim().toLowerCase()),
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
    body('newPassword')
      .isLength({ min: 10 }).withMessage('New password must be at least 10 characters')
      .matches(/[a-z]/).withMessage('New password must contain a lowercase letter')
      .matches(/[A-Z]/).withMessage('New password must contain an uppercase letter')
      .matches(/[0-9]/).withMessage('New password must contain a number'),
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
    body('password').notEmpty().withMessage('Password confirmation is required to delete your account'),
  ],
  validate,
  authController.deleteAccount
)

module.exports = router
