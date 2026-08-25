const path = require('path')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
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
const uploadRoutes = require('./routes/uploadRoutes')
const publicCardService = require('./services/publicCardService')

const app = express()

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // 'unsafe-eval' removed: the production bundle contains no eval() or
      // new Function(), and leaving it on turned any injected string into
      // executable code. 'unsafe-inline' stays only because Razorpay's
      // checkout injects inline script; scriptSrcElem below is the narrower
      // policy modern browsers actually enforce for <script> elements.
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com", "https://cdn.razorpay.com", "https://*.razorpay.com"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com", "https://cdn.razorpay.com", "https://*.razorpay.com"],
      frameSrc: ["'self'", "https://api.razorpay.com", "https://*.razorpay.com"],
      // Missing api.cloudinary.com silently broke every logo/cover-photo
      // upload app-wide — the browser blocked the XHR before it ever left
      // the page, and the only signal was a generic "Upload failed" toast.
      connectSrc: ["'self'", "https://*.razorpay.com", "https://api.cloudinary.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    },
  },
}))
// Only the app's own origins may call the API from a browser. `cors()` with
// no options reflected every origin, letting any site script the API with a
// stolen/attached token.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',').map((o) => o.trim()).filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    // Non-browser callers (curl, Razorpay, server-to-server) send no Origin.
    if (!origin) return callback(null, true)
    if (env.nodeEnv !== 'production') return callback(null, true)
    if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    // Deny by simply omitting the CORS headers — the browser blocks the read.
    // Throwing here surfaced as a noisy 500 instead of a clean refusal.
    return callback(null, false)
  },
  credentials: true,
}))

// Webhook bodies must stay raw so their HMAC signature can be checked against
// the exact bytes that were signed. These mounts MUST come before
// express.json(), which would otherwise consume the stream — that is what
// made /api/payment/webhook hang forever and never answer.
app.use('/api/payment/webhook', express.raw({ type: '*/*', limit: '1mb' }))
app.use('/api/webhooks/subscription', express.raw({ type: '*/*', limit: '1mb' }))

app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true, limit: '2mb' }))

// ── Rate limiting ──
// Nothing was throttled before: login/signup were freely brute-forceable and
// the public tracking/lead endpoints could be flooded to poison analytics.
// Deliberately generous: the Analytics page polls 5 endpoints every 15s
// (~300 requests / 15 min for a single idle user), and whole offices share one
// NAT'd IP. This is a flood brake, not a usage quota — the strict limits below
// are what protect credentials and public writes.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
})

// Each credential endpoint gets its OWN counter — sharing one instance meant
// brute-forcing user login also locked out admin login (and vice versa).
const makeAuthLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
})

const publicWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many submissions. Please try again later.' },
})

// Behind nginx, so trust the proxy for correct client IPs in the limiter.
app.set('trust proxy', 1)
app.use('/api', apiLimiter)
app.use('/api/auth/login', makeAuthLimiter())
app.use('/api/auth/signup', makeAuthLimiter())
app.use('/api/auth/change-password', makeAuthLimiter())
app.use('/api/admin/login', makeAuthLimiter())
// Unauthenticated writes reachable from any public card page.
app.use('/api/public/cards/:slug/leads', publicWriteLimiter)
app.use('/api/public/cards/:slug/subscribe', publicWriteLimiter)

// View/click tracking is also an unauthenticated write. It was covered only by
// the very generous global limiter, so anyone could inflate a card's analytics
// (or a competitor's) more or less at will. Higher ceiling than leads because
// one genuine visitor legitimately fires several of these per page.
const trackingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
})
// Minting upload signatures is cheap for us but expensive downstream, so cap it.
const uploadSignLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many upload requests. Please try again later.' },
})
app.use('/api/upload/sign', uploadSignLimiter)

app.use('/api/public/cards/:slug/view', trackingLimiter)
app.use('/api/public/cards/:slug/click', trackingLimiter)

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
app.use('/api/upload', uploadRoutes)

const BOT_USER_AGENT = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterest|redditbot|Googlebot|bingbot/i
const RESERVED_SLUGS = new Set(['admin', 'login', 'signup', 'dashboard', 'create', 'qr-studio', 'analytics', 'activity', 'studio', 'settings', 'cart', 'checkout', 'preview', 'q', 'api'])

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

// Social/search crawlers don't execute JS, so the SPA's client-rendered
// <title>/meta tags never reach them — this serves a tiny server-rendered
// HTML shell with real Open Graph tags for just those user agents, while
// everyone else still gets the normal SPA shell below.
async function ogCardPreview(req, res, next) {
  try {
    if (req.method !== 'GET' || !BOT_USER_AGENT.test(req.get('user-agent') || '')) return next()
    const slug = req.path.replace(/^\//, '')
    if (!slug || slug.includes('/') || RESERVED_SLUGS.has(slug)) return next()

    const card = await publicCardService.getPublishedCardBySlug(slug).catch(() => null)
    if (!card) return next()

    const cd = card.card_data || {}
    const title = cd.brandName || card.title || 'Digital Card'
    const description = cd.tagline || cd.about || `${title}'s digital business card — contact info, socials, and more.`
    const image = cd.coverImage || cd.logo || card.logo_url || `${req.protocol}://${req.get('host')}/bb-logo.png`
    const url = `${req.protocol}://${req.get('host')}/${slug}`

    res.set('Content-Type', 'text/html')
    res.send(`<!doctype html><html><head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta property="og:type" content="profile">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
</head><body></body></html>`)
  } catch (err) {
    next()
  }
}

if (env.nodeEnv === 'production') {
  const clientDist = path.join(__dirname, '../../dist')
  app.get(/^(?!\/api).*/, ogCardPreview)
  app.use(express.static(clientDist))
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

app.use(notFound)
app.use(errorHandler)

module.exports = app
