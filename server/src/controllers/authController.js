const authService = require('../services/authService')

async function signup(req, res, next) {
  try {
    const { name, business_name, email, phone, password } = req.body
    const result = await authService.signup({ name, business_name, email, phone, password })
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body
    const result = await authService.login({ email, password })
    res.json({
      success: true,
      message: 'Login successful',
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getUserById(req.user.id)
    res.json({
      success: true,
      data: { user },
    })
  } catch (err) {
    next(err)
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body
    await authService.changePassword(req.user.id, { currentPassword, newPassword })
    res.json({ success: true, message: 'Password updated successfully' })
  } catch (err) {
    next(err)
  }
}

async function updateProfile(req, res, next) {
  try {
    const { name, business_name, phone } = req.body
    const user = await authService.updateProfile(req.user.id, { name, business_name, phone })
    res.json({ success: true, message: 'Profile updated', data: { user } })
  } catch (err) {
    next(err)
  }
}

async function deleteAccount(req, res, next) {
  try {
    await authService.deleteAccount(req.user.id, {
      reason: req.body.reason,
      details: req.body.details || '',
      password: req.body.password,
    })
    res.json({ success: true, message: 'Account deleted successfully' })
  } catch (err) {
    next(err)
  }
}

module.exports = { signup, login, getMe, changePassword, updateProfile, deleteAccount }
