const crypto = require('crypto')
const env = require('../config/env')
const AppError = require('../utils/AppError')

/**
 * Issue a short-lived Cloudinary upload signature.
 *
 * Uploads were unsigned: the cloud name and upload preset necessarily ship in
 * the client bundle, so anyone who read them (or the public repo) could POST
 * arbitrary files into the account — unbounded storage and bandwidth cost, and
 * the account hosting whatever they liked.
 *
 * Signing moves authority server-side: only a logged-in user can obtain a
 * signature, and the signature pins the folder and timestamp, so it cannot be
 * replayed into a different folder or reused indefinitely.
 */
async function signUpload(req, res, next) {
  try {
    if (!env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
      return next(new AppError('Image uploads are not configured on this server', 503))
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const folder = 'digital-cards'

    // Cloudinary signs the sorted, &-joined set of params being sent.
    const toSign = `folder=${folder}&timestamp=${timestamp}`
    const signature = crypto
      .createHash('sha256')
      .update(`${toSign}${env.cloudinary.apiSecret}`)
      .digest('hex')

    res.json({
      success: true,
      data: {
        signature,
        timestamp,
        folder,
        apiKey: env.cloudinary.apiKey,
        cloudName: env.cloudinary.cloudName,
      },
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { signUpload }
