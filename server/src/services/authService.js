const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { pool } = require('../config/database')
const env = require('../config/env')
const AppError = require('../utils/AppError')

function generateToken(userId) {
  return jwt.sign({ id: userId }, env.jwt.secret, { expiresIn: env.jwt.expiresIn })
}

async function signup({ name, business_name, email, phone, password }) {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    throw new AppError('Email is already registered', 409)
  }

  const salt = await bcrypt.genSalt(12)
  const password_hash = await bcrypt.hash(password, salt)

  const result = await pool.query(
    `INSERT INTO users (name, business_name, email, phone, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, business_name, email, phone, is_verified, created_at`,
    [name, business_name, email, phone || null, password_hash]
  )

  const user = result.rows[0]
  const token = generateToken(user.id)

  return { user, token }
}

// A bcrypt hash of a value nobody can supply. Compared against when the
// email does not exist so that both branches do the same ~100ms of work —
// otherwise the response time alone reveals which emails are registered.
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.7Ku2Vd0/6ijHqM1nQvJPvL0mFO5r0Iu'

async function login({ email, password }) {
  const result = await pool.query(
    'SELECT id, name, business_name, email, phone, password_hash, is_verified, created_at FROM users WHERE email = $1',
    [email]
  )

  const user = result.rows[0] || null
  const isMatch = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH)

  if (!user || !isMatch) {
    throw new AppError('Invalid email or password', 401)
  }

  const { password_hash, ...userWithoutPassword } = user
  const token = generateToken(user.id)

  return { user: userWithoutPassword, token }
}

async function getUserById(id) {
  const result = await pool.query(
    'SELECT id, name, business_name, email, phone, is_verified, created_at, updated_at FROM users WHERE id = $1',
    [id]
  )

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404)
  }

  return result.rows[0]
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId])
  if (result.rows.length === 0) throw new AppError('User not found', 404)

  const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash)
  if (!isMatch) throw new AppError('Current password is incorrect', 401)

  const salt = await bcrypt.genSalt(12)
  const password_hash = await bcrypt.hash(newPassword, salt)
  // Bumping credentials_changed_at invalidates every JWT issued before now.
  await pool.query(
    'UPDATE users SET password_hash = $1, credentials_changed_at = NOW(), updated_at = NOW() WHERE id = $2',
    [password_hash, userId]
  )
}

async function updateProfile(userId, { name, business_name, phone }) {
  const result = await pool.query(
    `UPDATE users SET name = $1, business_name = $2, phone = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING id, name, business_name, email, phone, is_verified, created_at, updated_at`,
    [name, business_name, phone || null, userId]
  )
  if (result.rows.length === 0) throw new AppError('User not found', 404)
  return result.rows[0]
}

async function deleteAccount(userId, { reason, details, password }) {
  // Deletion is irreversible and destroys every card, QR code and lead on the
  // account. A stolen token alone must not be enough to trigger it.
  const cred = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId])
  if (cred.rows.length === 0) throw new AppError('User not found', 404)
  const passwordOk = await bcrypt.compare(password || '', cred.rows[0].password_hash)
  if (!passwordOk) throw new AppError('Password is incorrect', 401)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // The account_deletion_feedback table is created by migration 001, not
    // here — running DDL inside a request forced the app's DB role to hold
    // schema-create rights it should never need.
    const userResult = await client.query('SELECT email FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) throw new AppError('User not found', 404)
    await client.query(
      `INSERT INTO account_deletion_feedback (id, user_id, email, reason, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [crypto.randomUUID(), userId, userResult.rows[0].email, reason, details || null]
    )
    await client.query('DELETE FROM users WHERE id = $1', [userId])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

module.exports = { signup, login, getUserById, changePassword, updateProfile, deleteAccount }
