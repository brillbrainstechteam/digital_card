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

// Refuse to boot in production with the placeholder secrets that live in this
// file. Previously a missing ADMIN_JWT_SECRET silently fell back to a value
// published in the source, so anyone could forge `{ role: 'admin' }` tokens
// and reach every admin endpoint.
if (env.nodeEnv === 'production') {
  const insecure = []
  if (env.jwt.secret === 'change-this-secret-in-production') insecure.push('JWT_SECRET')
  if (env.admin.secret === 'admin-secret-change-in-prod') insecure.push('ADMIN_JWT_SECRET')
  if (env.admin.password === 'admin@123') insecure.push('ADMIN_PASSWORD')

  if (insecure.length > 0) {
    console.error(
      `FATAL: refusing to start in production with default secrets for: ${insecure.join(', ')}.\n` +
      'Set these in server/.env to strong random values.'
    )
    process.exit(1)
  }
}

module.exports = env
