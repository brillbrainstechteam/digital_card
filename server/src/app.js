const path = require('path')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const env = require('./config/env')
const { notFound, errorHandler } = require('./middleware/errorHandler')
const healthRoutes = require('./routes/healthRoutes')
const authRoutes = require('./routes/authRoutes')
const cardRoutes = require('./routes/cardRoutes')
const publicCardRoutes = require('./routes/publicCardRoutes')
const analyticsRoutes = require('./routes/analyticsRoutes')
const webhookRoutes = require('./routes/webhookRoutes')
const qrRoutes = require('./routes/qrRoutes')
const qrPublicRoutes = require('./routes/qrPublicRoutes')
const adminRoutes = require('./routes/adminRoutes')
const paymentRoutes = require('./routes/paymentRoutes')

const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

if (env.nodeEnv === 'development') {
  app.use(morgan('dev'))
}

app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/cards', cardRoutes)
app.use('/api/public/cards', publicCardRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/qr', qrRoutes)
app.use('/api/public/qr', qrPublicRoutes)
app.use('/api/webhooks', webhookRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/payment', paymentRoutes)

if (env.nodeEnv === 'production') {
  const clientDist = path.join(__dirname, '../../dist')
  app.use(express.static(clientDist))
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

app.use(notFound)
app.use(errorHandler)

module.exports = app
