const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { pool } = require('../config/database')
const env = require('../config/env')
const AppError = require('../utils/AppError')

// Same policy enforced on regular user signup (authRoutes.js) — admin
// accounts guard more than any single user's data, so they get at least the
// same bar, not less.
function assertStrongPassword(password) {
  const value = String(password || '')
  if (value.length < 10) throw new AppError('Password must be at least 10 characters', 400)
  if (!/[a-z]/.test(value)) throw new AppError('Password must contain a lowercase letter', 400)
  if (!/[A-Z]/.test(value)) throw new AppError('Password must contain an uppercase letter', 400)
  if (!/[0-9]/.test(value)) throw new AppError('Password must contain a number', 400)
}

async function login(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const result = await pool.query('SELECT id, email, password_hash FROM admin_users WHERE email = $1', [normalizedEmail])

  // Always run a bcrypt compare, even when the email doesn't exist, so the
  // response time doesn't reveal which admin emails are registered — the
  // same timing-oracle fix already applied to regular user login.
  const admin = result.rows[0] || null
  const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.7Ku2Vd0/6ijHqM1nQvJPvL0mFO5r0Iu'
  const isMatch = await bcrypt.compare(password || '', admin ? admin.password_hash : DUMMY_HASH)

  if (!admin || !isMatch) {
    throw new AppError('Invalid admin credentials', 401)
  }

  const token = jwt.sign({ role: 'admin', id: admin.id, email: admin.email }, env.admin.secret, { expiresIn: '12h' })
  return { token, email: admin.email }
}

async function createAdmin(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail || !normalizedEmail.includes('@')) throw new AppError('Valid email is required', 400)
  assertStrongPassword(password)

  const existing = await pool.query('SELECT id FROM admin_users WHERE email = $1', [normalizedEmail])
  if (existing.rows.length > 0) throw new AppError('An admin with this email already exists', 409)

  const salt = await bcrypt.genSalt(12)
  const password_hash = await bcrypt.hash(password, salt)
  const result = await pool.query(
    'INSERT INTO admin_users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
    [normalizedEmail, password_hash]
  )
  return result.rows[0]
}

async function listAdmins() {
  const result = await pool.query('SELECT id, email, created_at FROM admin_users ORDER BY created_at ASC')
  return result.rows
}

module.exports = { login, createAdmin, listAdmins, assertStrongPassword }
