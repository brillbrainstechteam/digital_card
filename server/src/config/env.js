const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const env = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'digital_card',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@brillbrainsconsultants.com',
    password: process.env.ADMIN_PASSWORD || 'admin@123',
    secret: process.env.ADMIN_JWT_SECRET || 'admin-secret-change-in-prod',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },
}

module.exports = env
