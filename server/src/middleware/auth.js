const jwt = require('jsonwebtoken')
const env = require('../config/env')
const { pool } = require('../config/database')
const AppError = require('../utils/AppError')

/**
 * Verify the bearer token AND that it still corresponds to a live account
 * whose credentials have not changed since the token was issued.
 *
 * Previously this only checked the signature, which meant:
 *   - changing your password did not log other sessions out;
 *   - an admin "reset password" on a compromised account left the attacker's
 *     token working for the rest of its 7-day life;
 *   - a deleted user's token kept authenticating.
 *
 * The extra cost is one primary-key lookup per authenticated request.
 */
async function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401))
  }

  const token = header.slice('Bearer '.length).trim()

  let decoded
  try {
    decoded = jwt.verify(token, env.jwt.secret)
  } catch {
    return next(new AppError('Invalid or expired token', 401))
  }

  try {
    const result = await pool.query(
      'SELECT id, credentials_changed_at FROM users WHERE id = $1',
      [decoded.id]
    )
    if (result.rows.length === 0) {
      return next(new AppError('Invalid or expired token', 401))
    }

    // `iat` is in seconds; allow 1s of slack so a token minted in the same
    // second as the change isn't rejected by rounding alone.
    const changedAt = result.rows[0].credentials_changed_at
    if (changedAt && decoded.iat && decoded.iat + 1 < Math.floor(new Date(changedAt).getTime() / 1000)) {
      return next(new AppError('Session expired, please sign in again', 401))
    }

    req.user = { id: result.rows[0].id }
    return next()
  } catch (err) {
    return next(err)
  }
}

module.exports = { authenticate }
