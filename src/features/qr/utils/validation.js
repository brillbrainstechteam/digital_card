// Non-blocking QR "scannability" checks. Kept dependency-free (no React, no
// qr-code-styling) so it can run anywhere the QR module is consumed.

import { isStaticQr, qrPayloadUsage, resolveErrorCorrectionLevel } from './capacity'

function hexToRgb(hex) {
  const normalized = (hex || '').replace('#', '')
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized
  const value = Number.parseInt(full, 16)
  if (Number.isNaN(value) || full.length !== 6) return { r: 0, g: 0, b: 0 }
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

function luminance({ r, g, b }) {
  const channels = [r, g, b].map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

export function contrastRatio(fgHex, bgHex) {
  const fg = luminance(hexToRgb(fgHex))
  const bg = luminance(hexToRgb(bgHex))
  const light = Math.max(fg, bg)
  const dark = Math.min(fg, bg)
  return (light + 0.05) / (dark + 0.05)
}

const MIN_SAFE_CONTRAST = 2.2
const MAX_SAFE_LOGO_RATIO = 0.3

/**
 * @param {object} settings - QR settings (see qrEngine.js for shape)
 * @returns {Array<{ code: string, message: string }>} warnings — never throws,
 *   never blocks; callers decide how/whether to surface these.
 */
export function validateQrSettings(settings) {
  const warnings = []
  if (!settings) return warnings

  if (!settings.transparentBackground && !settings.gradient) {
    const ratio = contrastRatio(settings.foreground, settings.background)
    if (ratio < MIN_SAFE_CONTRAST) {
      warnings.push({
        code: 'low-contrast',
        message: 'Foreground and background colors are too close in contrast — this QR code may be hard to scan.',
      })
    }
  }

  if (settings.logo && (settings.logoSizeRatio ?? 0) > MAX_SAFE_LOGO_RATIO) {
    warnings.push({
      code: 'logo-too-large',
      message: 'The logo is large relative to the code — reduce its size or increase error correction to keep it scannable.',
    })
  }

  // Compare against the RESOLVED level: static QRs pick their level from the
  // payload, so a raw `errorCorrectionLevel` of 'auto'/undefined is not a fault.
  if (settings.logo && resolveErrorCorrectionLevel(settings) !== 'H') {
    warnings.push({
      code: 'logo-needs-high-ecc',
      message: 'Using a logo without "High" error correction can make the code unreliable to scan.',
    })
  }

  // Only static QRs carry the full payload; a dynamic one is always a short link.
  if (isStaticQr(settings) && settings.data) {
    const usage = qrPayloadUsage(settings, settings.data)
    if (usage.overCapacity) {
      warnings.push({
        code: 'payload-over-capacity',
        message: `This content is ${usage.bytes} bytes — past the ~${usage.capacity} byte limit for a reliable static QR. Shorten it, remove the logo, or switch to a dynamic QR.`,
      })
    } else if (usage.nearCapacity) {
      warnings.push({
        code: 'payload-near-capacity',
        message: `This QR is ${Math.round(usage.ratio * 100)}% full. It will still scan, but printing it small may cause failures — a dynamic QR stays compact whatever the content.`,
      })
    }
  }

  return warnings
}
