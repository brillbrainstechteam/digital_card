const analyticsService = require('../services/analyticsService')

async function trackView(req, res, next) {
  try {
    const result = await analyticsService.trackView(req.params.slug)
    res.status(201).json({ success: true, data: result })
  } catch (err) { next(err) }
}

async function trackButtonClick(req, res, next) {
  try {
    const { button } = req.body
    const result = await analyticsService.trackButtonClick(req.params.slug, button)
    res.status(201).json({ success: true, data: result })
  } catch (err) { next(err) }
}

async function submitLead(req, res, next) {
  try {
    const lead = await analyticsService.createLead(req.params.slug, req.body)
    res.status(201).json({ success: true, message: 'Contact saved', data: { lead } })
  } catch (err) { next(err) }
}

async function getSummary(req, res, next) {
  try {
    const summary = await analyticsService.getSummary(req.user.id, req.params.cardId)
    res.json({ success: true, data: summary })
  } catch (err) { next(err) }
}

async function getLeads(req, res, next) {
  try {
    const { search = '', page = 1, limit = 10, dateRange = '', dateFrom = '', dateTo = '', sortBy = 'newest' } = req.query
    const result = await analyticsService.getLeads(req.user.id, req.params.cardId, {
      search,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      dateRange,
      dateFrom,
      dateTo,
      sortBy,
    })
    res.json({ success: true, data: result })
  } catch (err) { next(err) }
}

async function getActivity(req, res, next) {
  try {
    const { search = '', page = 1, limit = 20, dateRange = '', dateFrom = '', dateTo = '', eventType = '' } = req.query
    const result = await analyticsService.getActivity(req.user.id, req.params.cardId, {
      search,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      dateRange,
      dateFrom,
      dateTo,
      eventType,
    })
    res.json({ success: true, data: result })
  } catch (err) { next(err) }
}

module.exports = { trackView, trackButtonClick, submitLead, getSummary, getLeads, getActivity }