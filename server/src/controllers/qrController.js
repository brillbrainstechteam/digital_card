const qrService = require('../services/qrService')

async function getCardQr(req, res, next) {
  try {
    const qr = await qrService.getCardQr(req.user.id, req.params.cardId)
    res.json({ success: true, data: { qr } })
  } catch (err) { next(err) }
}

async function listQrs(req, res, next) {
  try {
    const qrs = await qrService.listUserQrs(req.user.id)
    res.json({ success: true, data: { qrs } })
  } catch (err) { next(err) }
}

async function upsertCardQr(req, res, next) {
  try {
    const qr = await qrService.upsertCardQr(req.user.id, req.params.cardId, req.body.settings || {})
    res.json({ success: true, message: 'QR code saved', data: { qr } })
  } catch (err) { next(err) }
}

async function createStandaloneQr(req, res, next) {
  try {
    const qr = await qrService.createStandaloneQr(req.user.id, req.body.settings || {})
    res.status(201).json({ success: true, message: 'QR code created', data: { qr } })
  } catch (err) { next(err) }
}

async function activatePurchase(req, res, next) {
  try {
    const qr = await qrService.activateQrPurchase(req.user.id, req.params.qrId)
    res.json({ success: true, message: 'QR code activated', data: { qr } })
  } catch (err) { next(err) }
}

async function updateDestination(req, res, next) {
  try {
    const qr = await qrService.updateQrDestination(req.user.id, req.params.qrId, req.body.destinationType, req.body.destinationFields || {})
    res.json({ success: true, message: 'QR destination updated', data: { qr } })
  } catch (err) { next(err) }
}

async function updateLifecycle(req, res, next) {
  try {
    const qr = await qrService.updateQrLifecycle(req.user.id, req.params.qrId, req.body.lifecycleStatus)
    res.json({ success: true, message: `QR code ${req.body.lifecycleStatus === 'archived' ? 'archived' : 'restored'}`, data: { qr } })
  } catch (err) { next(err) }
}

async function deleteQr(req, res, next) {
  try {
    await qrService.deleteQr(req.user.id, req.params.qrId)
    res.json({ success: true, message: 'QR code deleted' })
  } catch (err) { next(err) }
}

async function deleteCardQr(req, res, next) {
  try {
    await qrService.deleteCardQr(req.user.id, req.params.cardId)
    res.json({ success: true, message: 'QR code removed' })
  } catch (err) { next(err) }
}

async function getAnalytics(req, res, next) {
  try {
    const { cardId } = req.query
    const summary = await qrService.getQrAnalytics(req.user.id, { qrId: req.params.qrId, cardId })
    res.json({ success: true, data: summary })
  } catch (err) { next(err) }
}

async function getCardAnalytics(req, res, next) {
  try {
    const summary = await qrService.getQrAnalytics(req.user.id, { cardId: req.params.cardId })
    res.json({ success: true, data: summary })
  } catch (err) { next(err) }
}

async function getOverallAnalytics(req, res, next) {
  try {
    const summary = await qrService.getQrAnalytics(req.user.id, {
      activeCardsOnly: req.query.activeCardsOnly === 'true',
    })
    res.json({ success: true, data: summary })
  } catch (err) { next(err) }
}

// Public: scanning the printed/displayed QR hits this endpoint first so the
// scan is recorded, then the frontend redirect page sends the visitor on to
// the real destination (the Digital Card's public URL).
async function resolveScan(req, res, next) {
  try {
    const qr = await qrService.getQrBySlugPublic(req.params.slug)
    await qrService.recordScan(qr, req)
    const destinationType = qr.settings?.destinationType || (qr.card_id ? 'digitalCard' : 'website')
    const savedDestinationFields = qr.settings?.destinationFields || {}
    // Older card QR records stored a temporary browser preview URL. Keep
    // those records pointing at their permanent card slug until the owner
    // explicitly chooses a new destination in QR management.
    const destinationFields = qr.card_id
      && destinationType === 'digitalCard'
      && qr.settings?.destinationOverride !== true
      ? {}
      : savedDestinationFields
    // A dynamic QR must resolve against the latest saved destination on
    // every scan. Prevent browsers and intermediary caches from retaining
    // an older destination response for this stable slug.
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'Surrogate-Control': 'no-store',
    })
    res.json({
      success: true,
      data: {
        cardSlug: qr.card_id ? qr.card_slug : null,
        destinationType,
        destinationFields,
        destination: qrService.buildDestinationValue(
          destinationType,
          destinationFields,
          qr.card_id ? qr.card_slug : null
        ),
      },
    })
  } catch (err) { next(err) }
}

module.exports = { getCardQr, listQrs, upsertCardQr, createStandaloneQr, activatePurchase, updateDestination, updateLifecycle, deleteQr, deleteCardQr, getAnalytics, getCardAnalytics, getOverallAnalytics, resolveScan }
