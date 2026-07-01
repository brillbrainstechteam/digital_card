const cardService = require('../services/cardService')

async function createCard(req, res, next) {
  try {
    const card = await cardService.createCard(req.user.id, { title: req.body.title })
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
    const { title, logo_url, card_data, status } = req.body
    const card = await cardService.updateCard(req.params.id, req.user.id, { title, logo_url, card_data, status })
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

module.exports = { createCard, getCards, getCard, updateCard, deleteCard }
