const { Router } = require('express')
const { body } = require('express-validator')
const { validate } = require('../middleware/validate')
const { authenticate } = require('../middleware/auth')
const cardController = require('../controllers/cardController')

const router = Router()

router.get('/', authenticate, cardController.getCards)
router.get('/:id', authenticate, cardController.getCard)

router.post(
  '/',
  authenticate,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('card_data').optional().isObject().withMessage('card_data must be a JSON object'),
  ],
  validate,
  cardController.createCard
)

router.put(
  '/:id',
  authenticate,
  [
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('card_data').optional().isObject().withMessage('card_data must be a JSON object'),
    body('status').optional().isIn(['draft', 'suspended']).withMessage('Invalid status'),
    body('slug').optional().trim().isLength({ min: 3, max: 30 }).withMessage('Link must be 3-30 characters'),
  ],
  validate,
  cardController.updateCard
)

router.delete('/:id', authenticate, cardController.deleteCard)
router.patch('/:id/unarchive', authenticate, cardController.unarchiveCard)
router.patch('/:id/cancel-subscription', authenticate, cardController.cancelSubscription)
router.patch('/:id/resubscribe', authenticate, cardController.resubscribe)

module.exports = router
