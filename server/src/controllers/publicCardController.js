const publicCardService = require('../services/publicCardService')

async function getCard(req, res, next) {
  try {
    const card = await publicCardService.getPublishedCardBySlug(req.params.slug)
    res.json({
      success: true,
      data: { card },
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { getCard }
