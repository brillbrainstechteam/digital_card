import { useSyncExternalStore } from 'react'

// Single choke point for "is this QR allowed to encode its real
// destination". Every surface that renders, saves, or downloads a QR code
// must go through here — never hardcode a payment or dev-mode bypass
// anywhere else. When the real payment gateway ships, that integration
// only ever needs to change the `purchased` condition below (and can
// delete the dev-mode branch entirely) — no other file should need to
// change.
//
// Temporary developer testing mode: lets QR codes be generated and
// downloaded with their real destination before the payment system exists,
// so end-to-end QR functionality can be tested. Defaults from the
// VITE_ENABLE_QR_DEV_MODE env var, but can be flipped off (or back on) at
// runtime from the Developer Mode badge without editing .env or
// restarting — see useQrDevMode() below. `import.meta.env.PROD` is checked
// first so a production build can never ship with the bypass live,
// regardless of what the env var or a stale runtime override says.
export const PREVIEW_QR_URL = 'https://example.com'

const OVERRIDE_KEY = 'bb_qr_dev_mode_override'
const listeners = new Set()

function readOverride() {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY)
    if (raw === 'on') return true
    if (raw === 'off') return false
    return null
  } catch {
    return null
  }
}

export function isQrDevModeEnabled() {
  if (import.meta.env.PROD) return false
  const override = readOverride()
  if (override !== null) return override
  return import.meta.env.VITE_ENABLE_QR_DEV_MODE !== 'false'
}

// Lets the Developer Mode badge's toggle flip the bypass on/off for the
// rest of the session (persisted in localStorage) without needing to edit
// .env or restart the dev server. No-op in a production build.
export function setQrDevModeOverride(enabled) {
  if (import.meta.env.PROD) return
  try {
    localStorage.setItem(OVERRIDE_KEY, enabled ? 'on' : 'off')
  } catch {
    // Storage can fail (quota, private browsing) — the toggle just won't
    // persist across reloads, which isn't worth surfacing to the user.
  }
  listeners.forEach((notify) => notify())
}

export function subscribeQrDevMode(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

// Reactive read of dev-mode status — any component (or hook) that renders
// differently based on the bypass should use this instead of calling
// isQrDevModeEnabled() directly, so it re-renders the instant the badge's
// toggle flips it, with no page reload needed.
export function useQrDevModeEnabled() {
  return useSyncExternalStore(subscribeQrDevMode, isQrDevModeEnabled, () => false)
}

// `purchased` will come from real order/entitlement data once the QR
// add-on payment flow exists. Until then it's always false, so — outside
// of dev mode — a QR never encodes its real destination.
export function isQrUnlocked({ purchased = false } = {}) {
  return isQrDevModeEnabled() || Boolean(purchased)
}

// Reactive version for components that branch their UI (not just the
// rendered QR image) on lock status — e.g. showing the lock notice vs a
// normal caption, or disabling a download button. Using this instead of
// isQrUnlocked() directly means that UI updates instantly when the badge's
// toggle flips, with no extra state plumbing per component.
export function useIsQrUnlocked({ purchased = false } = {}) {
  const devModeEnabled = useQrDevModeEnabled()
  return devModeEnabled || Boolean(purchased)
}
