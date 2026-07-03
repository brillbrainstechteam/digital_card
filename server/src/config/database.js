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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS card_events (
      id BIGSERIAL PRIMARY KEY,
      card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      meta JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query('CREATE INDEX IF NOT EXISTS card_events_card_id_idx ON card_events (card_id)')
  await pool.query('CREATE INDEX IF NOT EXISTS card_events_event_type_idx ON card_events (event_type)')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS card_leads (
      id BIGSERIAL PRIMARY KEY,
      card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      business_name TEXT,
      email TEXT,
      phone TEXT NOT NULL,
      company TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query('CREATE INDEX IF NOT EXISTS card_leads_card_id_idx ON card_leads (card_id)')
}

module.exports = { pool, testConnection, ensureSchema }
