const { pool } = require('../config/database')

async function healthCheck(req, res, next) {
  try {
    const dbResult = await pool.query('SELECT NOW()')
    res.json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: true,
        serverTime: dbResult.rows[0].now,
      },
    })
  } catch (err) {
    res.status(503).json({
      success: false,
      message: 'Server is unhealthy',
      database: { connected: false, error: err.message },
    })
  }
}

module.exports = { healthCheck }
