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

module.exports = { signup, login, getMe }
