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

async function updateSlug(req, res, next) {
  try {
    const qr = await qrService.updateQrSlug(req.user.id, req.params.qrId, req.body.slug)
    res.json({ success: true, message: 'QR link updated', data: { qr } })
  } catch (err) { next(err) }
}

async function updateSettings(req, res, next) {
  try {
    const qr = await qrService.updateQrSettings(req.user.id, req.params.qrId, req.body.settings || {})
    res.json({ success: true, message: 'QR code updated', data: { qr } })
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

// Public: serves the VCard (.vcf) directly with correct MIME type so iOS
// opens it straight in Contacts instead of triggering a download prompt.
async function serveVcard(req, res, next) {
  try {
    const qr = await qrService.getQrBySlugPublic(req.params.slug)
    const destinationType = qr.settings?.destinationType
    if (destinationType !== 'saveContact') {
      return res.status(400).json({ success: false, message: 'Not a contact QR code' })
    }
    // resolveScan gates on `purchased`; this endpoint did not, so an unpaid
    // contact QR still handed out its vCard to anyone who hit the URL.
    if (!qr.settings?.purchased) {
      return res.status(402).json({ success: false, message: 'This QR code is not active yet' })
    }
    const fields = qr.settings?.destinationFields || {}
    const vcfContent = qrService.buildDestinationValue('saveContact', fields)
    const name = fields.fullName || fields.companyName || 'contact'
    const safeName = name.replace(/[^a-z0-9_\- ]/gi, '').trim() || 'contact'
    res.set({
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}.vcf"`,
      'Cache-Control': 'no-store',
    })
    res.send(vcfContent)
  } catch (err) { next(err) }
}

// Public: scanning the printed/displayed QR hits this endpoint first so the
// scan is recorded, then the frontend redirect page sends the visitor on to
// the real destination (the Digital Card's public URL).
async function resolveScan(req, res, next) {
  try {
    const qr = await qrService.getQrBySlugPublic(req.params.slug)
    // Fire-and-forget: scan recording must never block the redirect response.
    qrService.recordScan(qr, req).catch((err) => console.error('[QR recordScan]', err.message))

    // An unpurchased QR still has a slug (it was already printed/downloaded
    // as a preview), but must not resolve to its real destination — this is
    // the one place that "not activated yet" message belongs: someone who
    // scans the physical code before checkout, not the owner in the editor.
    if (!qr.settings?.purchased) {
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      })
      return res.json({ success: true, data: { notPurchased: true } })
    }

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

module.exports = { getCardQr, listQrs, upsertCardQr, createStandaloneQr, updateSlug, updateSettings, updateDestination, updateLifecycle, deleteQr, deleteCardQr, getAnalytics, getCardAnalytics, getOverallAnalytics, resolveScan, serveVcard }
