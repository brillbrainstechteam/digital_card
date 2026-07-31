const jwt = require('jsonwebtoken')
const env = require('../config/env')
const AppError = require('../utils/AppError')

function authenticateAdmin(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Admin authentication required', 401))
  }

  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, env.admin.secret)
    if (decoded.role !== 'admin') throw new Error('Not admin')
    req.admin = decoded
    next()
  } catch {
    next(new AppError('Invalid or expired admin token', 401))
  }
}

module.exports = { authenticateAdmin }
