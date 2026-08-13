// Words that must never be assignable as a card's public slug — they'd
// collide with a real top-level frontend route or backend path.
const RESERVED_SLUGS = new Set([
  '', 'login', 'signup', 'dashboard', 'qr-studio', 'analytics', 'activity',
  'settings', 'cart', 'checkout', 'studio', 'create', 'business-cards',
  'business-card', 'card', 'preview', 'q', 'api', 'assets', 'favicon.ico',
  'robots.txt', 'sitemap.xml', 'admin',
])

const SLUG_FORMAT = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/

function isValidSlugFormat(slug) {
  return typeof slug === 'string' && SLUG_FORMAT.test(slug)
}

function isReservedSlug(slug) {
  return RESERVED_SLUGS.has(slug)
}

module.exports = { isValidSlugFormat, isReservedSlug }
