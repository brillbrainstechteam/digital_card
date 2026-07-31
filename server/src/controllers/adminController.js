const jwt = require('jsonwebtoken')
const env = require('../config/env')
const AppError = require('../utils/AppError')
const adminService = require('../services/adminService')

async function login(req, res, next) {
  try {
    const { email, password } = req.body
    if (email !== env.admin.email || password !== env.admin.password) {
      return next(new AppError('Invalid admin credentials', 401))
    }
    const token = jwt.sign({ role: 'admin', email }, env.admin.secret, { expiresIn: '12h' })
    res.json({ token })
  } catch (err) {
    next(err)
  }
}

async function getStats(req, res, next) {
  try {
    const stats = await adminService.getStats()
    res.json(stats)
  } catch (err) {
    next(err)
  }
}

async function getUsers(req, res, next) {
  try {
    const users = await adminService.getAllUsers()
    res.json(users)
  } catch (err) {
    next(err)
  }
}

async function getCards(req, res, next) {
  try {
    const cards = await adminService.getAllCards()
    res.json(cards)
  } catch (err) {
    next(err)
  }
}

async function getQrCodes(req, res, next) {
  try {
    const qrs = await adminService.getAllQrCodes()
    res.json(qrs)
  } catch (err) {
    next(err)
  }
}

async function updateCardStatus(req, res, next) {
  try {
    const { cardId } = req.params
    const { status } = req.body
    const allowed = ['draft', 'published', 'suspended', 'archived']
    if (!allowed.includes(status)) return next(new AppError('Invalid status', 400))
    const card = await adminService.adminUpdateCardStatus(cardId, status)
    res.json(card)
  } catch (err) {
    next(err)
  }
}

async function deleteCard(req, res, next) {
  try {
    await adminService.adminDeleteCard(req.params.cardId)
    res.json({ message: 'Card deleted' })
  } catch (err) {
    next(err)
  }
}

async function deleteUser(req, res, next) {
  try {
    await adminService.adminDeleteUser(req.params.userId)
    res.json({ message: 'User deleted' })
  } catch (err) {
    next(err)
  }
}

async function getActivity(req, res, next) {
  try {
    const activity = await adminService.getRecentActivity()
    res.json(activity)
  } catch (err) {
    next(err)
  }
}

async function updateQrLifecycle(req, res, next) {
  try {
    const { lifecycleStatus } = req.body
    if (!['active', 'archived'].includes(lifecycleStatus)) return next(new AppError('Invalid lifecycle status', 400))
    const qr = await adminService.adminUpdateQrLifecycle(req.params.qrId, lifecycleStatus)
    res.json(qr)
  } catch (err) {
    next(err)
  }
}

async function getSubscriptions(req, res, next) {
  try {
    const [stats, list] = await Promise.all([adminService.getSubscriptionStats(), adminService.getAllSubscriptions()])
    res.json({ stats, list })
  } catch (err) {
    next(err)
  }
}

module.exports = { login, getStats, getUsers, getCards, getQrCodes, updateCardStatus, updateQrLifecycle, deleteCard, deleteUser, getActivity, getSubscriptions }
