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
  [body('title').trim().notEmpty().withMessage('Title is required')],
  validate,
  cardController.createCard
)

router.put(
  '/:id',
  authenticate,
  [
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('card_data').optional().isObject().withMessage('card_data must be a JSON object'),
    body('status').optional().isIn(['draft', 'published']).withMessage('Status must be "draft" or "published"'),
  ],
  validate,
  cardController.updateCard
)

router.delete('/:id', authenticate, cardController.deleteCard)

module.exports = router
