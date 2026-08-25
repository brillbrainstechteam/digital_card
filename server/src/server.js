const app = require('./app')
const env = require('./config/env')
const { testConnection, ensureSchema } = require('./config/database')

async function start() {
  try {
    await testConnection()
    await ensureSchema()

    // Bind to loopback only. nginx is the sole intended entry point and
    // proxies to 127.0.0.1:7000; listening on 0.0.0.0 meant the plaintext API
    // was one firewall rule away from being reachable directly, skipping TLS,
    // HSTS and every header nginx adds. Overridable for containerised setups
    // where the process must accept traffic on the pod IP.
    const host = process.env.BIND_HOST || '127.0.0.1'
    app.listen(env.port, host, () => {
      console.log(`Server running in ${env.nodeEnv} mode on ${host}:${env.port}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err.message)
    process.exit(1)
  }
}

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err)
  process.exit(1)
})

start()
