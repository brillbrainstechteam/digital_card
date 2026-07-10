const { Pool } = require('pg')
const env = require('./env')

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message)
})

async function testConnection() {
  const client = await pool.connect()
  try {
    const result = await client.query('SELECT NOW() AS server_time')
    console.log(`PostgreSQL connected — server time: ${result.rows[0].server_time}`)
  } finally {
    client.release()
  }
}

async function ensureSchema() {
  // card_views
  await pool.query(`
    CREATE TABLE IF NOT EXISTS card_views (
      id BIGSERIAL PRIMARY KEY,
      card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query('ALTER TABLE card_views ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()')
  await pool.query('CREATE INDEX IF NOT EXISTS card_views_card_id_idx ON card_views (card_id)')
  await pool.query('CREATE INDEX IF NOT EXISTS card_views_created_at_idx ON card_views (created_at)')

  // button_clicks
  await pool.query(`
    CREATE TABLE IF NOT EXISTS button_clicks (
      id BIGSERIAL PRIMARY KEY,
      card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      button_type TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query('ALTER TABLE button_clicks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()')
  await pool.query('CREATE INDEX IF NOT EXISTS button_clicks_card_id_idx ON button_clicks (card_id)')
  await pool.query('CREATE INDEX IF NOT EXISTS button_clicks_button_type_idx ON button_clicks (button_type)')

  // leads
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id BIGSERIAL PRIMARY KEY,
      card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      visitor_name TEXT NOT NULL,
      business_name TEXT,
      email TEXT,
      phone TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS visitor_name TEXT')
  await pool.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS business_name TEXT')
  await pool.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS email TEXT')
  await pool.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT')
  await pool.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()')
  await pool.query('CREATE INDEX IF NOT EXISTS leads_card_id_idx ON leads (card_id)')

  // card_events — may already exist from a prior session with column named "meta"
  await pool.query(`
    CREATE TABLE IF NOT EXISTS card_events (
      id BIGSERIAL PRIMARY KEY,
      card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  // Add missing columns to pre-existing card_events tables
  await pool.query("ALTER TABLE card_events ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'")
  await pool.query('ALTER TABLE card_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()')
  await pool.query('CREATE INDEX IF NOT EXISTS card_events_card_id_idx ON card_events (card_id)')
  await pool.query('CREATE INDEX IF NOT EXISTS card_events_created_at_idx ON card_events (created_at)')

  // subscribers
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id BIGSERIAL PRIMARY KEY,
      card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(card_id, email)
    )
  `)
  await pool.query('ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()')
  await pool.query('CREATE INDEX IF NOT EXISTS subscribers_card_id_idx ON subscribers (card_id)')

  // qr_codes — one optional QR per card (enforced by the unique partial index
  // below), owned by the user who created it. `settings` stores the full
  // reusable QR settings object (features/qr's single source of truth) as-is.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS qr_codes (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
      slug TEXT NOT NULL UNIQUE,
      settings JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query('ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()')
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS qr_codes_card_id_unique ON qr_codes (card_id) WHERE card_id IS NOT NULL')
  await pool.query('CREATE INDEX IF NOT EXISTS qr_codes_user_id_idx ON qr_codes (user_id)')

  // qr_scans — one row per QR scan, used for both per-QR and per-card analytics.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS qr_scans (
      id BIGSERIAL PRIMARY KEY,
      qr_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
      visitor_hash TEXT,
      device_type TEXT,
      browser TEXT,
      os TEXT,
      country TEXT,
      city TEXT,
      referrer TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query('CREATE INDEX IF NOT EXISTS qr_scans_qr_id_idx ON qr_scans (qr_id)')
  await pool.query('CREATE INDEX IF NOT EXISTS qr_scans_created_at_idx ON qr_scans (created_at)')
}

module.exports = { pool, testConnection, ensureSchema }
