import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { networkInterfaces } from 'node:os'

function getDevelopmentNetworkHost() {
  const addresses = Object.values(networkInterfaces()).flat().filter(Boolean)
  const ipv4 = addresses.filter((address) => address.family === 'IPv4' && !address.internal)
  return ipv4.find((address) => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address.address))?.address
    || ipv4[0]?.address
    || ''
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    host: true,
  },
  define: {
    'import.meta.env.VITE_DEV_NETWORK_HOST': JSON.stringify(command === 'serve' ? getDevelopmentNetworkHost() : ''),
  },
}))
