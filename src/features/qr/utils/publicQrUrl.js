function trimTrailingSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function isLoopbackHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

export function getPublicAppOrigin() {
  const configuredOrigin = trimTrailingSlash(import.meta.env.VITE_PUBLIC_APP_URL)
  if (configuredOrigin) return configuredOrigin

  const currentUrl = new URL(window.location.href)
  const developmentNetworkHost = import.meta.env.VITE_DEV_NETWORK_HOST
  if (isLoopbackHost(currentUrl.hostname) && developmentNetworkHost) {
    currentUrl.hostname = developmentNetworkHost
  }

  return trimTrailingSlash(currentUrl.origin)
}

export function getDynamicQrUrl(slug) {
  return `${getPublicAppOrigin()}/q/${encodeURIComponent(slug)}`
}
