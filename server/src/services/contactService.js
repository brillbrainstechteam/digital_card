const crypto = require('crypto')
const { pool } = require('../config/database')
const AppError = require('../utils/AppError')

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function submitMessage({ name, email, subject, message, ip }) {
  const cleanName = String(name || '').trim().slice(0, 120)
  const cleanEmail = String(email || '').trim().toLowerCase().slice(0, 200)
  const cleanSubject = String(subject || '').trim().slice(0, 200)
  const cleanMessage = String(message || '').trim().slice(0, 5000)

  if (!cleanName) throw new AppError('Please enter your name', 400)
  if (!EMAIL_PATTERN.test(cleanEmail)) throw new AppError('Please enter a valid email address', 400)
  if (!cleanSubject) throw new AppError('Please choose a subject', 400)
  if (!cleanMessage || cleanMessage.length < 10) throw new AppError('Please write a message (at least 10 characters)', 400)

  const result = await pool.query(
    `INSERT INTO contact_messages (id, name, email, subject, message, ip)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, created_at`,
    [crypto.randomUUID(), cleanName, cleanEmail, cleanSubject, cleanMessage, ip || null]
  )
  return result.rows[0]
}

async function getAllMessages() {
  const result = await pool.query(
    'SELECT id, name, email, subject, message, status, created_at FROM contact_messages ORDER BY created_at DESC'
  )
  return result.rows
}

async function updateMessageStatus(id, status) {
  const allowed = ['new', 'read', 'replied']
  if (!allowed.includes(status)) throw new AppError('Invalid status', 400)
  const result = await pool.query(
    'UPDATE contact_messages SET status = $1 WHERE id = $2 RETURNING id, status',
    [status, id]
  )
  if (!result.rows[0]) throw new AppError('Message not found', 404)
  return result.rows[0]
}

module.exports = { submitMessage, getAllMessages, updateMessageStatus }
