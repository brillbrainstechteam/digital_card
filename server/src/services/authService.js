const bcrypt = require('bcryptjs')
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

module.exports = { signup, login, getUserById }
