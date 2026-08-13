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

async function login({ email, password }) {
  const result = await pool.query(
    'SELECT id, name, business_name, email, phone, password_hash, is_verified, created_at FROM users WHERE email = $1',
    [email]
  )

  if (result.rows.length === 0) {
    throw new AppError('Invalid email or password', 401)
  }

  const user = result.rows[0]
  const isMatch = await bcrypt.compare(password, user.password_hash)

  if (!isMatch) {
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
  await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [password_hash, userId])
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

async function deleteAccount(userId, { reason, details }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `CREATE TABLE IF NOT EXISTS account_deletion_feedback (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        email TEXT,
        reason TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    )
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
