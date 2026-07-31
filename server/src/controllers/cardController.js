const cardService = require('../services/cardService')

async function createCard(req, res, next) {
  try {
    const card = await cardService.createCard(req.user.id, { title: req.body.title, card_data: req.body.card_data })
    res.status(201).json({
      success: true,
      message: 'Card created successfully',
      data: { card },
    })
  } catch (err) {
    next(err)
  }
}

async function getCards(req, res, next) {
  try {
    const cards = await cardService.getCardsByUser(req.user.id)
    res.json({
      success: true,
      data: { cards },
    })
  } catch (err) {
    next(err)
  }
}

async function getCard(req, res, next) {
  try {
    const card = await cardService.getCardById(req.params.id, req.user.id)
    res.json({
      success: true,
      data: { card },
    })
  } catch (err) {
    next(err)
  }
}

async function updateCard(req, res, next) {
  try {
    const { title, logo_url, card_data, status, slug } = req.body
    const card = await cardService.updateCard(req.params.id, req.user.id, { title, logo_url, card_data, status, slug })
    res.json({
      success: true,
      message: 'Card updated successfully',
      data: { card },
    })
  } catch (err) {
    next(err)
  }
}

async function deleteCard(req, res, next) {
  try {
    const result = await cardService.deleteCard(req.params.id, req.user.id)
    res.json({
      success: true,
      message: result.message,
      data: { action: result.action },
    })
  } catch (err) {
    next(err)
  }
}

async function unarchiveCard(req, res, next) {
  try {
    const card = await cardService.unarchiveCard(req.params.id, req.user.id)
    res.json({ success: true, message: 'Card restored to draft', data: { card } })
  } catch (err) {
    next(err)
  }
}

async function cancelSubscription(req, res, next) {
  try {
    const card = await cardService.cancelSubscription(req.params.id, req.user.id)
    res.json({ success: true, message: 'Subscription cancelled — card will work until expiry date', data: { card } })
  } catch (err) {
    next(err)
  }
}

async function resubscribe(req, res, next) {
  try {
    const card = await cardService.resubscribe(req.params.id, req.user.id)
    res.json({ success: true, message: 'Re-subscribed — card is live again for 30 days', data: { card } })
  } catch (err) {
    next(err)
  }
}

module.exports = { createCard, getCards, getCard, updateCard, deleteCard, unarchiveCard, cancelSubscription, resubscribe }
