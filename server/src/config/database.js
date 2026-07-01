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

module.exports = { pool, testConnection }
