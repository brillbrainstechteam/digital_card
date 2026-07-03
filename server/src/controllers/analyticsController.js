const analyticsService = require('../services/analyticsService')

async function trackEvent(req, res, next) {
  try {
    const { type, meta } = req.body
    const result = await analyticsService.logEvent(req.params.slug, type, meta)
    res.status(201).json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

async function submitLead(req, res, next) {
  try {
    const lead = await analyticsService.createLead(req.params.slug, req.body)
    res.status(201).json({
      success: true,
      message: 'Contact saved',
      data: { lead },
    })
  } catch (err) {
    next(err)
  }
}

async function getSummary(req, res, next) {
  try {
    const summary = await analyticsService.getSummary(req.user.id, req.query.cardId)
    res.json({ success: true, data: { summary } })
  } catch (err) {
    next(err)
  }
}

async function getLeads(req, res, next) {
  try {
    const leads = await analyticsService.getLeads(req.user.id, req.query.cardId, { search: req.query.search })
    res.json({ success: true, data: { leads } })
  } catch (err) {
    next(err)
  }
}

module.exports = { trackEvent, submitLead, getSummary, getLeads }
