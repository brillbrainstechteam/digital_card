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

app.use(notFound)
app.use(errorHandler)

module.exports = app
