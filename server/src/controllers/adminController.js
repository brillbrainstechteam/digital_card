const AppError = require('../utils/AppError')
const adminService = require('../services/adminService')
const adminAuthService = require('../services/adminAuthService')

async function login(req, res, next) {
  try {
    const { email, password } = req.body
    const { token } = await adminAuthService.login(email, password)
    res.json({ token })
  } catch (err) {
    next(err)
  }
}

// Any logged-in admin can create another admin account. There's no
// self-signup for this role — an admin_users row only ever comes from here
// or a direct DB insert during initial setup.
async function createAdmin(req, res, next) {
  try {
    const { email, password } = req.body
    if (!email || !password) return next(new AppError('Email and password are required', 400))
    const admin = await adminAuthService.createAdmin(email, password)
    await adminService.recordAdminAction({
      actor: req.admin?.email || 'admin',
      ip: req.ip,
      action: 'admin.create',
      targetType: 'admin_user',
      targetId: admin.id,
      detail: { email: admin.email },
    })
    res.status(201).json({ success: true, data: admin })
  } catch (err) {
    next(err)
  }
}

async function listAdmins(req, res, next) {
  try {
    res.json(await adminAuthService.listAdmins())
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

async function getAuditLog(req, res, next) {
  try {
    res.json(await adminService.getAdminAuditLog(req.query.limit))
  } catch (err) {
    next(err)
  }
}

async function getContactMessages(req, res, next) {
  try {
    res.json(await adminService.getContactMessages())
  } catch (err) {
    next(err)
  }
}

async function updateContactMessageStatus(req, res, next) {
  try {
    const result = await adminService.setContactMessageStatus(req.params.id, req.body.status)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

async function getInsights(req, res, next) {
  try {
    res.json(await adminService.getInsights())
  } catch (err) {
    next(err)
  }
}

async function getUserDetail(req, res, next) {
  try {
    res.json(await adminService.getUserDetail(req.params.userId))
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

function auditContext(req) {
  return { actor: req.admin?.email || 'admin', ip: req.ip }
}

async function updateCardStatus(req, res, next) {
  try {
    const { cardId } = req.params
    const { status } = req.body
    const allowed = ['draft', 'published', 'suspended', 'archived']
    if (!allowed.includes(status)) return next(new AppError('Invalid status', 400))
    const card = await adminService.adminUpdateCardStatus(cardId, status)
    await adminService.recordAdminAction({ ...auditContext(req), action: 'card.status', targetType: 'card', targetId: cardId, detail: { status } })
    res.json(card)
  } catch (err) {
    next(err)
  }
}

async function deleteCard(req, res, next) {
  try {
    await adminService.adminDeleteCard(req.params.cardId)
    await adminService.recordAdminAction({ ...auditContext(req), action: 'card.delete', targetType: 'card', targetId: req.params.cardId })
    res.json({ message: 'Card deleted' })
  } catch (err) {
    next(err)
  }
}

async function deleteUser(req, res, next) {
  try {
    await adminService.adminDeleteUser(req.params.userId)
    await adminService.recordAdminAction({ ...auditContext(req), action: 'user.delete', targetType: 'user', targetId: req.params.userId })
    res.json({ message: 'User deleted' })
  } catch (err) {
    next(err)
  }
}

async function resetUserPassword(req, res, next) {
  try {
    const result = await adminService.resetUserPassword(req.params.userId)
    await adminService.recordAdminAction({ ...auditContext(req), action: 'user.password_reset', targetType: 'user', targetId: req.params.userId, detail: { email: result.email } })
    res.json({ email: result.email, tempPassword: result.tempPassword })
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
    await adminService.recordAdminAction({ ...auditContext(req), action: 'qr.lifecycle', targetType: 'qr', targetId: req.params.qrId, detail: { lifecycleStatus } })
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

module.exports = { login, createAdmin, listAdmins, getAuditLog, getContactMessages, updateContactMessageStatus, getStats, getInsights, getUserDetail, getUsers, getCards, getQrCodes, updateCardStatus, updateQrLifecycle, deleteCard, deleteUser, getActivity, getSubscriptions, resetUserPassword }
